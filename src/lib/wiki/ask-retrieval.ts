import type { AskContextItem } from "@/lib/ai/ask-context";
import type { AskIntent } from "@/lib/ai/ask-intent";
import type { ReaderProgress } from "@/lib/progress/reader-progress";
import { isStoryUnlocked } from "@/lib/progress/reader-progress";
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
};

export type AskRetrievalRule = {
  title: string;
  slug: string;
  href: string;
  text: string;
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
      excerpt: compactExcerpt(story.summary || story.text),
      score,
      storyId: story.storyId,
    });
  }

  for (const entity of sources.entities ?? []) {
    const visible = (entity.storyIds ?? []).every((storyId) =>
      storyIsVisible(storyId, input.readerProgress),
    );
    if (!visible) continue;
    const score =
      lexicalScore(queryTokens, `${entity.title} ${entity.text}`) +
      titleBoost(input.message, entity.title, entity.slug) +
      intentBoost(input.intent, "entity");
    if (score <= 0) continue;
    items.push({
      kind: "entity",
      title: entity.title,
      href: entity.href,
      canonRank: "wiki_canon",
      excerpt: compactExcerpt(entity.text),
      score,
      slug: entity.slug,
    });
  }

  for (const rule of sources.rules ?? []) {
    const score =
      lexicalScore(queryTokens, `${rule.title} ${rule.text}`) +
      titleBoost(input.message, rule.title, rule.slug) +
      intentBoost(input.intent, "rule");
    if (score <= 0) continue;
    items.push({
      kind: "rule",
      title: rule.title,
      href: rule.href,
      canonRank: "wiki_canon",
      excerpt: compactExcerpt(rule.text),
      score,
      slug: rule.slug,
    });
  }

  for (const arc of sources.arcs ?? []) {
    const score =
      lexicalScore(queryTokens, `${arc.title} ${arc.text}`) +
      titleBoost(input.message, arc.title, arc.slug) +
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

  return items.sort((a, b) => b.score - a.score).slice(0, input.limit ?? 12);
}
