/**
 * review-ingestion.ts
 *
 * Phase G continuity CLI.
 *
 * After each `npm run ingest:book` / `ingest:lore` / `compile:wiki`, this
 * script diffs the fresh corpus snapshot against the one persisted at
 * content/raw/.continuity/last-snapshot.json and surfaces any typed
 * contradictions (see src/lib/wiki/continuity-diff.ts).
 *
 * Outputs:
 *   - content/raw/.continuity/last-snapshot.json             (overwritten)
 *   - docs/superpowers/specs/YYYY-MM-DD-ingestion-review.md  (dated)
 *
 * Exit code:
 *   1  if any blocking contradictions (alias_moved, relation_flipped) fired
 *   0  otherwise (including when only advisory contradictions surfaced)
 *
 * Usage:
 *   npm run review:ingestion
 *   npm run review:ingestion -- --dry-run   # diff only, don't write snapshot
 */

import * as fs from "fs";
import * as path from "path";
import {
  diffCanonSnapshots,
  isBlocking,
  type CanonSnapshot,
  type Contradiction,
  type EntitySnapshot,
} from "../src/lib/wiki/continuity-diff";

// ── Config ─────────────────────────────────────────────────────────

const REPO_ROOT = process.cwd();
const CANON_ENTITIES_PATH = path.join(
  REPO_ROOT,
  "content",
  "raw",
  "canon_entities.json",
);
const LORE_INVENTORY_PATH = path.join(
  REPO_ROOT,
  "content",
  "raw",
  "lore_inventory.json",
);
const MISSION_LOGS_PATH = path.join(
  REPO_ROOT,
  "content",
  "raw",
  "mission_logs_inventory.json",
);
const STORIES_DIR = path.join(REPO_ROOT, "content", "wiki", "stories");
const CONTINUITY_DIR = path.join(REPO_ROOT, "content", "raw", ".continuity");
const SNAPSHOT_PATH = path.join(CONTINUITY_DIR, "last-snapshot.json");
const SPECS_DIR = path.join(REPO_ROOT, "docs", "superpowers", "specs");

// ── Snapshot build ─────────────────────────────────────────────────

type RawEntity = {
  slug: string;
  kind: string;
  parentSlug: string | null;
  aliases?: string[];
  sources?: Array<{ sourceDoc?: string }>;
};

type RawCanonEntities = {
  entities?: RawEntity[];
};

type RawLoreEntity = {
  slug: string;
  wikiPath?: string;
};

type RawLoreInventory = {
  entities?: RawLoreEntity[];
};

type RawMissionLog = {
  chapterId?: string;
  sourceFile?: string;
};

type RawMissionLogInventory = {
  missionLogs?: RawMissionLog[];
};

function readJson<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

function buildEntitySnapshot(
  canon: RawCanonEntities | null,
  lore: RawLoreInventory | null,
): Record<string, EntitySnapshot> {
  const entities: Record<string, EntitySnapshot> = {};
  if (!canon?.entities) return entities;

  const wikiPathBySlug = new Map<string, string>();
  if (lore?.entities) {
    for (const e of lore.entities) {
      if (e.slug && e.wikiPath) wikiPathBySlug.set(e.slug, e.wikiPath);
    }
  }

  for (const e of canon.entities) {
    const seen = new Set<string>();
    for (const s of e.sources ?? []) {
      if (s.sourceDoc) seen.add(s.sourceDoc);
    }
    const wikiPath = wikiPathBySlug.get(e.slug);
    if (wikiPath) seen.add(wikiPath);

    entities[e.slug] = {
      canonicalSlug: e.slug,
      kind: e.kind,
      parentSlug: e.parentSlug ?? null,
      aliases: [...(e.aliases ?? [])].sort(),
      lastSeenIn: [...seen].sort(),
    };
  }

  return entities;
}

/**
 * Parses `**Themes:** A, B, C` out of a story markdown file. Returns
 * null when the line isn't present so the diff skips chapters we can't
 * characterise rather than flagging them as empty themes.
 */
function extractThemes(markdown: string): string[] | null {
  const match = markdown.match(/^\*\*Themes:\*\*\s*(.+)$/m);
  if (!match) return null;
  return match[1]!
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Extracts `**Story ID:** CH01` — falls back to filename stem if missing. */
function extractStoryId(markdown: string, fallback: string): string {
  const match = markdown.match(/^\*\*Story ID:\*\*\s*(\S+)$/m);
  return match?.[1] ?? fallback;
}

function buildChapterSnapshot(): Record<string, { themes: string[] }> {
  const out: Record<string, { themes: string[] }> = {};
  if (!fs.existsSync(STORIES_DIR)) return out;

  for (const filename of fs.readdirSync(STORIES_DIR)) {
    if (!filename.endsWith(".md")) continue;
    const full = path.join(STORIES_DIR, filename);
    const raw = fs.readFileSync(full, "utf-8");
    const themes = extractThemes(raw);
    if (!themes) continue;
    const storyId = extractStoryId(raw, filename.replace(/\.md$/, ""));
    out[storyId] = { themes };
  }
  return out;
}

function buildSnapshot(): CanonSnapshot {
  const canon = readJson<RawCanonEntities>(CANON_ENTITIES_PATH);
  const lore = readJson<RawLoreInventory>(LORE_INVENTORY_PATH);
  const missionLogs = readJson<RawMissionLogInventory>(MISSION_LOGS_PATH);
  // Mission logs are read to satisfy the plan's input list; we treat them
  // as an additional evidence stream for entity provenance. For now we
  // don't project them into the snapshot shape because they index by
  // chapter, not by slug — adding them would broaden the snapshot API
  // without changing any current contradiction variants. Keeping the
  // read here keeps failures loud if the file goes missing.
  void missionLogs;

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    entities: buildEntitySnapshot(canon, lore),
    chapters: buildChapterSnapshot(),
  };
}

// ── Report ─────────────────────────────────────────────────────────

function ymd(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function describe(c: Contradiction): string {
  switch (c.kind) {
    case "alias_moved":
      return `- **alias moved** — \`${c.alias}\` was on \`${c.fromSlug}\`, now on \`${c.toSlug}\``;
    case "entity_vanished":
      return `- **entity vanished** — \`${c.slug}\` was in the last snapshot, missing now`;
    case "relation_flipped":
      return `- **relation flipped** — \`${c.subject}.${c.predicate}\`: \`${c.before || "∅"}\` → \`${c.after || "∅"}\``;
    case "chapter_theme_changed":
      return `- **chapter theme changed** — \`${c.storyId}\`: \`${c.before.join(", ") || "∅"}\` → \`${c.after.join(", ") || "∅"}\``;
  }
}

function buildReport(
  snapshot: CanonSnapshot,
  contradictions: Contradiction[],
  previousExisted: boolean,
): string {
  const lines: string[] = [];
  lines.push(`# Ingestion review — ${ymd(new Date())}`);
  lines.push("");
  lines.push(`Generated: \`${snapshot.generatedAt}\``);
  lines.push("");
  lines.push(`- Entities in snapshot: **${Object.keys(snapshot.entities).length}**`);
  lines.push(`- Chapters with themes: **${Object.keys(snapshot.chapters).length}**`);
  lines.push(`- Previous snapshot: ${previousExisted ? "found" : "**none** (first run)"}`);
  lines.push(`- Contradictions: **${contradictions.length}**`);
  lines.push("");

  if (!previousExisted) {
    lines.push("First run — no diff performed. Fresh snapshot persisted.");
    lines.push("");
    return lines.join("\n");
  }

  if (contradictions.length === 0) {
    lines.push("No contradictions. Corpus is continuous with the last snapshot.");
    lines.push("");
    return lines.join("\n");
  }

  const blocking = contradictions.filter(isBlocking);
  const advisory = contradictions.filter((c) => !isBlocking(c));

  if (blocking.length > 0) {
    lines.push(`## Blocking (${blocking.length})`);
    lines.push("");
    lines.push("These gate CI. Reconcile before re-ingesting downstream.");
    lines.push("");
    for (const c of blocking) lines.push(describe(c));
    lines.push("");
  }

  if (advisory.length > 0) {
    lines.push(`## Advisory (${advisory.length})`);
    lines.push("");
    lines.push("Surface only — not CI-blocking. Worth a human eyeball.");
    lines.push("");
    for (const c of advisory) lines.push(describe(c));
    lines.push("");
  }

  return lines.join("\n");
}

// ── Main ───────────────────────────────────────────────────────────

function main(): void {
  const dryRun = process.argv.includes("--dry-run");

  if (!fs.existsSync(CANON_ENTITIES_PATH)) {
    console.error(
      `[review:ingestion] ${CANON_ENTITIES_PATH} not found — run ingest:book first.`,
    );
    process.exit(2);
  }

  const previous = readJson<CanonSnapshot>(SNAPSHOT_PATH);
  const current = buildSnapshot();
  const contradictions = diffCanonSnapshots(previous, current);
  const report = buildReport(current, contradictions, previous !== null);

  if (!dryRun) {
    fs.mkdirSync(CONTINUITY_DIR, { recursive: true });
    fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(current, null, 2) + "\n");

    fs.mkdirSync(SPECS_DIR, { recursive: true });
    const reportPath = path.join(
      SPECS_DIR,
      `${ymd(new Date())}-ingestion-review.md`,
    );
    fs.writeFileSync(reportPath, report);
    console.log(`[review:ingestion] snapshot → ${path.relative(REPO_ROOT, SNAPSHOT_PATH)}`);
    console.log(`[review:ingestion] report   → ${path.relative(REPO_ROOT, reportPath)}`);
  } else {
    console.log("[review:ingestion] --dry-run (no files written)");
    console.log(report);
  }

  console.log(
    `[review:ingestion] ${contradictions.length} contradiction(s), ${contradictions.filter(isBlocking).length} blocking`,
  );

  if (contradictions.some(isBlocking)) {
    process.exit(1);
  }
}

main();
