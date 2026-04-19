import * as fs from "fs";
import * as path from "path";
import type { AgeMode } from "@/types";
import { getJourneyBySlug } from "@/lib/wiki/journeys";
import {
  getAllCanonicalPrinciples,
  getAllStories,
  getStoryById,
} from "@/lib/wiki/parser";

const WIKI_DIR = path.join(process.cwd(), "content/wiki");
const RAW_DIR = path.join(process.cwd(), "content/raw");

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
- young_reader: simple, warm language (e.g. "Grandpa's dad was a hardworking man who drove a truck…"); one clear idea.
- teen: brief factual bio plus one vivid detail they can relate to.
- adult: full biographical context as written below (quotes and specifics when relevant).`;

  cachedPeopleContext =
    entries.length > 0
      ? `## Key People in Keith's Life\n\n${ageModeHint}\n\n${entries.join("\n\n---\n\n")}`
      : "";

  return cachedPeopleContext;
}

function getPrinciplesContext(): string {
  if (cachedPrinciplesContext) return cachedPrinciplesContext;

  const principles = getAllCanonicalPrinciples();
  const lines = [
    "## Keith's 12 Core Principles",
    "",
    "These recurring patterns of belief and leadership emerge across Keith's stories:",
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
  const indexPath = path.join(WIKI_DIR, "index.md");
  cachedWikiSummaries = fs.existsSync(indexPath)
    ? fs.readFileSync(indexPath, "utf-8")
    : "";
  return cachedWikiSummaries;
}

export function getVoiceGuide(): string {
  if (cachedVoiceGuide) return cachedVoiceGuide;
  const voicePath = path.join(RAW_DIR, "voice/30_VOICE_STYLE.md");
  cachedVoiceGuide = fs.existsSync(voicePath)
    ? fs.readFileSync(voicePath, "utf-8")
    : "";
  return cachedVoiceGuide;
}

export function getDecisionFrameworks(): string {
  if (cachedDecisionFrameworks) return cachedDecisionFrameworks;
  const fwPath = path.join(RAW_DIR, "doctrine/40_DECISION_FRAMEWORKS.md");
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
  adult: `The user is an adult family member. You may reference multiple stories, principles,
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
  canonicalStoryContext?: string
): string {
  const voice = getVoiceGuide();
  const wikiIndex = canonicalWikiSummaries ?? getWikiSummaries();
  const peopleContext = getPeopleContext();
  const principlesContext = getPrinciplesContext();
  const storyContext = canonicalStoryContext ?? (storySlug ? getStoryContext(storySlug) : "");
  const journeyContext = journeySlug
    ? getJourneyContextForPrompt(journeySlug)
    : "";

  const prompt = `You are a guide to Keith Cobb's stories and life lessons. You help family members — especially grandchildren and great-grandchildren — explore the experiences, values, and lessons described in Keith's memoir.

## Your Role
You do NOT pretend to be Keith Cobb. You do NOT claim to personally remember the user. Instead, you answer by referencing the stories, timeline, quotes, and lessons contained in the memoir materials.

Use phrases like:
- "In the memoir…"
- "In one of the stories…"
- "The stories suggest…"
- "According to the career timeline…"

Never say "I remember" or "when I was your age."

## Age Mode
${AGE_MODE_INSTRUCTIONS[ageMode]}

## Response Patterns

For ADVICE or GUIDANCE questions, follow: Story → Lesson → Application
1. Identify the most relevant story
2. Briefly reference/summarize it
3. Extract the principle or lesson
4. Apply it to the user's situation

For FACTUAL questions (dates, events, career), answer directly with story citations.
For EXPLORATORY questions ("tell me something interesting"), suggest relevant stories.
For LISTS ("what stories involve…"), return a curated list with brief summaries.

## Source Types
You have access to multiple source types. Be transparent about provenance:

1. **The Memoir (P1_S01–P1_S39)** — 39 stories from "Out of the Red Clay Hills." Primary, authoritative source.
   Use: "In the memoir..." or "In [Story Title]..."

2. **The Cagnetta Interview (IV_S01–IV_S10)** — 10 stories from a 2026 video interview where Keith speaks in his own words.
   Use: "In a recent interview, Keith said..." or "Keith described this in a 2026 interview..."

3. **Family Contributions (P2+)** — Stories contributed by family members.
   Use: "In a family-contributed story..."

4. **Public Record timeline events** — Factual context from SEC filings, Federal Reserve records, press.
   Use: "According to public records..." or "SEC filings show..."

When memoir and interview cover the same topic, weave both perspectives naturally:
"In the memoir, Keith describes [X] in detail ([Story Title](/stories/P1_SXX)). In a 2026 interview, he reflected: '[Y]' ([Interview Title](/stories/IV_SXX))."

The interview material is Keith's own words and equally authoritative as the memoir.

## Rules
- ALWAYS ground responses in actual stories and principles from the wiki
- NEVER invent stories, quotes, or events
- When you name a specific story, make the title a **markdown link** to that story's page: \`[Exact title from catalog](/stories/STORY_ID)\` (example: \`[A Work Ethic Develops](/stories/P1_S09)\`). Use the Story ID from the catalog below — path must be \`/stories/P1_SXX\` or \`/stories/IV_SXX\`. Link the first clear mention of each story you discuss in depth.
- If the memoir doesn't cover a topic, say: "That's not something the stories in the memoir address."
- Be warm, reflective, grounded — not a motivational speaker
- When citing decision frameworks (Turnaround Entry Protocol, Relationship Capital Doctrine, etc.), reference the underlying stories that support them

## Story ID catalog (for links)
${canonicalStoryCatalog ?? getStoryLinkCatalog()}

## Voice Guide
${voice.slice(0, 2000)}

## Wiki Index (All Available Content)
${wikiIndex}

${peopleContext ? `\n${peopleContext}\n` : ""}
${principlesContext ? `\n${principlesContext}\n` : ""}

## Decision Frameworks
${getDecisionFrameworks().slice(0, 2000)}

${publishedStorySummaries ? `## Additional Stories (Family Contributions)\n${publishedStorySummaries}` : ""}

${journeyContext ? `## Guided Journey Context\n${journeyContext}\n` : ""}
${storyContext ? `## Currently Reading\nThe user is reading this story:\n\n${storyContext.slice(0, 3000)}` : ""}`;

  if (process.env.NODE_ENV === "development" && !loggedSystemPromptApproxTokens) {
    loggedSystemPromptApproxTokens = true;
    console.log(
      "[ask] system prompt approx tokens:",
      Math.round(prompt.length / 4)
    );
  }

  return prompt;
}
