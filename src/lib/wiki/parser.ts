import * as fs from "fs";
import * as path from "path";
import {
  CANONICAL_PRINCIPLES,
  type CanonicalPrincipleDefinition,
} from "@/config/canonical-principles";
import { book } from "@/config/book";
import {
  FICTION_ARTIFACTS_NOUN,
  FICTION_CHARACTERS_NOUN,
  FICTION_FACTIONS_NOUN,
  FICTION_LOCATIONS_NOUN,
  FICTION_RULES_CONCEPT,
  FICTION_VAULTS_NOUN,
  LEGACY_PEOPLE_NOUN,
} from "@/config/wiki-entities";
import { extractSection, extractMetadata } from "@/lib/wiki/markdown-sections";
import {
  parseWikiFictionNounMarkdown,
  parseWikiNounMarkdown,
  parseWikiRuleConceptMarkdown,
  parseWikiThemeMarkdown,
} from "@/lib/wiki/entity-loader";
import { chapterSortKey, WIKI_STORY_ID_PATTERN } from "@/lib/wiki/story-ids";
import type { WikiEntityLoreMetadata } from "@/lib/wiki/lore-provenance";
import type { CharacterDossier } from "@/lib/wiki/entity-dossier";
import type { CanonDossier } from "@/lib/wiki/canon-dossier";
export type { CanonDossier, CanonDossierSource } from "@/lib/wiki/canon-dossier";
import { normalizeChapterThemes } from "@/lib/wiki/taxonomy";
import { timelineData } from "@/lib/wiki/static-data";

const WIKI_DIR = path.join(process.cwd(), "content/wiki");
const RAW_CONTENT_DIR = path.join(process.cwd(), "content/raw");

export type StorySource = "memoir" | "interview" | "family";

export interface WikiStory {
  storyId: string;
  volume: string;
  slug: string;
  title: string;
  summary: string;
  source: StorySource;
  sourceDetail: string;
  lifeStage: string;
  themes: string[];
  wordCount: number;
  fullText: string;
  principles: string[];
  heuristics: string[];
  quotes: string[];
  relatedStoryIds: string[];
  bestUsedWhen: string[];
  timelineEvents: string[];
}

export interface WikiTheme {
  slug: string;
  name: string;
  storyCount: number;
  principles: { text: string; storyId: string }[];
  storyIds: string[];
  stories: { storyId: string; title: string; summary: string }[];
  quotes: { text: string; title: string }[];
}

export type TimelineSource = "memoir" | "public_record" | "interview";

export interface WikiTimelineEvent {
  year: number;
  event: string;
  organization: string;
  location: string;
  storyRef: string;
  /** Path under public/, e.g. /timeline/usm.jpg */
  illustration?: string;
  source: TimelineSource;
  sourceDetail?: string;
}

export interface WikiMissionLogInventory {
  generatedAt: string;
  source: string;
  missionLogs: Array<{
    logId: string;
    chapterId: string;
    chapterNumber: number;
    chapterTitle: string;
    dateShipTime: string;
    author: string;
    logType: string;
    location: string;
    privacyLevel: string;
    summary: string;
    mainBody: string;
    attachments: string[];
    sourceFile: string;
  }>;
}

export interface ClusteredPrincipleVariant {
  text: string;
  storyId: string;
  file: string;
}

export interface ClusteredPrinciple {
  displayText: string;
  fingerprint: string;
  frequency: number;
  storyIds: string[];
  totalMentions: number;
  evidence: string;
  variants: ClusteredPrincipleVariant[];
}

export interface WikiPrincipleStory {
  storyId: string;
  slug: string;
  title: string;
  summary: string;
}

export interface WikiPrincipleTheme {
  slug: string;
  name: string;
  count: number;
}

export interface WikiPrincipleVariant {
  text: string;
  storyId: string;
  storyTitle: string;
  storySlug: string;
}

export interface WikiPrinciple {
  id: string;
  slug: string;
  label: string;
  storyCount: number;
  frequency: number;
  totalMentions: number;
  evidence: string;
  stories: WikiPrincipleStory[];
  relatedThemes: WikiPrincipleTheme[];
  variants: WikiPrincipleVariant[];
  summaryText: string;
  askPrompt: string;
}

export interface CanonicalPrincipleStatement {
  id: string;
  slug: string;
  label: string;
  storyCount: number;
  storyIds: string[];
  stories: WikiPrincipleStory[];
  relatedThemes: WikiPrincipleTheme[];
  variants: WikiPrincipleVariant[];
  evidence: string;
}

export interface CanonicalPrinciple {
  id: string;
  slug: string;
  title: string;
  shortTitle: string;
  thesis: string;
  narrative: string;
  aiNarrative: string;
  summaryText: string;
  askPrompt: string;
  relatedThemes: WikiPrincipleTheme[];
  supportingStatements: CanonicalPrincipleStatement[];
  stories: WikiPrincipleStory[];
  evidence: string[];
}

function readWikiFile(relativePath: string): string {
  const fullPath = path.join(WIKI_DIR, relativePath);
  if (!fs.existsSync(fullPath)) return "";
  return fs.readFileSync(fullPath, "utf-8");
}

function slugifyLabel(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function summarizeList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/**
 * Wiki "Full Text" often repeats the H1 title as its own first line; the app already shows `title` in the header.
 */
export function stripDuplicateLeadingTitleFromFullText(
  fullText: string,
  title: string
): string {
  const t = title.trim();
  const trimmed = fullText.trim();
  if (!t || !trimmed) return fullText;

  const nl = trimmed.indexOf("\n");
  const firstLine = (nl === -1 ? trimmed : trimmed.slice(0, nl)).trim();
  if (firstLine !== t) return fullText;

  const afterFirst = nl === -1 ? "" : trimmed.slice(nl + 1);
  return afterFirst.replace(/^\s+/, "");
}

// --- Public API ---

export function getAllStories(): WikiStory[] {
  const dir = path.join(WIKI_DIR, "stories");
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => getStoryFromFile(f))
    .filter(Boolean)
    .sort((a, b) =>
      chapterSortKey(a!.storyId).localeCompare(chapterSortKey(b!.storyId))
    ) as WikiStory[];
}

/** Matches memoir/interview IDs and fiction chapter refs (CH01…) in wiki text. */
export const STORY_ID_RE = new RegExp(WIKI_STORY_ID_PATTERN);

function deriveSource(storyId: string): { source: StorySource; volume: string } {
  if (storyId.startsWith("IV_")) return { source: "interview", volume: "IV" };
  if (storyId.startsWith("P1_")) return { source: "memoir", volume: "P1" };
  if (/^CH\d/i.test(storyId)) return { source: "family", volume: "CH" };
  return { source: "family", volume: storyId.match(/^(P\d+)/)?.[1] || "P2" };
}

export function parseWikiStoryMarkdown(
  content: string,
  filename = ""
): WikiStory | null {
  if (!content) return null;

  const storyIdMatch = content.match(
    new RegExp(`\\*\\*Story ID:\\*\\*\\s*(${WIKI_STORY_ID_PATTERN})`)
  );
  if (!storyIdMatch) return null;

  const titleMatch = content.match(/^# (.+)/m);
  const summaryMatch = content.match(/^> (.+)/m);

  const fullTextMatch = content.match(/## Full Text\n\n([\s\S]*?)(?=\n## )/);

  const fallbackSlug = titleMatch?.[1]
    ? slugifyLabel(titleMatch[1])
    : storyIdMatch[1].toLowerCase();
  const slug = filename
    ? filename
        .replace(/\.md$/, "")
        .replace(new RegExp(`^${WIKI_STORY_ID_PATTERN}-`), "")
    : fallbackSlug;

  const { source, volume } = deriveSource(storyIdMatch[1]);
  const sourceDetail = extractMetadata(content, "Source");

  const storyId = storyIdMatch[1];
  const rawThemes = extractMetadata(content, "Themes")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  return {
    storyId,
    volume,
    slug,
    title: titleMatch?.[1] || "",
    summary: summaryMatch?.[1] || "",
    source,
    sourceDetail,
    lifeStage: extractMetadata(content, "Life Stage"),
    themes: normalizeChapterThemes(storyId, rawThemes),
    wordCount: parseInt(extractMetadata(content, "Word Count")) || 0,
    fullText: stripDuplicateLeadingTitleFromFullText(
      fullTextMatch?.[1]?.trim() || "",
      titleMatch?.[1] || ""
    ),
    principles: extractSection(content, "What This Story Shows"),
    heuristics: extractSection(content, "If You're Thinking About\\.\\.\\."),
    quotes: extractSection(content, "Key Quotes"),
    relatedStoryIds: extractSection(content, "Related Stories").map(
      (l) =>
        l.match(new RegExp(`\\[\\[(${WIKI_STORY_ID_PATTERN})\\]\\]`))?.[1] || ""
    ).filter(Boolean),
    bestUsedWhen: extractSection(content, "Best Used When Someone Asks About"),
    timelineEvents: extractSection(content, "Timeline"),
  };
}

function getStoryFromFile(filename: string): WikiStory | null {
  const content = readWikiFile(`stories/${filename}`);
  return parseWikiStoryMarkdown(content, filename);
}

export function getStoryBySlug(slug: string): WikiStory | null {
  const dir = path.join(WIKI_DIR, "stories");
  if (!fs.existsSync(dir)) return null;

  const file = fs.readdirSync(dir).find((f) => f.includes(slug) && f.endsWith(".md"));
  if (!file) return null;

  return getStoryFromFile(file);
}

export function getStoryById(storyId: string): WikiStory | null {
  const dir = path.join(WIKI_DIR, "stories");
  if (!fs.existsSync(dir)) return null;

  const prefix = `${storyId}-`;
  const file = fs.readdirSync(dir).find((f) => f.startsWith(prefix) && f.endsWith(".md"));
  if (!file) return null;

  return getStoryFromFile(file);
}

export function getAllThemes(): WikiTheme[] {
  const dir = path.join(WIKI_DIR, "themes");
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => getThemeFromFile(f))
    .filter(Boolean)
    .sort((a, b) => b!.storyCount - a!.storyCount) as WikiTheme[];
}

function getThemeFromFile(filename: string): WikiTheme | null {
  const content = readWikiFile(`themes/${filename}`);
  if (!content) return null;
  return parseWikiThemeMarkdown(content, filename);
}

export function getThemeBySlug(slug: string): WikiTheme | null {
  const dir = path.join(WIKI_DIR, "themes");
  const filepath = path.join(dir, `${slug}.md`);
  if (!fs.existsSync(filepath)) return null;
  return getThemeFromFile(`${slug}.md`);
}

function parseTimelineMarkdown(content: string): WikiTimelineEvent[] {
  if (!content) return [];

  const events: WikiTimelineEvent[] = [];
  const lines = content.split("\n");

  const storyRefPat = WIKI_STORY_ID_PATTERN;
  // Original strict format — kept first so existing career-timeline.md rows
  // match identically (optional org/location parens + mandatory chapter ref +
  // optional trailing illustration/source/detail pipe).
  const strictRe = new RegExp(
    `^- \\*\\*(\\d{4})\\*\\* — (.+?)(?:\\s*\\((.+?)\\))?(?:,\\s*(.+?))?\\s*—\\s*\\[\\[(${storyRefPat})\\]\\]\\s*(?:\\|\\s*(.+))?$`
  );
  // Prologue-friendly format: `- **YEAR** — Event`
  //   YEAR ::= ("~")? <digits> (" BCE" | " CE")?   (e.g. ~12000 BCE, 2034 CE, 2050)
  //   Chapter ref [[CHxx]] optional; if present it's captured.
  // BCE years are stored as negative ints so sorting keeps chronology.
  const looseRe = new RegExp(
    `^- \\*\\*~?(\\d{1,6})\\s*(BCE|CE)?\\*\\* — (.+?)(?:\\s*—\\s*\\[\\[(${storyRefPat})\\]\\])?\\s*$`
  );

  for (const line of lines) {
    const strict = line.match(strictRe);
    if (strict) {
      const trailing = strict[6] || "";
      const sourcePart = trailing.match(/source:(\w+)/)?.[1] as TimelineSource | undefined;
      const detailPart = trailing.match(/detail:(.+?)(?:\s*\||$)/)?.[1]?.trim();
      const illustration = trailing
        .replace(/source:\w+/g, "")
        .replace(/detail:.+?(?:\s*\||$)/g, "")
        .replace(/\|/g, "")
        .trim() || undefined;
      events.push({
        year: parseInt(strict[1]),
        event: strict[2].trim(),
        organization: strict[3] || "",
        location: strict[4] || "",
        storyRef: strict[5],
        illustration: illustration || undefined,
        source: sourcePart || "memoir",
        sourceDetail: detailPart,
      });
      continue;
    }

    const loose = line.match(looseRe);
    if (loose) {
      const magnitude = parseInt(loose[1], 10);
      const isBce = loose[2] === "BCE";
      events.push({
        year: isBce ? -magnitude : magnitude,
        event: loose[3].trim(),
        organization: "",
        location: "",
        storyRef: loose[4] || "",
        source: "public_record",
      });
    }
  }

  return events;
}

export function getTimeline(): WikiTimelineEvent[] {
  const content = readWikiFile("timeline/career-timeline.md");
  const fromFile = parseTimelineMarkdown(content);
  if (fromFile.length > 0) return fromFile;
  return timelineData.map((e) => ({ ...e })) as WikiTimelineEvent[];
}

/**
 * Pre-Valkyrie world events from `content/wiki/timeline/prologue.md`.
 * Rendered as a separate "Before Valkyrie" section on /stories/timeline and
 * fed to Ask via `getMissionTimelineContext()`. Years may be BCE (negative
 * ints after parse) or CE; chapter refs are optional.
 */
export function getPrologueTimeline(): WikiTimelineEvent[] {
  const content = readWikiFile("timeline/prologue.md");
  return parseTimelineMarkdown(content);
}

export function getWikiSummaries(): string {
  return readWikiFile("index.md");
}

export function getMissionLogInventory(): WikiMissionLogInventory | null {
  const fullPath = path.join(RAW_CONTENT_DIR, "mission_logs_inventory.json");
  if (!fs.existsSync(fullPath)) return null;
  return JSON.parse(fs.readFileSync(fullPath, "utf-8")) as WikiMissionLogInventory;
}

export function getClusteredPrinciples(): ClusteredPrinciple[] {
  const fullPath = path.join(RAW_CONTENT_DIR, "clusters", "ai_merged_principles.json");
  if (!fs.existsSync(fullPath)) return [];

  const raw = JSON.parse(fs.readFileSync(fullPath, "utf-8")) as Array<{
    display_text?: string;
    fingerprint?: string;
    frequency?: number;
    story_ids?: string[];
    total_mentions?: number;
    evidence?: string;
    variants?: Array<{ text?: string; story_id?: string; file?: string }>;
  }>;

  return raw.map((cluster) => ({
    displayText: cluster.display_text || "",
    fingerprint: cluster.fingerprint || "",
    frequency: cluster.frequency || 0,
    storyIds: cluster.story_ids || [],
    totalMentions: cluster.total_mentions || 0,
    evidence: cluster.evidence || "",
    variants: (cluster.variants || []).map((variant) => ({
      text: variant.text || "",
      storyId: variant.story_id || "",
      file: variant.file || "",
    })),
  }));
}

export function buildPrincipleAskPrompt(label: string): string {
  return `How does this principle apply to my situation: "${label}"? Can you ground your answer in ${book.storiesPossessivePhrase} and explain which broader themes it reinforces?`;
}

function buildPrincipleSummary(
  label: string,
  storyCount: number,
  relatedThemes: WikiPrincipleTheme[],
  stories: WikiPrincipleStory[]
): string {
  const storyCountText = storyCount === 1 ? "1 story" : `${storyCount} stories`;
  const themeNames = relatedThemes.slice(0, 3).map((theme) => theme.name);
  const storyTitles = stories.slice(0, 3).map((story) => story.title);

  let summary = `This principle appears across ${storyCountText}.`;
  if (themeNames.length > 0) {
    summary += ` It most strongly reinforces themes such as ${summarizeList(themeNames)}.`;
  }
  if (storyTitles.length > 0) {
    summary += ` ${book.storiesPossessivePhrase} show it through ${summarizeList(storyTitles)}.`;
  }
  return summary;
}

function buildWikiPrinciple(
  cluster: ClusteredPrinciple,
  storyMap: Map<string, WikiStory>,
  themeNameBySlug: Map<string, string>
): WikiPrinciple | null {
  const stories = cluster.storyIds
    .map((storyId) => storyMap.get(storyId))
    .filter((story): story is WikiStory => Boolean(story))
    .map((story) => ({
      storyId: story.storyId,
      slug: story.slug,
      title: story.title,
      summary: story.summary,
    }));

  if (stories.length === 0 || !cluster.displayText || !cluster.fingerprint) return null;

  const themeCounts = new Map<string, number>();
  for (const story of cluster.storyIds.map((id) => storyMap.get(id)).filter(Boolean) as WikiStory[]) {
    for (const themeName of story.themes) {
      const slug = slugifyLabel(themeName);
      themeCounts.set(slug, (themeCounts.get(slug) || 0) + 1);
    }
  }

  const relatedThemes = Array.from(themeCounts.entries())
    .map(([slug, count]) => ({
      slug,
      name: themeNameBySlug.get(slug) || slug.replace(/-/g, " "),
      count,
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.name.localeCompare(b.name);
    });

  const variants = cluster.variants
    .map((variant) => {
      const story = storyMap.get(variant.storyId);
      return {
        text: variant.text,
        storyId: variant.storyId,
        storyTitle: story?.title || variant.storyId,
        storySlug: story?.slug || "",
      };
    })
    .filter((variant) => variant.text);

  return {
    id: cluster.fingerprint,
    slug: slugifyLabel(cluster.displayText),
    label: cluster.displayText,
    storyCount: stories.length,
    frequency: cluster.frequency,
    totalMentions: cluster.totalMentions,
    evidence: cluster.evidence,
    stories,
    relatedThemes,
    variants,
    summaryText: buildPrincipleSummary(
      cluster.displayText,
      stories.length,
      relatedThemes,
      stories
    ),
    askPrompt: buildPrincipleAskPrompt(cluster.displayText),
  };
}

export function getAllPrinciples(): WikiPrinciple[] {
  const storyMap = new Map(getAllStories().map((story) => [story.storyId, story]));
  const themeNameBySlug = new Map(
    getAllThemes().map((theme) => [theme.slug, theme.name])
  );

  return getClusteredPrinciples()
    .map((cluster) => buildWikiPrinciple(cluster, storyMap, themeNameBySlug))
    .filter((principle): principle is WikiPrinciple => Boolean(principle))
    .sort((a, b) => {
      if (b.storyCount !== a.storyCount) return b.storyCount - a.storyCount;
      if (b.frequency !== a.frequency) return b.frequency - a.frequency;
      return a.label.localeCompare(b.label);
    });
}

export function getPrincipleBySlug(slug: string): WikiPrinciple | null {
  return getAllPrinciples().find((principle) => principle.slug === slug) || null;
}

function scorePrincipleForDefinition(
  principle: WikiPrinciple,
  definition: CanonicalPrincipleDefinition
): number {
  const haystack = [
    principle.label,
    principle.evidence,
    ...principle.variants.map((variant) => variant.text),
  ]
    .join(" ")
    .toLowerCase();

  let score = 0;
  for (const term of definition.matchTerms) {
    if (haystack.includes(term.toLowerCase())) {
      score += term.length > 10 ? 4 : 2;
    }
  }

  const definitionThemes = new Set(definition.themeSlugs);
  for (const theme of principle.relatedThemes) {
    if (definitionThemes.has(theme.slug)) score += 2;
  }

  const definitionStories = new Set(definition.seedStoryIds);
  for (const story of principle.stories) {
    if (definitionStories.has(story.storyId)) score += 3;
  }

  return score;
}

function statementFromPrinciple(principle: WikiPrinciple): CanonicalPrincipleStatement {
  return {
    id: principle.id,
    slug: principle.slug,
    label: principle.label,
    storyCount: principle.storyCount,
    storyIds: principle.stories.map((story) => story.storyId),
    stories: principle.stories,
    relatedThemes: principle.relatedThemes,
    variants: principle.variants,
    evidence: principle.evidence,
  };
}

function uniqueStories(stories: WikiPrincipleStory[]): WikiPrincipleStory[] {
  const seen = new Set<string>();
  const out: WikiPrincipleStory[] = [];
  for (const story of stories) {
    if (seen.has(story.storyId)) continue;
    seen.add(story.storyId);
    out.push(story);
  }
  return out;
}

function buildCanonicalSummary(
  definition: CanonicalPrincipleDefinition,
  storyCount: number,
  supportingCount: number,
  relatedThemes: WikiPrincipleTheme[]
): string {
  const storyText = storyCount === 1 ? "1 story" : `${storyCount} stories`;
  const statementText =
    supportingCount === 1
      ? "1 supporting statement"
      : `${supportingCount} supporting statements`;
  const themeText = summarizeList(relatedThemes.slice(0, 3).map((theme) => theme.name));
  return `${definition.title} organizes ${statementText} across ${storyText}. It most strongly reinforces ${themeText}.`;
}

export function getAllCanonicalPrinciples(): CanonicalPrinciple[] {
  const rawPrinciples = getAllPrinciples();
  const storyMap = new Map(getAllStories().map((story) => [story.storyId, story]));
  const themeNameBySlug = new Map(
    getAllThemes().map((theme) => [theme.slug, theme.name])
  );
  const assigned = new Map<string, CanonicalPrincipleStatement[]>(
    CANONICAL_PRINCIPLES.map((definition) => [definition.slug, []])
  );

  for (const principle of rawPrinciples) {
    let best: CanonicalPrincipleDefinition | null = null;
    let bestScore = 0;
    for (const definition of CANONICAL_PRINCIPLES) {
      const score = scorePrincipleForDefinition(principle, definition);
      if (score > bestScore) {
        best = definition;
        bestScore = score;
      }
    }
    if (best && bestScore >= 2) {
      assigned.get(best.slug)?.push(statementFromPrinciple(principle));
    }
  }

  return CANONICAL_PRINCIPLES.map((definition) => {
    const supportingStatements = (assigned.get(definition.slug) || []).sort((a, b) => {
      if (b.storyCount !== a.storyCount) return b.storyCount - a.storyCount;
      return a.label.localeCompare(b.label);
    });

    const seedStories = definition.seedStoryIds
      .map((storyId) => storyMap.get(storyId))
      .filter((story): story is WikiStory => Boolean(story))
      .map((story) => ({
        storyId: story.storyId,
        slug: story.slug,
        title: story.title,
        summary: story.summary,
      }));

    const stories = uniqueStories([
      ...supportingStatements.flatMap((statement) => statement.stories),
      ...seedStories,
    ]);

    const themeCounts = new Map<string, number>();
    for (const themeSlug of definition.themeSlugs) themeCounts.set(themeSlug, 0);
    for (const statement of supportingStatements) {
      for (const theme of statement.relatedThemes) {
        if (definition.themeSlugs.includes(theme.slug)) {
          themeCounts.set(theme.slug, (themeCounts.get(theme.slug) || 0) + theme.count);
        }
      }
    }

    const relatedThemes = Array.from(themeCounts.entries())
      .map(([slug, count]) => ({
        slug,
        name: themeNameBySlug.get(slug) || slug.replace(/-/g, " "),
        count,
      }))
      .sort((a, b) => {
        const aIndex = definition.themeSlugs.indexOf(a.slug);
        const bIndex = definition.themeSlugs.indexOf(b.slug);
        return aIndex - bIndex;
      });

    const evidence = Array.from(
      new Set(
        supportingStatements
          .map((statement) => statement.evidence.trim())
          .filter(Boolean)
      )
    ).slice(0, 4);

    return {
      id: definition.slug,
      slug: definition.slug,
      title: definition.title,
      shortTitle: definition.shortTitle,
      thesis: definition.thesis,
      narrative: definition.narrative,
      aiNarrative: definition.aiNarrative || definition.narrative,
      summaryText: buildCanonicalSummary(
        definition,
        stories.length,
        supportingStatements.length,
        relatedThemes
      ),
      askPrompt: buildPrincipleAskPrompt(definition.title),
      relatedThemes,
      supportingStatements,
      stories,
      evidence,
    };
  });
}

export function getCanonicalPrincipleBySlug(slug: string): CanonicalPrinciple | null {
  return (
    getAllCanonicalPrinciples().find((principle) => principle.slug === slug) ||
    null
  );
}

// --- People ---

export type PersonTier = "A" | "B" | "C" | "D";

export type AiDraftStatus = "none" | "draft" | "reviewed";

export interface WikiEntityRelation {
  sourceType: string;
  sourceSlug: string;
  predicate: string;
  targetType: string;
  targetSlug: string;
}

export interface WikiPerson {
  slug: string;
  name: string;
  tiers: PersonTier[];
  memoirStoryIds: string[];
  interviewStoryIds: string[];
  note: string;
  body: string;
  aiDraft: string;
  aiDraftStatus: AiDraftStatus;
  aiDraftGeneratedAt: string;
  /** Which wiki directory this row was loaded from (characters override people on slug clash). */
  wikiSource: "people" | "characters";
  /** Optional Phase 5 foundational lore / provenance block from wiki. */
  lore?: WikiEntityLoreMetadata;
  /** Optional Phase 5 foundational dossier block (Role / Profile / Character Arc). */
  dossier?: CharacterDossier;
  /** Canon-seeded dossier block (aliases, narrative prose, related slugs, sources). */
  canonDossier?: CanonDossier;
}

export type FictionNounEntityType =
  | "fiction_characters"
  | "fiction_artifacts"
  | "fiction_locations"
  | "fiction_factions"
  | "fiction_vaults";

export interface WikiFictionNounEntity {
  kind: "fiction_noun";
  entityType: FictionNounEntityType;
  slug: string;
  name: string;
  tiers: PersonTier[];
  memoirStoryIds: string[];
  interviewStoryIds: string[];
  note: string;
  body: string;
  aiDraft: string;
  aiDraftStatus: AiDraftStatus;
  aiDraftGeneratedAt: string;
  relations: WikiEntityRelation[];
  lore?: WikiEntityLoreMetadata;
  dossier?: CharacterDossier;
  /** Canon-seeded dossier block (aliases, narrative prose, related slugs, sources). */
  canonDossier?: CanonDossier;
}

export interface WikiRuleConcept {
  kind: "rule_concept";
  slug: string;
  title: string;
  thesis: string;
  examples: string[];
  exceptions: string[];
  relatedRules: string[];
  note: string;
  body: string;
  relations: WikiEntityRelation[];
  lore?: WikiEntityLoreMetadata;
  /** Canon-seeded dossier block (aliases, narrative prose, related slugs, sources). */
  canonDossier?: CanonDossier;
}

function getLegacyPersonFromFile(filename: string): WikiPerson | null {
  const content = readWikiFile(`people/${filename}`);
  return content
    ? parseWikiNounMarkdown(content, LEGACY_PEOPLE_NOUN, filename)
    : null;
}

function getCharacterFromFile(filename: string): WikiPerson | null {
  const content = readWikiFile(`characters/${filename}`);
  return content
    ? parseWikiNounMarkdown(content, FICTION_CHARACTERS_NOUN, filename)
    : null;
}

export function getAllPeople(): WikiPerson[] {
  const bySlug = new Map<string, WikiPerson>();

  const mergeDir = (
    subdir: "people" | "characters",
    loader: (filename: string) => WikiPerson | null
  ) => {
    const dir = path.join(WIKI_DIR, subdir);
    if (!fs.existsSync(dir)) return;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".md"))) {
      const row = loader(f);
      if (row) bySlug.set(row.slug, row);
    }
  };

  mergeDir("people", getLegacyPersonFromFile);
  mergeDir("characters", getCharacterFromFile);

  return [...bySlug.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function getPersonBySlug(slug: string): WikiPerson | null {
  const characterPath = path.join(WIKI_DIR, "characters", `${slug}.md`);
  if (fs.existsSync(characterPath)) {
    return getCharacterFromFile(`${slug}.md`);
  }
  const peoplePath = path.join(WIKI_DIR, "people", `${slug}.md`);
  if (fs.existsSync(peoplePath)) {
    return getLegacyPersonFromFile(`${slug}.md`);
  }
  return null;
}

export function getPeopleByStoryId(storyId: string): WikiPerson[] {
  return getAllPeople().filter(
    (p) => p.memoirStoryIds.includes(storyId) || p.interviewStoryIds.includes(storyId)
  );
}

function getFictionNounFromFile(
  filename: string,
  subdir: "characters" | "artifacts" | "locations" | "factions" | "vaults",
  entityType: FictionNounEntityType
): WikiFictionNounEntity | null {
  const content = readWikiFile(`${subdir}/${filename}`);
  if (!content) return null;
  const config =
    entityType === "fiction_characters"
      ? FICTION_CHARACTERS_NOUN
      : entityType === "fiction_artifacts"
        ? FICTION_ARTIFACTS_NOUN
        : entityType === "fiction_locations"
          ? FICTION_LOCATIONS_NOUN
          : entityType === "fiction_factions"
            ? FICTION_FACTIONS_NOUN
            : FICTION_VAULTS_NOUN;
  const parsed = parseWikiFictionNounMarkdown(
    content,
    config as Parameters<typeof parseWikiFictionNounMarkdown>[1],
    filename
  );
  if (!parsed) return null;
  return { ...parsed, entityType };
}

function getFictionNounEntities(
  subdir: "characters" | "artifacts" | "locations" | "factions" | "vaults",
  entityType: FictionNounEntityType
): WikiFictionNounEntity[] {
  const dir = path.join(WIKI_DIR, subdir);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => getFictionNounFromFile(f, subdir, entityType))
    .filter(Boolean)
    .sort((a, b) => a!.name.localeCompare(b!.name)) as WikiFictionNounEntity[];
}

export function getAllCharacters(): WikiFictionNounEntity[] {
  return getFictionNounEntities("characters", "fiction_characters");
}

export function getCharacterBySlug(slug: string): WikiFictionNounEntity | null {
  const file = path.join(WIKI_DIR, "characters", `${slug}.md`);
  if (!fs.existsSync(file)) return null;
  return getFictionNounFromFile(`${slug}.md`, "characters", "fiction_characters");
}

export function getAllArtifacts(): WikiFictionNounEntity[] {
  return getFictionNounEntities("artifacts", "fiction_artifacts");
}

export function getArtifactBySlug(slug: string): WikiFictionNounEntity | null {
  const file = path.join(WIKI_DIR, "artifacts", `${slug}.md`);
  if (!fs.existsSync(file)) return null;
  return getFictionNounFromFile(`${slug}.md`, "artifacts", "fiction_artifacts");
}

export function getAllLocations(): WikiFictionNounEntity[] {
  return getFictionNounEntities("locations", "fiction_locations");
}

export function getLocationBySlug(slug: string): WikiFictionNounEntity | null {
  const file = path.join(WIKI_DIR, "locations", `${slug}.md`);
  if (!fs.existsSync(file)) return null;
  return getFictionNounFromFile(`${slug}.md`, "locations", "fiction_locations");
}

export function getAllFactions(): WikiFictionNounEntity[] {
  return getFictionNounEntities("factions", "fiction_factions");
}

export function getFactionBySlug(slug: string): WikiFictionNounEntity | null {
  const file = path.join(WIKI_DIR, "factions", `${slug}.md`);
  if (!fs.existsSync(file)) return null;
  return getFictionNounFromFile(`${slug}.md`, "factions", "fiction_factions");
}

export function getAllVaults(): WikiFictionNounEntity[] {
  return getFictionNounEntities("vaults", "fiction_vaults");
}

export function getVaultBySlug(slug: string): WikiFictionNounEntity | null {
  const file = path.join(WIKI_DIR, "vaults", `${slug}.md`);
  if (!fs.existsSync(file)) return null;
  return getFictionNounFromFile(`${slug}.md`, "vaults", "fiction_vaults");
}

function getRuleFromFile(filename: string): WikiRuleConcept | null {
  const content = readWikiFile(`rules/${filename}`);
  return content
    ? parseWikiRuleConceptMarkdown(content, FICTION_RULES_CONCEPT, filename)
    : null;
}

export function getAllRules(): WikiRuleConcept[] {
  const dir = path.join(WIKI_DIR, "rules");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => getRuleFromFile(f))
    .filter(Boolean)
    .sort((a, b) => a!.title.localeCompare(b!.title)) as WikiRuleConcept[];
}

export function getRuleBySlug(slug: string): WikiRuleConcept | null {
  const p = path.join(WIKI_DIR, "rules", `${slug}.md`);
  if (!fs.existsSync(p)) return null;
  return getRuleFromFile(`${slug}.md`);
}
