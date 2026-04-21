import { createHash } from "crypto";
import { book } from "@/config/book";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getAllStories,
  parseWikiStoryMarkdown,
  type WikiStory,
} from "@/lib/wiki/parser";

export interface StoryDraftForMirror {
  id: string;
  title: string;
  body: string;
  life_stage: string | null;
  year_start: number | null;
  year_end: number | null;
  themes: string[] | null;
  principles: string[] | null;
  quotes: string[] | null;
  story_id: string | null;
}

export interface MirrorTimelineEvent {
  year: number;
  event: string;
  organization?: string;
  location?: string;
  confidence: "low" | "medium" | "high";
}

export interface StoryIntegration {
  storyId: string;
  title: string;
  bodyMarkdown: string;
  summary: string;
  lifeStage: string;
  yearStart: number | null;
  yearEnd: number | null;
  themes: string[];
  principles: string[];
  heuristics: string[];
  quotes: string[];
  timelineEvents: MirrorTimelineEvent[];
  relatedStoryIds: string[];
  bestUsedWhen: string[];
  peopleMentions: string[];
  wordCount: number;
  contentHash: string;
}

interface WikiDocumentRow {
  doc_type: "story" | "theme" | "principle" | "timeline" | "index" | "ask_context";
  doc_key: string;
  title: string;
  markdown: string;
  source_draft_id?: string | null;
  story_id?: string | null;
  version: number;
  status: "active" | "superseded";
  content_hash: string;
  generated_at: string;
  updated_at?: string;
}

export function slugifyWikiTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function tiptapHtmlToMarkdown(input: string): string {
  if (!/^\s*</.test(input)) return input.trim();

  return input
    .replace(/<img\b[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*>/gi, "\n\n![$2]($1)\n\n")
    .replace(/<img\b[^>]*alt=["']([^"']*)["'][^>]*src=["']([^"']+)["'][^>]*>/gi, "\n\n![$1]($2)\n\n")
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n\n# $1\n\n")
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n\n## $1\n\n")
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n\n### $1\n\n")
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "\n\n$1\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "\n- $1")
    .replace(/<\/(?:ul|ol)>/gi, "\n")
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "**$1**")
    .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, "**$1**")
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "_$1_")
    .replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, "_$1_")
    .replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function summarize(text: string): string {
  const plain = stripHtml(text);
  if (plain.length <= 240) return plain;
  const sentence = plain.match(/^(.{80,240}?[.!?])\s/)?.[1];
  return sentence || `${plain.slice(0, 237).trim()}...`;
}

function normalizeList(values: string[] | null | undefined): string[] {
  return Array.from(
    new Set((values ?? []).map((value) => value.trim()).filter(Boolean))
  );
}

function inferRelatedStoryIds(
  storyId: string,
  themes: string[],
  existingStories: WikiStory[],
  limit = 4
): string[] {
  if (themes.length === 0) return [];
  const themeSet = new Set(themes.map((theme) => theme.toLowerCase()));
  return existingStories
    .filter((story) => story.storyId !== storyId)
    .map((story) => ({
      story,
      score: story.themes.filter((theme) => themeSet.has(theme.toLowerCase())).length,
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.story.storyId.localeCompare(b.story.storyId))
    .slice(0, limit)
    .map((entry) => entry.story.storyId);
}

function timelineEventsFromYears(
  draft: StoryDraftForMirror
): MirrorTimelineEvent[] {
  if (!draft.year_start) return [];
  const range =
    draft.year_end && draft.year_end !== draft.year_start
      ? `${draft.year_start}-${draft.year_end}`
      : String(draft.year_start);
  return [
    {
      year: draft.year_start,
      event: `${draft.title} (${range})`,
      confidence: "medium",
    },
  ];
}

export function buildStoryIntegration(
  draft: StoryDraftForMirror,
  storyId: string,
  existingStories = getAllStories()
): StoryIntegration {
  const bodyMarkdown = tiptapHtmlToMarkdown(draft.body || "");
  const plainBody = stripHtml(draft.body || bodyMarkdown);
  const themes = normalizeList(draft.themes);
  const principles = normalizeList(draft.principles);
  const quotes = normalizeList(draft.quotes);
  const lifeStage = draft.life_stage?.trim() || "Reflection";
  const relatedStoryIds = inferRelatedStoryIds(storyId, themes, existingStories);
  const wordCount = plainBody.split(/\s+/).filter(Boolean).length;
  const contentHash = hashText(
    JSON.stringify({
      storyId,
      title: draft.title,
      bodyMarkdown,
      lifeStage,
      yearStart: draft.year_start,
      yearEnd: draft.year_end,
      themes,
      principles,
      quotes,
    })
  );

  return {
    storyId,
    title: draft.title.trim() || "Untitled",
    bodyMarkdown,
    summary: summarize(draft.body || bodyMarkdown),
    lifeStage,
    yearStart: draft.year_start,
    yearEnd: draft.year_end,
    themes,
    principles,
    heuristics: [],
    quotes,
    timelineEvents: timelineEventsFromYears(draft),
    relatedStoryIds,
    bestUsedWhen: themes.map((theme) => `Someone asks about ${theme.toLowerCase()}`),
    peopleMentions: [],
    wordCount,
    contentHash,
  };
}

export function buildStoryWikiMarkdown(integration: StoryIntegration): string {
  const lines = [
    `# ${integration.title}`,
    "",
    `> ${integration.summary}`,
    "",
    `**Story ID:** ${integration.storyId}`,
    `**Source:** Beyond story (${book.title})`,
    `**Life Stage:** ${integration.lifeStage}`,
    `**Themes:** ${integration.themes.join(", ")}`,
    `**Word Count:** ${integration.wordCount}`,
    "",
    "## Full Text",
    "",
    integration.bodyMarkdown,
    "",
  ];

  if (integration.principles.length > 0) {
    lines.push("## What This Story Shows", "");
    for (const principle of integration.principles) lines.push(`- ${principle}`);
    lines.push("");
  }

  if (integration.heuristics.length > 0) {
    lines.push("## If You're Thinking About...", "");
    for (const heuristic of integration.heuristics) lines.push(`- ${heuristic}`);
    lines.push("");
  }

  if (integration.quotes.length > 0) {
    lines.push("## Key Quotes", "");
    for (const quote of integration.quotes) lines.push(`> "${quote}"`, "");
  }

  const visibleTimeline = integration.timelineEvents.filter(
    (event) => event.confidence !== "low"
  );
  if (visibleTimeline.length > 0) {
    lines.push("## Timeline", "");
    for (const event of visibleTimeline) {
      lines.push(`- **${event.year}** — ${event.event}`);
    }
    lines.push("");
  }

  if (integration.relatedStoryIds.length > 0) {
    lines.push("## Related Stories", "");
    for (const storyId of integration.relatedStoryIds) lines.push(`- [[${storyId}]]`);
    lines.push("");
  }

  if (integration.bestUsedWhen.length > 0) {
    lines.push("## Best Used When Someone Asks About", "");
    for (const item of integration.bestUsedWhen) lines.push(`- ${item}`);
    lines.push("");
  }

  lines.push(
    "---",
    `*Source: Beyond story mirror · generated ${new Date().toISOString().slice(0, 10)}*`
  );

  return lines.join("\n");
}

/** If publish fails after superseding the active story doc, restore the latest superseded row so Ask/corpus stay consistent. */
async function reactivateLatestSupersededStoryDoc(
  supabase: SupabaseClient,
  docKey: string,
  now: string
): Promise<void> {
  const { data } = await supabase
    .from("sb_wiki_documents")
    .select("id")
    .eq("doc_type", "story")
    .eq("doc_key", docKey)
    .eq("status", "superseded")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data?.id) return;
  await supabase
    .from("sb_wiki_documents")
    .update({ status: "active", updated_at: now })
    .eq("id", data.id);
}

/**
 * After a failed derived-doc insert, re-activate the most recent superseded row per
 * (doc_type, doc_key) only — not every historical superseded row (would violate the active unique index).
 */
async function reactivateLatestSupersededDerivedWikiDocs(
  supabase: SupabaseClient,
  now: string
): Promise<void> {
  const { data } = await supabase
    .from("sb_wiki_documents")
    .select("id, doc_type, doc_key, version")
    .in("doc_type", ["theme", "timeline", "index"])
    .eq("status", "superseded");
  const bestByKey = new Map<string, { id: string; version: number }>();
  for (const row of data ?? []) {
    const k = `${row.doc_type}:${row.doc_key}`;
    const prev = bestByKey.get(k);
    if (!prev || row.version > prev.version) {
      bestByKey.set(k, { id: row.id, version: row.version });
    }
  }
  for (const { id } of bestByKey.values()) {
    await supabase
      .from("sb_wiki_documents")
      .update({ status: "active", updated_at: now })
      .eq("id", id);
  }
}

export async function publishStoryToWikiMirror(
  supabase: SupabaseClient,
  draft: StoryDraftForMirror,
  storyId: string
): Promise<{ integration: StoryIntegration; markdown: string; version: number }> {
  const integration = buildStoryIntegration(draft, storyId);
  const markdown = buildStoryWikiMarkdown(integration);
  const now = new Date().toISOString();
  const docKey = storyId;

  const { error: supersedeDocError } = await supabase
    .from("sb_wiki_documents")
    .update({ status: "superseded", updated_at: now })
    .eq("doc_type", "story")
    .eq("doc_key", docKey)
    .eq("status", "active");
  if (supersedeDocError) {
    throw new Error(`Failed to supersede wiki document: ${supersedeDocError.message}`);
  }

  const { data: priorVersions } = await supabase
    .from("sb_wiki_documents")
    .select("version")
    .eq("doc_type", "story")
    .eq("doc_key", docKey)
    .order("version", { ascending: false })
    .limit(1);

  const version = ((priorVersions?.[0]?.version as number | undefined) ?? 0) + 1;

  const { error: integrationError } = await supabase.from("sb_story_integrations").insert({
    draft_id: draft.id,
    story_id: storyId,
    version,
    content_hash: integration.contentHash,
    summary: integration.summary,
    life_stage: integration.lifeStage,
    year_start: integration.yearStart,
    year_end: integration.yearEnd,
    themes: integration.themes,
    principles: integration.principles,
    heuristics: integration.heuristics,
    quotes: integration.quotes,
    timeline_events: integration.timelineEvents,
    related_story_ids: integration.relatedStoryIds,
    best_used_when: integration.bestUsedWhen,
    people_mentions: integration.peopleMentions,
    generated_at: now,
  });
  if (integrationError) {
    await reactivateLatestSupersededStoryDoc(supabase, docKey, now);
    throw new Error(`Failed to save story integration: ${integrationError.message}`);
  }

  const row: WikiDocumentRow = {
    doc_type: "story",
    doc_key: docKey,
    title: integration.title,
    markdown,
    source_draft_id: draft.id,
    story_id: storyId,
    version,
    status: "active",
    content_hash: integration.contentHash,
    generated_at: now,
    updated_at: now,
  };

  const { error: documentError } = await supabase.from("sb_wiki_documents").insert(row);
  if (documentError) {
    await reactivateLatestSupersededStoryDoc(supabase, docKey, now);
    throw new Error(`Failed to save wiki document: ${documentError.message}`);
  }

  await rebuildDerivedWikiMirrorDocuments(supabase);

  return { integration, markdown, version };
}

async function getMergedStoriesForDerivedDocs(
  supabase: SupabaseClient
): Promise<WikiStory[]> {
  const fileStories = getAllStories();
  const { data } = await supabase
    .from("sb_wiki_documents")
    .select("doc_key, title, markdown")
    .eq("doc_type", "story")
    .eq("status", "active");

  const byId = new Map<string, WikiStory>();
  for (const story of fileStories) byId.set(story.storyId, story);
  for (const doc of data ?? []) {
    const story = parseWikiStoryMarkdown(
      String(doc.markdown),
      `${doc.doc_key}-${slugifyWikiTitle(String(doc.title))}.md`
    );
    if (story) byId.set(story.storyId, story);
  }
  return Array.from(byId.values()).sort((a, b) =>
    a.storyId.localeCompare(b.storyId)
  );
}

function buildThemeMarkdown(theme: string, stories: WikiStory[]): string {
  const principles = Array.from(
    new Set(stories.flatMap((story) => story.principles))
  ).slice(0, 12);
  const quotes = stories
    .flatMap((story) =>
      story.quotes.map((quote) => ({ quote, title: story.title }))
    )
    .slice(0, 6);

  const lines = [
    `# ${theme}`,
    "",
    `> Stories and principles related to ${theme.toLowerCase()}.`,
    "",
    `**${stories.length} stories** explore this theme.`,
    "",
    "## Principles",
    "",
    ...principles.map((principle) => `- ${principle}`),
    "",
    "## Stories",
    "",
    ...stories.map(
      (story) =>
        `- [[${story.storyId}]] ${story.title} — ${story.summary.slice(0, 100)}...`
    ),
    "",
  ];

  if (quotes.length > 0) {
    lines.push("## Selected Quotes", "");
    for (const quote of quotes) lines.push(`> "${quote.quote}" — _${quote.title}_`, "");
  }

  lines.push("---", "*Theme compiled from canonical wiki corpus*");
  return lines.join("\n");
}

function buildTimelineMarkdown(stories: WikiStory[]): string {
  const events = stories.flatMap((story) =>
    story.timelineEvents.map((line) => ({
      story,
      line,
      year: parseInt(line.match(/\*\*(\d{4})\*\*/)?.[1] || "", 10),
    }))
  );
  const validEvents = events
    .filter((event) => Number.isFinite(event.year))
    .sort((a, b) => a.year - b.year || a.story.storyId.localeCompare(b.story.storyId));

  const lines = [
    `# ${book.title} — Timeline`,
    "",
    "> Chronological events linked to stories in the canonical corpus.",
    "",
    `**${validEvents.length} events** from published stories.`,
    "",
  ];

  let currentDecade = "";
  for (const event of validEvents) {
    const decade = `${Math.floor(event.year / 10) * 10}s`;
    if (decade !== currentDecade) {
      currentDecade = decade;
      lines.push(`## ${decade}`, "");
    }
    lines.push(`${event.line} — [[${event.story.storyId}]]`);
  }

  lines.push("", "---", "*Timeline compiled from canonical wiki corpus*");
  return lines.join("\n");
}

function buildIndexMarkdown(stories: WikiStory[]): string {
  const memoir = stories.filter((story) => story.source === "memoir");
  const interview = stories.filter((story) => story.source === "interview");
  const family = stories.filter((story) => story.source === "family");

  const section = (title: string, items: WikiStory[]) => [
    `## ${title}`,
    "",
    ...items.map(
      (story) =>
        `- [[stories/${story.storyId}-${story.slug}.md]] — ${story.title}: ${story.summary.slice(0, 100)}...`
    ),
    "",
  ];

  return [
    `# ${book.title} — Wiki Index`,
    "",
    "> Master index of filesystem wiki pages plus active Supabase wiki mirror documents.",
    "",
    `**${stories.length} stories** (${memoir.length} memoir + ${interview.length} interview + ${family.length} family/Beyond)`,
    "",
    ...section("Memoir Stories", memoir),
    ...section("Interview Stories", interview),
    ...section("Family and Beyond Stories", family),
    "---",
    `*Compiled: ${new Date().toISOString().slice(0, 10)}*`,
  ].join("\n");
}

export async function rebuildDerivedWikiMirrorDocuments(
  supabase: SupabaseClient
): Promise<void> {
  const stories = await getMergedStoriesForDerivedDocs(supabase);
  const now = new Date().toISOString();
  const { data: latestDerived } = await supabase
    .from("sb_wiki_documents")
    .select("version")
    .in("doc_type", ["theme", "timeline", "index"])
    .order("version", { ascending: false })
    .limit(1);
  const derivedVersion =
    ((latestDerived?.[0]?.version as number | undefined) ?? 0) + 1;
  const docs: WikiDocumentRow[] = [];
  const themes = new Map<string, WikiStory[]>();

  for (const story of stories) {
    for (const theme of story.themes) {
      if (!themes.has(theme)) themes.set(theme, []);
      themes.get(theme)!.push(story);
    }
  }

  for (const [theme, themeStories] of themes) {
    const markdown = buildThemeMarkdown(theme, themeStories);
    docs.push({
      doc_type: "theme",
      doc_key: `theme:${slugifyWikiTitle(theme)}`,
      title: theme,
      markdown,
      version: derivedVersion,
      status: "active",
      content_hash: hashText(markdown),
      generated_at: now,
      updated_at: now,
    });
  }

  const timelineMarkdown = buildTimelineMarkdown(stories);
  docs.push({
    doc_type: "timeline",
    doc_key: "timeline:career",
    title: `${book.title} — Timeline`,
    markdown: timelineMarkdown,
    version: derivedVersion,
    status: "active",
    content_hash: hashText(timelineMarkdown),
    generated_at: now,
    updated_at: now,
  });

  const indexMarkdown = buildIndexMarkdown(stories);
  docs.push({
    doc_type: "index",
    doc_key: "main",
    title: `${book.title} — Wiki Index`,
    markdown: indexMarkdown,
    version: derivedVersion,
    status: "active",
    content_hash: hashText(indexMarkdown),
    generated_at: now,
    updated_at: now,
  });

  const { error: supersedeError } = await supabase
    .from("sb_wiki_documents")
    .update({ status: "superseded", updated_at: now })
    .in("doc_type", ["theme", "timeline", "index"])
    .eq("status", "active");
  if (supersedeError) {
    throw new Error(`Failed to supersede derived wiki documents: ${supersedeError.message}`);
  }

  const { error: insertError } = await supabase
    .from("sb_wiki_documents")
    .insert(docs);
  if (insertError) {
    await reactivateLatestSupersededDerivedWikiDocs(supabase, now);
    throw new Error(`Failed to save derived wiki documents: ${insertError.message}`);
  }
}
