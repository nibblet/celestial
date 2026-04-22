import { createClient } from "@/lib/supabase/server";
import { book } from "@/config/book";
import {
  getAllStories,
  getStoryById,
  parseWikiStoryMarkdown,
  type WikiStory,
} from "@/lib/wiki/parser";
import { slugifyWikiTitle } from "@/lib/wiki/wiki-mirror";
import { chapterSortKey } from "@/lib/wiki/story-ids";

interface WikiDocumentRow {
  doc_key: string;
  title: string;
  markdown: string;
  story_id: string | null;
  version: number;
  generated_at: string;
}

// 30-second TTL. In Vercel serverless each Lambda instance has its own cache.
// invalidateWikiCorpusCache() only affects the calling instance — other
// concurrent instances will serve stale data until their TTL expires.
// This is acceptable: Beyond publishes are rare and 30s staleness is invisible.
const CACHE_TTL_MS = 30_000;

let cachedDbStories:
  | { expiresAt: number; stories: WikiStory[]; markdownByStoryId: Map<string, string> }
  | null = null;

async function getActiveDbStoryDocuments(): Promise<WikiDocumentRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sb_wiki_documents")
    .select("doc_key, title, markdown, story_id, version, generated_at")
    .eq("doc_type", "story")
    .eq("status", "active")
    .order("doc_key", { ascending: true });

  if (error || !data) return [];
  return data as WikiDocumentRow[];
}

async function getActiveDbStories(): Promise<{
  stories: WikiStory[];
  markdownByStoryId: Map<string, string>;
}> {
  const now = Date.now();
  if (cachedDbStories && cachedDbStories.expiresAt > now) {
    return cachedDbStories;
  }

  const docs = await getActiveDbStoryDocuments();
  const stories: WikiStory[] = [];
  const markdownByStoryId = new Map<string, string>();

  for (const doc of docs) {
    const story = parseWikiStoryMarkdown(
      doc.markdown,
      `${doc.doc_key}-${slugifyWikiTitle(doc.title)}.md`
    );
    if (!story) continue;
    stories.push(story);
    markdownByStoryId.set(story.storyId, doc.markdown);
  }

  cachedDbStories = {
    expiresAt: now + CACHE_TTL_MS,
    stories,
    markdownByStoryId,
  };
  return cachedDbStories;
}

/**
 * Clears the in-memory corpus cache for this Lambda instance.
 * In Vercel serverless, other concurrent instances are unaffected —
 * their caches expire naturally after CACHE_TTL_MS.
 */
export function invalidateWikiCorpusCache() {
  cachedDbStories = null;
}

export async function getCanonicalStories(): Promise<WikiStory[]> {
  const fileStories = getAllStories();
  const { stories: dbStories } = await getActiveDbStories();
  const byId = new Map<string, WikiStory>();

  for (const story of fileStories) byId.set(story.storyId, story);
  for (const story of dbStories) byId.set(story.storyId, story);

  return Array.from(byId.values()).sort((a, b) =>
    chapterSortKey(a.storyId).localeCompare(chapterSortKey(b.storyId))
  );
}

export async function getCanonicalStoryById(
  storyId: string
): Promise<WikiStory | null> {
  const { stories: dbStories } = await getActiveDbStories();
  return dbStories.find((story) => story.storyId === storyId) ?? getStoryById(storyId);
}

export async function getCanonicalStoryMarkdown(
  storyId: string
): Promise<string> {
  const { markdownByStoryId } = await getActiveDbStories();
  return markdownByStoryId.get(storyId) ?? "";
}

export async function getCanonicalStoryLinkCatalog(): Promise<string> {
  const stories = await getCanonicalStories();
  return stories.map((story) => `- ${story.storyId} — ${story.title}`).join("\n");
}

export async function getCanonicalWikiSummaries(): Promise<string> {
  const supabase = await createClient();
  const { data: indexDoc } = await supabase
    .from("sb_wiki_documents")
    .select("markdown")
    .eq("doc_type", "index")
    .eq("doc_key", "main")
    .eq("status", "active")
    .maybeSingle();
  if (indexDoc?.markdown) return String(indexDoc.markdown);

  const stories = await getCanonicalStories();
  const fileCount = getAllStories().length;
  const dbStories = stories.filter((story) => story.source === "family");

  const lines = [
    `# ${book.title} — Wiki Index`,
    "",
    "> Canonical merged index from filesystem wiki pages and active Supabase wiki mirror documents.",
    "",
    `**${stories.length} stories** (${fileCount} filesystem + ${dbStories.length} active mirror)`,
    "",
    "## Stories",
    "",
  ];

  for (const story of stories) {
    lines.push(
      `- [[stories/${story.storyId}-${story.slug}.md]] — ${story.title}: ${story.summary.slice(0, 120)}...`
    );
  }

  return lines.join("\n");
}

// ── Canon precedence (shared by prompts, verifier, future tooling) ─────

/** Order: earlier = higher authority when sources conflict. */
export const CANON_SOURCE_RANK = [
  "chapter_text",
  "wiki_canon",
  "derived_inference",
] as const;

export type CanonSourceRank = (typeof CANON_SOURCE_RANK)[number];

export function canonAuthorityOrder(rank: CanonSourceRank): number {
  return CANON_SOURCE_RANK.indexOf(rank);
}

/** Negative if `a` should override `b`. */
export function compareCanonAuthority(
  a: CanonSourceRank,
  b: CanonSourceRank,
): number {
  return canonAuthorityOrder(a) - canonAuthorityOrder(b);
}
