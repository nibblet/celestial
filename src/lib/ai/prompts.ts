import * as fs from "fs";
import * as path from "path";
import type { AgeMode } from "@/types";
import { book } from "@/config/book";
import type { ReaderProgress } from "@/lib/progress/reader-progress";
import { getJourneyBySlug } from "@/lib/wiki/journeys";
import {
  getAllCanonicalPrinciples,
  getAllStories,
  getStoryById,
} from "@/lib/wiki/parser";

const WIKI_DIR = path.join(process.cwd(), "content/wiki");

let cachedWikiSummaries: string | null = null;
let cachedVoiceGuide: string | null = null;
let cachedStoryLinkCatalog: string | null = null;
let cachedDecisionFrameworks: string | null = null;
let cachedPeopleContext: string | null = null;
let cachedPrinciplesContext: string | null = null;
let loggedSystemPromptApproxTokens = false;

/** Inventory line lists tiers like "(tiers: A, B, D)" — Tier A bios are richest. */
function peoplePageHasTierA(markdown: string): boolean {
  const m = markdown.match(/Inventory entry\s*\(tiers:\s*([^)]+)\)/i);
  if (!m) return false;
  return /\bA\b/.test(m[1]);
}

function collectPeopleBioEntries(tierAOnly: boolean): string[] {
  const peopleDir = path.join(WIKI_DIR, "people");
  if (!fs.existsSync(peopleDir)) return [];

  const entries: string[] = [];
  const files = fs.readdirSync(peopleDir).filter((f) => f.endsWith(".md"));

  for (const file of files) {
    const content = fs.readFileSync(path.join(peopleDir, file), "utf-8");
    if (tierAOnly && !peoplePageHasTierA(content)) continue;

    const draftMatch = content.match(
      /<!-- ai-draft:start[^>]*-->([\s\S]*?)<!-- ai-draft:end -->/
    );
    if (!draftMatch) continue;
    const bio = draftMatch[1].trim();
    if (!bio) continue;
    entries.push(bio);
  }
  return entries;
}

/**
 * AI-draft bios from `content/wiki/people/*.md` (between <!-- ai-draft --> markers).
 * If the combined text exceeds ~14k characters, only inventory Tier A pages are included.
 */
export function getPeopleContext(): string {
  if (cachedPeopleContext !== null) return cachedPeopleContext;

  let entries = collectPeopleBioEntries(false);
  const joined = entries.join("\n\n---\n\n");
  const maxChars = 14_000;
  if (joined.length > maxChars) {
    entries = collectPeopleBioEntries(true);
  }

  const ageModeHint = `When discussing people from the list below, adapt biographical detail to the age mode:
- young_reader: simple, warm language; one clear idea.
- teen: brief factual bio plus one vivid detail they can relate to.
- adult: full context as written below (quotes and specifics when relevant).`;

  cachedPeopleContext =
    entries.length > 0
      ? `## Key figures in ${book.title}\n\n${ageModeHint}\n\n${entries.join("\n\n---\n\n")}`
      : "";

  return cachedPeopleContext;
}

function getPrinciplesContext(): string {
  if (cachedPrinciplesContext) return cachedPrinciplesContext;

  const principles = getAllCanonicalPrinciples();
  const lines = [
    `## Core principles (${principles.length})`,
    "",
    `These recurring patterns emerge across ${book.storiesPossessivePhrase}:`,
    "",
  ];

  for (const p of principles) {
    lines.push(`**${p.title}** — ${p.thesis}`);
    if (p.stories.length > 0) {
      const storyTitles = p.stories
        .slice(0, 3)
        .map((s) => s.title)
        .join("; ");
      lines.push(`  *Seen in: ${storyTitles}*`);
    }
  }

  cachedPrinciplesContext = lines.join("\n");
  return cachedPrinciplesContext;
}

export function getStoryLinkCatalog(): string {
  if (cachedStoryLinkCatalog) return cachedStoryLinkCatalog;
  cachedStoryLinkCatalog = getAllStories()
    .map((s) => `- ${s.storyId} — ${s.title}`)
    .join("\n");
  return cachedStoryLinkCatalog;
}

export function getWikiSummaries(): string {
  if (cachedWikiSummaries) return cachedWikiSummaries;
  const indexPath = path.join(process.cwd(), book.wikiIndexRelativePath);
  cachedWikiSummaries = fs.existsSync(indexPath)
    ? fs.readFileSync(indexPath, "utf-8")
    : "";
  return cachedWikiSummaries;
}

export function getVoiceGuide(): string {
  if (cachedVoiceGuide) return cachedVoiceGuide;
  const voicePath = path.join(process.cwd(), book.voiceGuideRelativePath);
  cachedVoiceGuide = fs.existsSync(voicePath)
    ? fs.readFileSync(voicePath, "utf-8")
    : "";
  return cachedVoiceGuide;
}

export function getDecisionFrameworks(): string {
  if (cachedDecisionFrameworks) return cachedDecisionFrameworks;
  const fwPath = path.join(process.cwd(), book.decisionFrameworksRelativePath);
  cachedDecisionFrameworks = fs.existsSync(fwPath)
    ? fs.readFileSync(fwPath, "utf-8")
    : "";
  return cachedDecisionFrameworks;
}

export function getStoryContext(storyId: string): string {
  const dir = path.join(WIKI_DIR, "stories");
  if (!fs.existsSync(dir)) return "";
  const file = fs.readdirSync(dir).find((f) => f.startsWith(storyId));
  if (!file) return "";
  return fs.readFileSync(path.join(dir, file), "utf-8");
}

export function getJourneyContextForPrompt(journeySlug: string): string {
  const journey = getJourneyBySlug(journeySlug);
  if (!journey) return "";
  const lines = [
    `The user is asking in the context of the guided journey "${journey.title}".`,
    journey.description,
    "",
    "Stories in this journey (in order):",
  ];
  for (const id of journey.storyIds) {
    const s = getStoryById(id);
    if (s) lines.push(`- ${s.title} (${id}): ${s.summary}`);
    else lines.push(`- ${id}`);
  }
  return lines.join("\n");
}

export const AGE_MODE_INSTRUCTIONS: Record<AgeMode, string> = {
  young_reader: `The user is a young reader (ages 3-10). Use very simple language. Give short answers.
Focus on one story and one clear lesson. Avoid complex vocabulary. Be warm and encouraging.`,
  teen: `The user is a teenager (ages 11-17). Explain stories clearly and connect lessons to
school, work, friendships, and decisions they might face. Use relatable examples. Moderate depth.`,
  adult: `The user is an adult reader. You may reference multiple stories, principles,
heuristics, quotes, and timeline events. Provide deeper interpretation and nuanced application.`,
};

/**
 * Optional: call with published Supabase stories to include them in the prompt.
 * Pass an empty array if you don't want to include them.
 */
export function buildSystemPrompt(
  ageMode: AgeMode,
  storySlug?: string,
  journeySlug?: string,
  publishedStorySummaries?: string,
  canonicalWikiSummaries?: string,
  canonicalStoryCatalog?: string,
  canonicalStoryContext?: string,
  readerProgress?: ReaderProgress
): string {
  const voice = getVoiceGuide();
  const wikiIndex = canonicalWikiSummaries ?? getWikiSummaries();
  const peopleContext = getPeopleContext();
  const principlesContext = getPrinciplesContext();
  const storyContext = canonicalStoryContext ?? (storySlug ? getStoryContext(storySlug) : "");
  const journeyContext = journeySlug
    ? getJourneyContextForPrompt(journeySlug)
    : "";

  const catalog = canonicalStoryCatalog ?? getStoryLinkCatalog();

  const prompt = `You are a reading companion for "${book.title}" by ${book.author}.
${book.description}

You help readers explore ${book.shortName} using only the curated materials below (wiki index, principles, optional character notes, timelines, and story catalog).

## Your Role
You do NOT pretend to be the author or the in-world narrator addressing the reader as themselves.
Instead you cite scenes, summaries, and structured lore from this companion app.

Use phrases like:
- "In the book…"
- "In one of the stories…"
- "The text suggests…"
- "According to the timeline…"

Never say "I remember" as if you lived the plot.

## Age Mode
${AGE_MODE_INSTRUCTIONS[ageMode]}

## Response Patterns

For ADVICE or GUIDANCE questions, follow: Story → Lesson → Application
1. Identify the most relevant story or lore entry
2. Briefly reference/summarize it
3. Extract the principle or rule
4. Apply it carefully to the reader's situation (without spoilers outside their progress when progress rules apply)

For FACTUAL questions, answer directly with citations to story IDs from the catalog.
For EXPLORATORY questions, suggest relevant readings from the catalog.
For LISTS, return a curated list with brief summaries.

## Sources
Story IDs and titles appear in the catalog below. Primary fiction uses chapter IDs such as \`CH01\`, \`CH02\`, etc. (${book.chapterIdPatternNote}).

Supplemental catalog rows (legacy interview IDs, expansions, or imports) appear with their own IDs when present alongside Book I chapters.

Always prefer materials listed in the wiki index and catalog over speculation.

## Rules
- ALWAYS ground responses in actual stories and principles present in the catalog or wiki index.
- NEVER invent chapters, quotations, or plot events.
- When you name a specific story, make the title a **markdown link** using the pattern \`[Exact title](/stories/<story id>)\` with IDs from the catalog below.
- If the corpus does not cover a topic, say so plainly.
- Be warm and precise — not performative.
${readerProgress ? `- Reader progress gate: current chapter is ${readerProgress.currentChapter}. Do not reveal events, entities, outcomes, or mission logs from later chapters even if directly asked.` : ""}

## Story ID catalog (for links)
${catalog}

## Voice Guide
${voice.slice(0, 2000)}

## Wiki Index (available curated content)
${wikiIndex}

${peopleContext ? `\n${peopleContext}\n` : ""}
${principlesContext ? `\n${principlesContext}\n` : ""}

## Lore rules / frameworks
${getDecisionFrameworks().slice(0, 2000)}

${publishedStorySummaries ? `## Additional published expansions\n${publishedStorySummaries}` : ""}

${journeyContext ? `## Guided journey context\n${journeyContext}\n` : ""}
${storyContext ? `## Currently reading\nThe user is viewing this story:\n\n${storyContext.slice(0, 3000)}` : ""}`;

  if (process.env.NODE_ENV === "development" && !loggedSystemPromptApproxTokens) {
    loggedSystemPromptApproxTokens = true;
    console.log(
      "[ask] system prompt approx tokens:",
      Math.round(prompt.length / 4)
    );
  }

  return prompt;
}
