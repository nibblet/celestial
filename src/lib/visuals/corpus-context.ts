import "server-only";

import type { AskContextItem } from "@/lib/ai/ask-context";
import {
  retrieveAskContextItems,
  buildDefaultAskRetrievalSources,
} from "@/lib/wiki/ask-retrieval";
import {
  getCharacterBySlug,
  getArtifactBySlug,
  getLocationBySlug,
  getFactionBySlug,
  getStoryById,
} from "@/lib/wiki/parser";
import { getCorpusVersion } from "./corpus-version";
import type { EvidenceRef, VisualCorpusContext, VisualTarget } from "./types";

/**
 * Build the corpus-grounded context that the prompt synthesizer reads.
 *
 * We reuse the existing wiki-first Ask retriever so visual prompts share
 * the same lexical ranking and visibility rules as Ask. The "primary"
 * item is loaded directly from the parser (cheap and exact), and the
 * supporting items come from running the retriever with the entity name
 * as a query — that surfaces stories/arcs/locations that mention the
 * subject, giving the visual director cross-corpus signal.
 */
export async function buildVisualCorpusContext(
  target: VisualTarget,
  options: { neighborLimit?: number } = {},
): Promise<VisualCorpusContext> {
  const neighborLimit = options.neighborLimit ?? 8;
  const corpusVersion = getCorpusVersion();

  let primary: AskContextItem | null = null;
  let queryString = target.focus ?? "";

  if (target.kind === "entity" && target.id) {
    primary = loadEntityContextItem(target.id);
    if (primary) queryString = `${primary.title} ${target.focus ?? ""}`.trim();
  } else if ((target.kind === "story" || target.kind === "scene") && target.id) {
    primary = loadStoryContextItem(target.id);
    if (primary) queryString = `${primary.title} ${target.focus ?? ""}`.trim();
  }

  if (!queryString) {
    return { primary, supporting: [], corpusVersion, evidence: [] };
  }

  const supporting = retrieveAskContextItems({
    message: queryString,
    intent: { kind: "factual", confidence: 0.6, reason: "visual prompt synthesis" },
    sources: buildDefaultAskRetrievalSources(),
    limit: neighborLimit + 1,
  }).filter(
    (item) =>
      // Drop the primary itself if the retriever surfaces it.
      !primary ||
      !(
        item.kind === primary.kind &&
        (item.slug ?? item.storyId) === (primary.slug ?? primary.storyId)
      ),
  ).slice(0, neighborLimit);

  const evidence: EvidenceRef[] = [
    ...(primary ? [evidenceFrom(primary)] : []),
    ...supporting.map(evidenceFrom),
  ];

  return { primary, supporting, corpusVersion, evidence };
}

function evidenceFrom(item: AskContextItem): EvidenceRef {
  return {
    kind: item.kind,
    slug: item.slug,
    storyId: item.storyId,
    title: item.title,
    score: item.score,
  };
}

function compactExcerpt(value: string, maxChars = 600): string {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars - 1).trimEnd()}…`;
}

function loadEntityContextItem(slug: string): AskContextItem | null {
  const entity =
    getCharacterBySlug(slug) ??
    getArtifactBySlug(slug) ??
    getLocationBySlug(slug) ??
    getFactionBySlug(slug);
  if (!entity) return null;
  const text = [
    entity.canonDossier?.primaryProse,
    entity.dossier?.profile,
    entity.dossier?.role,
    entity.dossier?.arc,
    entity.note,
    entity.body,
  ]
    .filter(Boolean)
    .join("\n");
  return {
    kind: "entity",
    title: entity.name,
    href: `/${entity.entityType.replace("fiction_", "")}/${entity.slug}`,
    canonRank: "wiki_canon",
    excerpt: compactExcerpt(text),
    score: 100,
    slug: entity.slug,
  };
}

function loadStoryContextItem(storyId: string): AskContextItem | null {
  const story = getStoryById(storyId);
  if (!story) return null;
  const text = [
    story.summary,
    story.themes.join(" "),
    story.principles.join(" "),
    story.quotes.join(" "),
    story.fullText,
  ].join("\n");
  return {
    kind: "story",
    title: story.title,
    href: `/stories/${story.storyId}`,
    canonRank: "chapter_text",
    excerpt: compactExcerpt(text),
    score: 100,
    storyId: story.storyId,
  };
}

/**
 * Render the corpus context as a plain-text block that the visual director
 * can read. Kept here (rather than in the synthesizer) so tests can assert
 * the exact text the model sees.
 */
export function renderCorpusContextForPrompt(ctx: VisualCorpusContext): string {
  const lines: string[] = [];
  if (ctx.primary) {
    lines.push(`# Primary subject: ${ctx.primary.title} (${ctx.primary.kind})`);
    lines.push(ctx.primary.excerpt);
    lines.push("");
  }
  if (ctx.supporting.length > 0) {
    lines.push("# Supporting corpus passages");
    for (const item of ctx.supporting) {
      lines.push(`- [${item.kind}] ${item.title}: ${item.excerpt}`);
    }
  }
  return lines.join("\n");
}
