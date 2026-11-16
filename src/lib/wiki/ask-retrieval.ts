import type { AskContextItem } from "@/lib/ai/ask-context";
import type { AskIntent } from "@/lib/ai/ask-intent";
import type { ReaderProgress } from "@/lib/progress/reader-progress";
import {
  getLastChapterNumber,
  isStoryUnlocked,
} from "@/lib/progress/reader-progress";
import {
  getAllArtifacts,
  getAllCharacters,
  getAllFactions,
  getAllLocations,
  getAllRules,
  getAllStories,
  getAllVaults,
  type WikiStory,
} from "@/lib/wiki/parser";
import { getAllCharacterArcs } from "@/lib/wiki/character-arcs";
import { getChapterRecord } from "@/lib/archive/record";
import type { ChapterTagKind } from "@/lib/wiki/chapter-tags";

export type AskRetrievalStory = {
  storyId: string;
  title: string;
  href: string;
  summary: string;
  text: string;
};

export type AskRetrievalEntity = {
  title: string;
  slug: string;
  href: string;
  text: string;
  storyIds?: string[];
  /**
   * What each chapter puts on record about this file. A spoiler-safe reader
   * who has met the file gets these entries up to their bookmark in place of
   * the whole-book dossier text.
   */
  record?: { chapterNumber: number; text: string }[];
};

export type AskRetrievalRule = {
  title: string;
  slug: string;
  href: string;
  text: string;
  /** Per-chapter record, used in place of `text` for a mid-book reader. */
  record?: { chapterNumber: number; text: string }[];
};

export type AskRetrievalArc = {
  title: string;
  slug: string;
  href: string;
  text: string;
};

export type AskRetrievalSources = {
  stories?: AskRetrievalStory[];
  entities?: AskRetrievalEntity[];
  rules?: AskRetrievalRule[];
  arcs?: AskRetrievalArc[];
};

export type RetrieveAskContextItemsInput = {
  message: string;
  intent: AskIntent;
  storySlug?: string;
  readerProgress?: ReaderProgress | null;
  sources?: AskRetrievalSources;
  limit?: number;
};

const STOP_WORDS = new Set([
  "the",
  "and",
  "that",
  "this",
  "with",
  "what",
  "when",
  "where",
  "which",
  "does",
  "did",
  "how",
  "why",
  "is",
  "are",
  "was",
  "were",
  "next",
]);

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function tokenize(value: string): string[] {
  return normalize(value)
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function compactExcerpt(value: string, maxChars = 420): string {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars - 1).trimEnd()}…`;
}

function lexicalScore(queryTokens: string[], haystack: string): number {
  const normalized = normalize(haystack);
  let score = 0;
  for (const token of queryTokens) {
    if (normalized.includes(token)) score += 1;
  }
  return score;
}

function titleBoost(query: string, title: string, slug?: string): number {
  const normalizedQuery = normalize(query);
  const normalizedTitle = normalize(title);
  const normalizedSlug = slug ? normalize(slug) : "";
  if (normalizedTitle && normalizedQuery.includes(normalizedTitle)) return 8;
  if (normalizedSlug && normalizedQuery.includes(normalizedSlug)) return 8;
  return 0;
}

/**
 * Readers name people and places by part of the name ("Thane", "SOVRIN").
 * Credit a file when distinctive words of its title appear in the question.
 */
function nameBoost(queryTokens: string[], title: string): number {
  const titleTokens = tokenize(title).filter((t) => t.length >= 4);
  if (titleTokens.length === 0) return 0;
  const hits = titleTokens.filter((t) => queryTokens.includes(t)).length;
  return Math.round((6 * hits) / titleTokens.length);
}

/**
 * The paragraph of a chapter that best matches the question, so the answer
 * can draw on the moment itself rather than only the chapter summary.
 */
function bestPassage(text: string, queryTokens: string[]): string {
  if (!text || queryTokens.length === 0) return "";
  let best = "";
  let bestScore = 1; // one matching word is not enough to single out a passage
  for (const paragraph of text.split(/\n\s*\n/)) {
    if (paragraph.trim().length < 60) continue;
    const score = lexicalScore(queryTokens, paragraph);
    if (score > bestScore) {
      best = paragraph;
      bestScore = score;
    }
  }
  return best;
}

/** Keep chapters from crowding every file out of the context. */
const MAX_STORY_ITEMS = 6;

function intentBoost(intent: AskIntent, kind: AskContextItem["kind"]): number {
  if (intent.kind === "character_arc" && kind === "character_arc") return 6;
  if (intent.kind === "world_rule" && kind === "rule") return 5;
  if (intent.kind === "factual" && kind === "story") return 2;
  if (intent.kind === "future_speculation" && kind === "open_thread") return 4;
  return 0;
}

function fromWikiStory(story: WikiStory): AskRetrievalStory {
  return {
    storyId: story.storyId,
    title: story.title,
    href: `/stories/${story.storyId}`,
    summary: story.summary,
    text: [
      story.summary,
      story.themes.join(" "),
      story.principles.join(" "),
      story.quotes.join(" "),
      story.fullText,
    ].join("\n"),
  };
}

export function buildDefaultAskRetrievalSources(
  overrides: AskRetrievalSources = {},
): AskRetrievalSources {
  const entities = [
    ...getAllCharacters(),
    ...getAllArtifacts(),
    ...getAllLocations(),
    ...getAllFactions(),
    ...getAllVaults(),
  ].map((entity) => ({
    title: entity.name,
    slug: entity.slug,
    href: `/${entity.entityType.replace("fiction_", "")}/${entity.slug}`,
    text: [
      entity.canonDossier?.primaryProse,
      entity.dossier?.profile,
      entity.dossier?.role,
      entity.dossier?.arc,
      entity.note,
      entity.body,
    ]
      .filter(Boolean)
      .join("\n"),
    storyIds: entity.memoirStoryIds,
    record: getChapterRecord(
      entity.entityType.replace("fiction_", "") as ChapterTagKind,
      entity.slug,
      { currentChapterNumber: 0, showAllContent: true },
    ).map((entry) => ({
      chapterNumber: entry.chapterNumber,
      text: entry.text,
    })),
  }));

  return {
    stories: overrides.stories ?? getAllStories().map(fromWikiStory),
    entities,
    rules: getAllRules().map((rule) => ({
      title: rule.title,
      slug: rule.slug,
      href: `/rules/${rule.slug}`,
      text: [rule.thesis, rule.examples.join(" "), rule.note, rule.body].join(
        "\n",
      ),
      record: getChapterRecord("rules", rule.slug, {
        currentChapterNumber: 0,
        showAllContent: true,
      }).map((entry) => ({
        chapterNumber: entry.chapterNumber,
        text: entry.text,
      })),
    })),
    arcs: getAllCharacterArcs().map((arc) => ({
      title: arc.character,
      slug: arc.slug,
      href: `/arcs/${arc.slug}`,
      text: [
        arc.startingState,
        arc.unresolvedTensions,
        arc.futureQuestions,
        arc.askGuidance,
      ].join("\n"),
    })),
  };
}

function storyIsVisible(
  storyId: string | undefined,
  readerProgress: ReaderProgress | null | undefined,
): boolean {
  return !storyId || !readerProgress || isStoryUnlocked(storyId, readerProgress);
}

export function retrieveAskContextItems(
  input: RetrieveAskContextItemsInput,
): AskContextItem[] {
  const sources = input.sources ?? buildDefaultAskRetrievalSources();
  const queryTokens = tokenize(input.message);
  const items: AskContextItem[] = [];

  for (const story of sources.stories ?? []) {
    if (!storyIsVisible(story.storyId, input.readerProgress)) continue;
    const score =
      lexicalScore(queryTokens, `${story.title} ${story.summary} ${story.text}`) +
      titleBoost(input.message, story.title, story.storyId) +
      (input.storySlug === story.storyId ? 5 : 0) +
      intentBoost(input.intent, "story");
    if (score <= 0) continue;
    items.push({
      kind: "story",
      title: story.title,
      href: story.href,
      canonRank: "chapter_text",
      excerpt: (() => {
        const passage = bestPassage(story.text, queryTokens);
        if (!story.summary) return compactExcerpt(passage || story.text);
        return passage
          ? `${compactExcerpt(story.summary, 240)} Passage: ${compactExcerpt(passage, 600)}`
          : compactExcerpt(story.summary);
      })(),
      score,
      storyId: story.storyId,
    });
  }

  for (const entity of sources.entities ?? []) {
    const visible = (entity.storyIds ?? []).every((storyId) =>
      storyIsVisible(storyId, input.readerProgress),
    );
    // The dossier text covers the whole book. A reader still mid-book gets
    // only the record up to their bookmark, and nothing for files not yet met.
    let text = entity.text;
    if (!visible) {
      const through = input.readerProgress?.currentChapterNumber ?? 0;
      const known = (entity.record ?? []).filter(
        (entry) => entry.chapterNumber <= through,
      );
      if (known.length === 0) continue;
      text = known
        .map((entry) => `Chapter ${entry.chapterNumber}: ${entry.text}`)
        .join(" ");
    }
    const score =
      lexicalScore(queryTokens, `${entity.title} ${text}`) +
      titleBoost(input.message, entity.title, entity.slug) +
      nameBoost(queryTokens, entity.title) +
      intentBoost(input.intent, "entity");
    if (score <= 0) continue;
    items.push({
      kind: "entity",
      title: entity.title,
      href: entity.href,
      canonRank: "wiki_canon",
      excerpt: compactExcerpt(text, visible ? 420 : 700),
      score,
      slug: entity.slug,
    });
  }

  // Rule and arc pages are written with the whole book in view. A reader
  // still mid-book gets a rule's record up to their bookmark, and no arcs.
  const progress = input.readerProgress;
  const midBook =
    !!progress &&
    !progress.showAllContent &&
    progress.currentChapterNumber < getLastChapterNumber();

  for (const rule of sources.rules ?? []) {
    let text = rule.text;
    if (midBook) {
      const known = (rule.record ?? []).filter(
        (entry) => entry.chapterNumber <= progress.currentChapterNumber,
      );
      if (known.length === 0) continue;
      text = known
        .map((entry) => `Chapter ${entry.chapterNumber}: ${entry.text}`)
        .join(" ");
    }
    const score =
      lexicalScore(queryTokens, `${rule.title} ${text}`) +
      titleBoost(input.message, rule.title, rule.slug) +
      intentBoost(input.intent, "rule");
    if (score <= 0) continue;
    items.push({
      kind: "rule",
      title: rule.title,
      href: rule.href,
      canonRank: "wiki_canon",
      excerpt: compactExcerpt(text, midBook ? 700 : 420),
      score,
      slug: rule.slug,
    });
  }

  for (const arc of midBook ? [] : sources.arcs ?? []) {
    const score =
      lexicalScore(queryTokens, `${arc.title} ${arc.text}`) +
      titleBoost(input.message, arc.title, arc.slug) +
      nameBoost(queryTokens, arc.title) +
      intentBoost(input.intent, "character_arc");
    if (score <= 0) continue;
    items.push({
      kind: "character_arc",
      title: arc.title,
      href: arc.href,
      canonRank: "derived_inference",
      excerpt: compactExcerpt(arc.text),
      score,
      slug: arc.slug,
    });
  }

  const limit = input.limit ?? 12;
  const ranked = items.sort((a, b) => b.score - a.score);
  const hasFiles = ranked.some((item) => item.kind !== "story");
  if (!hasFiles) return ranked.slice(0, limit);
  let stories = 0;
  return ranked
    .filter((item) => item.kind !== "story" || ++stories <= MAX_STORY_ITEMS)
    .slice(0, limit);
}
