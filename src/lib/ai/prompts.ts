import * as fs from "fs";
import * as path from "path";
import type { AgeMode } from "@/types";
import { getJourneyBySlug } from "@/lib/wiki/journeys";
import { getAllStories, getStoryById } from "@/lib/wiki/parser";

const WIKI_DIR = path.join(process.cwd(), "content/wiki");
const RAW_DIR = path.join(process.cwd(), "content/raw");

let cachedWikiSummaries: string | null = null;
let cachedVoiceGuide: string | null = null;
let cachedStoryLinkCatalog: string | null = null;

function getStoryLinkCatalog(): string {
  if (cachedStoryLinkCatalog) return cachedStoryLinkCatalog;
  cachedStoryLinkCatalog = getAllStories()
    .map((s) => `- ${s.storyId} — ${s.title}`)
    .join("\n");
  return cachedStoryLinkCatalog;
}

function getWikiSummaries(): string {
  if (cachedWikiSummaries) return cachedWikiSummaries;
  const indexPath = path.join(WIKI_DIR, "index.md");
  cachedWikiSummaries = fs.existsSync(indexPath)
    ? fs.readFileSync(indexPath, "utf-8")
    : "";
  return cachedWikiSummaries;
}

function getVoiceGuide(): string {
  if (cachedVoiceGuide) return cachedVoiceGuide;
  const voicePath = path.join(RAW_DIR, "voice/30_VOICE_STYLE.md");
  cachedVoiceGuide = fs.existsSync(voicePath)
    ? fs.readFileSync(voicePath, "utf-8")
    : "";
  return cachedVoiceGuide;
}

function getStoryContext(storyId: string): string {
  const dir = path.join(WIKI_DIR, "stories");
  if (!fs.existsSync(dir)) return "";
  const file = fs.readdirSync(dir).find((f) => f.startsWith(storyId));
  if (!file) return "";
  return fs.readFileSync(path.join(dir, file), "utf-8");
}

function getJourneyContextForPrompt(journeySlug: string): string {
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

const AGE_MODE_INSTRUCTIONS: Record<AgeMode, string> = {
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
  publishedStorySummaries?: string
): string {
  const voice = getVoiceGuide();
  const wikiIndex = getWikiSummaries();
  const storyContext = storySlug ? getStoryContext(storySlug) : "";
  const journeyContext = journeySlug
    ? getJourneyContextForPrompt(journeySlug)
    : "";

  return `You are a guide to Keith Cobb's stories and life lessons. You help family members — especially grandchildren and great-grandchildren — explore the experiences, values, and lessons described in Keith's memoir.

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

## Rules
- ALWAYS ground responses in actual stories and principles from the wiki
- NEVER invent stories, quotes, or events
- When you name a specific story, make the title a **markdown link** to that story's page: \`[Exact title from catalog](/stories/STORY_ID)\` (example: \`[A Work Ethic Develops](/stories/P1_S09)\`). Use the Story ID from the catalog below — path must be \`/stories/P1_SXX\` only. Link the first clear mention of each story you discuss in depth.
- If the memoir doesn't cover a topic, say: "That's not something the stories in the memoir address."
- Be warm, reflective, grounded — not a motivational speaker

## Story ID catalog (for links)
${getStoryLinkCatalog()}

## Voice Guide
${voice.slice(0, 2000)}

## Wiki Index (All Available Content)
${wikiIndex}

${publishedStorySummaries ? `## Additional Stories (Family Contributions)\n${publishedStorySummaries}` : ""}

${journeyContext ? `## Guided Journey Context\n${journeyContext}\n` : ""}
${storyContext ? `## Currently Reading\nThe user is reading this story:\n\n${storyContext.slice(0, 3000)}` : ""}`;
}
