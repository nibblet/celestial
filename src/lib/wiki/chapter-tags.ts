/**
 * Canonical chapter-to-wiki tag loader.
 *
 * Backed by `content/raw/chapter_tags.json`, produced by
 * `scripts/tag-chapter-entities.ts`. Every slug in this file has already been
 * validated against the wiki's controlled vocabulary by the tagger, so
 * consumers (Ask prompts, verifier, UI) can trust them without re-checking
 * against the filesystem.
 *
 * This is read-only at runtime. If the file is missing or malformed, helpers
 * return safe empties so Ask never crashes over missing metadata.
 */

import fs from "node:fs";
import path from "node:path";

export type ChapterTagKind =
  | "rules"
  | "characters"
  | "artifacts"
  | "vaults"
  | "locations"
  | "factions";

export type CharacterPresence = "lead" | "supporting" | "mentioned";

export interface ChapterTagRef {
  slug: string;
  justification: string;
}

export interface ChapterCharacterTag extends ChapterTagRef {
  presence: CharacterPresence;
}

export interface ChapterTagRecord {
  chapterId: string;
  title: string;
  sourceHash: string;
  generated: string;
  model: string;
  reviewed: boolean;
  summary: string;
  themes: string[];
  continuityFlags: string[];
  rules: ChapterTagRef[];
  characters: ChapterCharacterTag[];
  artifacts: ChapterTagRef[];
  vaults: ChapterTagRef[];
  locations: ChapterTagRef[];
  factions: ChapterTagRef[];
}

export interface ChapterTagFile {
  version: 1;
  generatedAt: string;
  model: string;
  vocabHash: string;
  chapters: Record<string, ChapterTagRecord>;
}

/** URL segment (plural) each entity kind routes to. Keep in sync with Next.js routing. */
const KIND_ROUTES: Record<ChapterTagKind, string> = {
  rules: "rules",
  characters: "characters",
  artifacts: "artifacts",
  vaults: "vaults",
  locations: "locations",
  factions: "factions",
};

const TAGS_PATH = path.join(process.cwd(), "content/raw/chapter_tags.json");

let cached: ChapterTagFile | null | undefined = undefined;

function loadFile(): ChapterTagFile | null {
  if (cached !== undefined) return cached;
  try {
    if (!fs.existsSync(TAGS_PATH)) {
      cached = null;
      return null;
    }
    const parsed = JSON.parse(
      fs.readFileSync(TAGS_PATH, "utf-8"),
    ) as ChapterTagFile;
    if (parsed.version !== 1 || typeof parsed.chapters !== "object") {
      cached = null;
      return null;
    }
    cached = parsed;
    return parsed;
  } catch {
    cached = null;
    return null;
  }
}

/** Test-only hook. Forces the next lookup to re-read from disk. */
export function __resetChapterTagsCacheForTests(): void {
  cached = undefined;
}

/** Normalise either `CH07` or `CH07-harmonic-breach` (any case) to `CH07`. */
function normalizeChapterId(input: string | null | undefined): string | null {
  if (!input) return null;
  const m = input.toUpperCase().match(/CH\d{2,4}/);
  return m ? m[0] : null;
}

export function getChapterTags(
  chapterOrSlug: string | null | undefined,
): ChapterTagRecord | null {
  const chapterId = normalizeChapterId(chapterOrSlug);
  if (!chapterId) return null;
  const file = loadFile();
  return file?.chapters[chapterId] ?? null;
}

export function getAllChapterTags(): ChapterTagRecord[] {
  const file = loadFile();
  if (!file) return [];
  return Object.values(file.chapters).sort((a, b) =>
    a.chapterId.localeCompare(b.chapterId),
  );
}

/**
 * Flat set of every wiki slug tagged as relevant to `chapterOrSlug`, keyed
 * by `"${kind}:${slug}"`. Verifier uses this to decide whether an in-answer
 * wiki link is one the chapter itself endorses.
 */
export function getChapterTagSlugSet(
  chapterOrSlug: string | null | undefined,
): Set<string> {
  const record = getChapterTags(chapterOrSlug);
  const out = new Set<string>();
  if (!record) return out;
  const kinds: ChapterTagKind[] = [
    "rules",
    "characters",
    "artifacts",
    "vaults",
    "locations",
    "factions",
  ];
  for (const kind of kinds) {
    for (const entry of record[kind]) {
      out.add(`${kind}:${entry.slug}`);
    }
  }
  return out;
}

/** Route prefix (`characters`, `rules`, …) for a given tag kind. */
export function routeForKind(kind: ChapterTagKind): string {
  return KIND_ROUTES[kind];
}

/**
 * Compact prompt block scoped to the chapter the reader is currently viewing.
 * Gives Ask the chapter's summary, themes, and the curated list of rules +
 * entities the chapter actually invokes, so the model prefers grounded
 * citations over guesses. Returns "" if no tags exist for the chapter.
 */
export function getChapterTagsPromptBlock(
  chapterOrSlug: string | null | undefined,
): string {
  const record = getChapterTags(chapterOrSlug);
  if (!record) return "";

  const lines: string[] = [
    `## Chapter tags for ${record.chapterId}`,
    "",
    "These are the rules, characters, and entities the current chapter meaningfully invokes, verified against the wiki's controlled vocabulary. Prefer these citations over others when answering questions about this chapter. Only reference entities outside this list if the reader's question explicitly requires it.",
    "",
  ];

  if (record.summary) {
    lines.push(`**Summary:** ${record.summary}`, "");
  }
  if (record.themes.length > 0) {
    lines.push(`**Themes:** ${record.themes.join(", ")}`, "");
  }

  const section = <T extends ChapterTagRef>(
    label: string,
    kind: ChapterTagKind,
    items: T[],
    renderItem: (item: T) => string,
  ) => {
    if (items.length === 0) return;
    lines.push(`**${label}**`);
    for (const item of items) {
      lines.push(`- [\`/${routeForKind(kind)}/${item.slug}\`] ${renderItem(item)}`);
    }
    lines.push("");
  };

  const presenceLabel: Record<CharacterPresence, string> = {
    lead: "lead",
    supporting: "supporting",
    mentioned: "mentioned",
  };
  section<ChapterCharacterTag>(
    "Characters",
    "characters",
    record.characters,
    (c) => `${c.slug} (${presenceLabel[c.presence]}) — ${c.justification}`,
  );
  section("Rules & parables", "rules", record.rules, (r) =>
    `${r.slug} — ${r.justification}`,
  );
  section("Vaults", "vaults", record.vaults, (v) =>
    `${v.slug} — ${v.justification}`,
  );
  section("Artifacts", "artifacts", record.artifacts, (a) =>
    `${a.slug} — ${a.justification}`,
  );
  section("Locations", "locations", record.locations, (l) =>
    `${l.slug} — ${l.justification}`,
  );
  section("Factions", "factions", record.factions, (f) =>
    `${f.slug} — ${f.justification}`,
  );

  if (record.continuityFlags.length > 0) {
    lines.push(
      "**Continuity flags (authoring notes — do not surface to reader):**",
    );
    for (const flag of record.continuityFlags) lines.push(`- ${flag}`);
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}
