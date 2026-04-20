/**
 * One-time idempotent merge of celestial_original/Celestial Heritage_ Character Dossier.md
 * into per-character wiki files. Inserts `## Dossier` before `## Appearances` (or
 * `## Lore metadata` / `## Note` as fallback anchors). Creates stub wiki files for
 * dossier entries that have no matching slug.
 *
 *   npx tsx scripts/merge-character-dossier.ts
 */

import * as fs from "fs";
import * as path from "path";

export interface DossierSourceEntry {
  displayName: string;
  role?: string;
  profile?: string;
  arc?: string;
}

export interface MergeSummary {
  merged: number;
  skipped: number;
  created: number;
  errors: string[];
}

const LABELS: ReadonlyArray<{ key: "role" | "profile" | "arc"; re: RegExp }> = [
  { key: "role", re: /^role\s*:\s*(.*)$/i },
  { key: "profile", re: /^profile\s*:\s*(.*)$/i },
  { key: "arc", re: /^character arc\s*:\s*(.*)$/i },
];

const ANCHOR_ORDER = ["## Appearances", "## Lore metadata", "## Note"];

const HONORIFICS = new Set([
  "dr",
  "dr.",
  "mr",
  "mr.",
  "mrs",
  "mrs.",
  "ms",
  "ms.",
  "major",
  "captain",
  "colonel",
  "lt",
  "lt.",
  "lieutenant",
  "sgt",
  "sgt.",
  "professor",
  "prof",
  "prof.",
]);

export function parseDossierSource(source: string): DossierSourceEntry[] {
  const lines = source.split("\n");
  const entries: DossierSourceEntry[] = [];
  let current: DossierSourceEntry | null = null;
  let currentField: "role" | "profile" | "arc" | null = null;

  const flushField = () => {
    if (!current || !currentField) return;
    const v = current[currentField];
    if (typeof v === "string") {
      current[currentField] = v.trim();
    }
    currentField = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/g, "");

    const headingMatch = line.match(/^#\s+\*\*(.+?)\*\*\s*$/);
    if (headingMatch) {
      flushField();
      if (current) entries.push(current);
      current = { displayName: headingMatch[1].trim() };
      continue;
    }

    if (!current) continue;

    let matchedLabel = false;
    for (const { key, re } of LABELS) {
      const m = line.match(re);
      if (m) {
        flushField();
        current[key] = m[1];
        currentField = key;
        matchedLabel = true;
        break;
      }
    }
    if (matchedLabel) continue;

    if (currentField) {
      const prev = current[currentField] ?? "";
      current[currentField] = prev + (prev ? "\n" : "") + line;
    }
  }

  flushField();
  if (current) entries.push(current);

  return entries;
}

export function normalizeName(display: string): string {
  const stripped = display.replace(/'[^']+'|"[^"]+"/g, " ");
  const tokens = stripped
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const kept = tokens.filter((t) => !HONORIFICS.has(t.toLowerCase()));
  return kept.join(" ").toLowerCase().replace(/\s+/g, " ").trim();
}

function slugFromDisplayName(display: string): string {
  const normalized = normalizeName(display);
  return normalized.replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function readAliases(content: string): string[] {
  const m = content.match(/\*\*Aliases:\*\*\s*(.+)/i);
  if (!m) return [];
  return m[1]
    .split(/[,;]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function readNameHeading(content: string): string {
  const m = content.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : "";
}

function buildResolver(wikiDir: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!fs.existsSync(wikiDir)) return map;
  for (const f of fs.readdirSync(wikiDir).filter((x) => x.endsWith(".md"))) {
    const slug = f.replace(/\.md$/, "");
    const content = fs.readFileSync(path.join(wikiDir, f), "utf-8");
    map.set(slug, slug);
    const heading = readNameHeading(content);
    if (heading) map.set(normalizeName(heading), slug);
    for (const a of readAliases(content)) {
      map.set(a.toLowerCase(), slug);
    }
  }
  return map;
}

function buildDossierBlock(entry: DossierSourceEntry): string {
  const parts: string[] = ["## Dossier", ""];
  if (entry.role) {
    parts.push("### Role", entry.role, "");
  }
  if (entry.profile) {
    parts.push("### Profile", entry.profile, "");
  }
  if (entry.arc) {
    parts.push("### Character Arc", entry.arc, "");
  }
  return parts.join("\n").trimEnd() + "\n";
}

function insertDossier(
  content: string,
  block: string
): { content: string; ok: boolean } {
  for (const anchor of ANCHOR_ORDER) {
    const idx = content.indexOf(anchor);
    if (idx === -1) continue;
    const before = content.slice(0, idx).trimEnd();
    const after = content.slice(idx);
    const merged = `${before}\n\n${block}\n${after}`;
    return { content: merged, ok: true };
  }
  return { content, ok: false };
}

function stubForNewEntity(entry: DossierSourceEntry, slug: string): string {
  return [
    `# ${entry.displayName}`,
    `**Slug:** ${slug}`,
    `Inventory entry (tiers: —)`,
    `reviewed: false`,
    ``,
    buildDossierBlock(entry),
    `## Appearances`,
    `_(auto-generated; review and expand.)_`,
    ``,
    `## Additional appearances`,
    `_(auto-generated; review and expand.)_`,
    ``,
    `## Lore metadata`,
    ``,
    `**Content type:** character`,
    `**Source type:** foundational_dossier`,
    `**Canon status:** adjacent`,
    `**Visibility policy:** always_visible`,
    `**Source document:** Celestial Heritage — Character Dossier`,
    `**Source path:** celestial_original/Celestial Heritage_ Character Dossier.docx`,
    `**Extractor version:** merge-character-dossier/1`,
    ``,
    `## Note`,
    `Auto-generated by scripts/merge-character-dossier.ts. Remove the generated marker to take manual ownership.`,
    ``,
  ].join("\n");
}

export function mergeIntoWikiDir(
  source: string,
  wikiDir: string
): MergeSummary {
  const summary: MergeSummary = {
    merged: 0,
    skipped: 0,
    created: 0,
    errors: [],
  };
  const entries = parseDossierSource(source);
  const resolver = buildResolver(wikiDir);

  for (const entry of entries) {
    const normalized = normalizeName(entry.displayName);
    const matchedSlug = resolver.get(normalized);
    const block = buildDossierBlock(entry);

    if (matchedSlug) {
      const filePath = path.join(wikiDir, `${matchedSlug}.md`);
      const content = fs.readFileSync(filePath, "utf-8");
      if (content.includes("## Dossier")) {
        summary.skipped++;
        console.log(`⏭  ${matchedSlug} (dossier already present)`);
        continue;
      }
      const { content: next, ok } = insertDossier(content, block);
      if (!ok) {
        summary.errors.push(
          `${matchedSlug}: no anchor (## Appearances / ## Lore metadata / ## Note) found`
        );
        continue;
      }
      fs.writeFileSync(filePath, next);
      summary.merged++;
      console.log(`✓ ${matchedSlug}`);
      continue;
    }

    const slug = slugFromDisplayName(entry.displayName);
    if (!slug) {
      summary.errors.push(
        `could not derive slug for display name "${entry.displayName}"`
      );
      continue;
    }
    const filePath = path.join(wikiDir, `${slug}.md`);
    if (fs.existsSync(filePath)) {
      summary.errors.push(
        `slug collision creating stub for "${entry.displayName}" at ${slug}.md (existing file did not match by alias or heading); add an alias to the existing file or rename`
      );
      continue;
    }
    fs.writeFileSync(filePath, stubForNewEntity(entry, slug));
    summary.created++;
    console.log(`🆕 created ${path.relative(process.cwd(), filePath)}`);
  }

  return summary;
}

function main() {
  const SOURCE = path.join(
    process.cwd(),
    "celestial_original/Celestial Heritage_ Character Dossier.md"
  );
  const WIKI_DIR = path.join(process.cwd(), "content/wiki/characters");

  if (!fs.existsSync(SOURCE)) {
    console.error(`Missing source file: ${SOURCE}`);
    process.exit(1);
  }
  const source = fs.readFileSync(SOURCE, "utf-8");
  const summary = mergeIntoWikiDir(source, WIKI_DIR);

  console.log("");
  console.log("Character dossier merge");
  console.log(`  ✓ merged into existing: ${summary.merged}`);
  console.log(`  ⏭  skipped (dossier present): ${summary.skipped}`);
  console.log(`  🆕 created new wiki file:  ${summary.created}`);
  console.log(`  ⚠  errors:                ${summary.errors.length}`);

  if (summary.errors.length > 0) {
    for (const e of summary.errors) console.error(`  ERROR: ${e}`);
    process.exit(1);
  }
}

const invokedDirectly =
  process.argv[1]?.endsWith("merge-character-dossier.ts") ?? false;
if (invokedDirectly && process.env.NODE_TEST_CONTEXT === undefined) {
  main();
}
