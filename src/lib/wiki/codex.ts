import {
  getAllArtifacts,
  getAllFactions,
  getAllLocations,
  getAllPeople,
  getAllRules,
  getAllVaults,
} from "@/lib/wiki/parser";
import { getAllChapterTags, type ChapterTagKind } from "@/lib/wiki/chapter-tags";
import { chapterNumberFromStoryId } from "@/lib/wiki/story-ids";
import type { ReaderProgress } from "@/lib/progress/reader-progress";

export type CodexKind = ChapterTagKind;

export const CODEX_KINDS: { kind: CodexKind; label: string; singular: string }[] = [
  { kind: "characters", label: "Characters", singular: "Character" },
  { kind: "factions", label: "Factions", singular: "Faction" },
  { kind: "locations", label: "Locations", singular: "Location" },
  { kind: "artifacts", label: "Artifacts", singular: "Artifact" },
  { kind: "vaults", label: "Vaults", singular: "Vault" },
  { kind: "rules", label: "Rules of the world", singular: "Rule" },
];

export interface CodexEntry {
  kind: CodexKind;
  slug: string;
  name: string;
  href: string;
  /** Chapter number where the reader first meets this entry; null if untagged. */
  firstChapter: number | null;
}

type FirstSeen = Map<string, number>;

function minChapter(storyIds: string[]): number | null {
  let min: number | null = null;
  for (const id of storyIds) {
    const n = chapterNumberFromStoryId(id);
    if (n !== null && (min === null || n < min)) min = n;
  }
  return min;
}

/** `"kind:slug"` → first chapter that tags it, from the curated chapter tags. */
function firstSeenFromChapterTags(): FirstSeen {
  const out: FirstSeen = new Map();
  for (const record of getAllChapterTags()) {
    const n = chapterNumberFromStoryId(record.chapterId);
    if (n === null) continue;
    for (const { kind } of CODEX_KINDS) {
      for (const ref of record[kind]) {
        const key = `${kind}:${ref.slug}`;
        const prev = out.get(key);
        if (prev === undefined || n < prev) out.set(key, n);
      }
    }
  }
  return out;
}

/**
 * Every codex entry with the chapter it first appears in. First appearance
 * comes from chapter tags, falling back to the entry's own appearance list.
 */
export function getCodexEntries(): CodexEntry[] {
  const seen = firstSeenFromChapterTags();
  const first = (kind: CodexKind, slug: string, fallbackIds: string[]) =>
    seen.get(`${kind}:${slug}`) ?? minChapter(fallbackIds);

  const entries: CodexEntry[] = [];
  for (const p of getAllPeople()) {
    entries.push({
      kind: "characters",
      slug: p.slug,
      name: p.name,
      href: `/characters/${p.slug}`,
      firstChapter: first("characters", p.slug, [
        ...p.memoirStoryIds,
        ...p.interviewStoryIds,
      ]),
    });
  }
  const nouns: [CodexKind, ReturnType<typeof getAllFactions>][] = [
    ["factions", getAllFactions()],
    ["locations", getAllLocations()],
    ["artifacts", getAllArtifacts()],
    ["vaults", getAllVaults()],
  ];
  for (const [kind, list] of nouns) {
    for (const e of list) {
      entries.push({
        kind,
        slug: e.slug,
        name: e.name,
        href: `/${kind}/${e.slug}`,
        firstChapter: first(kind, e.slug, [
          ...e.memoirStoryIds,
          ...e.interviewStoryIds,
        ]),
      });
    }
  }
  for (const r of getAllRules()) {
    entries.push({
      kind: "rules",
      slug: r.slug,
      name: r.title,
      href: `/rules/${r.slug}`,
      firstChapter: first("rules", r.slug, []),
    });
  }
  return entries;
}

/**
 * An entry is visible once the reader has finished the chapter that
 * introduces it. Entries nothing in the book points at stay hidden until the
 * whole book is open, so an unplaced entry can never spoil.
 */
export function isCodexEntryVisible(
  entry: Pick<CodexEntry, "firstChapter">,
  progress: Pick<ReaderProgress, "currentChapterNumber" | "showAllContent">
): boolean {
  if (progress.showAllContent) return true;
  if (entry.firstChapter === null) return false;
  return entry.firstChapter <= progress.currentChapterNumber;
}

export function findCodexEntry(kind: CodexKind, slug: string): CodexEntry | null {
  return (
    getCodexEntries().find((e) => e.kind === kind && e.slug === slug) ?? null
  );
}

/** Entries the reader meets for the first time in `chapterNumber`. */
export function getCodexEntriesIntroducedIn(chapterNumber: number): CodexEntry[] {
  return getCodexEntries().filter((e) => e.firstChapter === chapterNumber);
}
