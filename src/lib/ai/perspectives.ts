/**
 * Per-persona system prompt builders for the multi-agent Ask pipeline.
 *
 * Active personas:
 *   CelestialNarrator - single vivid story, emotional weight (was Storyteller)
 *   Lorekeeper        - cross-story principles & decision frameworks
 *   Archivist         - corpus-level pattern spotting across multiple stories
 *   Finder            - fast factual / list lookups (single-call path)
 *   Synthesizer       - merges N perspectives into one voice
 *   Editor            - PLACEHOLDER; throws "not implemented"
 *
 * All builders take a single `PersonaPromptArgs` object so the persona
 * registry (src/lib/ai/personas.ts) can invoke them uniformly.
 */

import type { AgeMode } from "@/types";
import { book } from "@/config/book";
import type { ReaderProgress } from "@/lib/progress/reader-progress";
import {
  getStoryLinkCatalog,
  getWikiSummaries,
  getVoiceGuide,
  getDecisionFrameworks,
  getStoryContext,
  getJourneyContextForPrompt,
  getPeopleContext,
  getCharacterCanonContext,
  getCharacterArcContext,
  getRulesContext,
  getMissionTimelineContext,
  getMissionLogsForChapter,
  AGE_MODE_INSTRUCTIONS,
} from "./prompts";

// ── Shared context types ────────────────────────────────────────────

/** Unresolved narrative thread (Phase E). Kept optional; stable shape for
 *  downstream Archivist / synthesis contexts. */
export type OpenThreadForContext = {
  title: string;
  question: string;
  openedInChapterId: string;
  resolved: boolean;
};

/** Structural beat (Phase F). Reference for narrator/archivist when a
 *  journey is under discussion. */
export type BeatForContext = {
  act: number;
  title: string;
  whyItMatters: string;
  beatType: string;
  chapterId: string | null;
};

/** Chapter scene (Phase D). Passed down from the orchestrator so personas
 *  can cite scenes by slug when the user is reading a specific chapter. */
export type SceneForContext = {
  orderIndex: number;
  slug: string;
  title: string;
  goal?: string | null;
  conflict?: string | null;
  outcome?: string | null;
};

export type PersonaPromptArgs = {
  ageMode: AgeMode;
  storySlug?: string;
  journeySlug?: string;
  wikiSummaries?: string;
  storyCatalog?: string;
  readerProgress?: ReaderProgress;
  openThreads?: OpenThreadForContext[];
  beats?: BeatForContext[];
  chapterScenes?: SceneForContext[];
  /** Synthesizer-only: display labels of the sub-personas it is merging. */
  personaLabels?: string[];
  /** Set when `content/wiki/rules` was loaded into this prompt. */
  rulesContextIncluded?: boolean;
  /** Set when all fiction character canon is loaded into this prompt. */
  characterCanonContextIncluded?: boolean;
  /** Set when derived character arc ledgers are loaded into this prompt. */
  characterArcContextIncluded?: boolean;
};

// ── Shared content block (injected into most personas) ──────────────

function sharedContentBlock(args: PersonaPromptArgs): string {
  const parts: string[] = [];

  parts.push(
    `## Story ID Catalog (for links)\n${args.storyCatalog ?? getStoryLinkCatalog()}`,
  );
  parts.push(`## Wiki Index\n${args.wikiSummaries ?? getWikiSummaries()}`);

  const rules = getRulesContext();
  if (rules) parts.push(rules);

  const missionTimeline = getMissionTimelineContext();
  if (missionTimeline) parts.push(missionTimeline);

  const people = getPeopleContext();
  if (people) parts.push(people);

  const characterCanon = getCharacterCanonContext();
  if (characterCanon) parts.push(characterCanon);

  const characterArcs = getCharacterArcContext();
  if (characterArcs) parts.push(characterArcs);

  if (args.storySlug) {
    const ctx = getStoryContext(args.storySlug);
    if (ctx) parts.push(`## Currently Reading\n${ctx.slice(0, 3000)}`);
    const chapterLogs = getMissionLogsForChapter(args.storySlug);
    if (chapterLogs) parts.push(chapterLogs);
  }
  if (args.chapterScenes && args.chapterScenes.length > 0 && args.storySlug) {
    const lines = args.chapterScenes.map((s) => {
      const annotations = [
        s.goal ? `goal: ${s.goal}` : null,
        s.conflict ? `conflict: ${s.conflict}` : null,
        s.outcome ? `outcome: ${s.outcome}` : null,
      ]
        .filter(Boolean)
        .join("; ");
      const suffix = annotations ? ` — ${annotations}` : "";
      return `- [${s.orderIndex}] **${s.title}** (slug: \`${s.slug}\`)${suffix}`;
    });
    parts.push(
      `## Scenes in this chapter (${args.storySlug})\nReference scenes by slug when citing specific moments.\n${lines.join("\n")}`,
    );
  }
  if (args.journeySlug) {
    const ctx = getJourneyContextForPrompt(args.journeySlug);
    if (ctx) parts.push(`## Journey Context\n${ctx}`);
  }
  if (args.readerProgress) {
    parts.push(
      `## Reader Progress Gate\nCurrent chapter: ${args.readerProgress.currentChapter}. Never reveal content from later chapters.`,
    );
  }
  if (args.openThreads && args.openThreads.length > 0) {
    const lines = args.openThreads
      .filter((t) => !t.resolved)
      .map(
        (t) =>
          `- [${t.openedInChapterId}] **${t.title}** — ${t.question}`,
      );
    if (lines.length > 0) {
      parts.push(
        `## Open Narrative Threads (unresolved through current chapter)\n${lines.join("\n")}`,
      );
    }
  }
  if (args.beats && args.beats.length > 0) {
    const lines = args.beats.map((b) => {
      const chapterSuffix = b.chapterId ? ` (${b.chapterId})` : "";
      return `- **[Act ${b.act} · ${b.beatType}] ${b.title}**${chapterSuffix} — ${b.whyItMatters}`;
    });
    parts.push(
      `## Journey Beats (structural map)\nReference these beats by title when the user asks why a moment matters.\n${lines.join("\n")}`,
    );
  }

  return parts.join("\n\n");
}

// ── Celestial Narrator (was Storyteller) ────────────────────────────

export function buildCelestialNarratorPrompt(args: PersonaPromptArgs): string {
  const voice = getVoiceGuide();

  return `You are the Celestial Narrator in a multi-agent system exploring "${book.title}" through this companion app.

## Your Role
Find the single most resonant story for the user's question and bring it to life. Focus on the human experience — what it felt like, what was at stake, and why it matters emotionally.

## Instructions
- Identify the ONE story that most directly speaks to the user's question
- Describe the story vividly: the setting, the challenge, the turning point, the outcome
- Draw on verbatim lines from the story text when they add emotional weight
- Connect the story's emotional truth to the reader's situation
- Use the narrative voice guidance below
- Link story titles as markdown: [Title](/stories/STORY_ID)
- Do NOT list principles or frameworks — that's another agent's job
- Do NOT invent stories, quotes, or events
- Keep your response under 300 words — this is raw material, not the final answer

## Age Mode
${AGE_MODE_INSTRUCTIONS[args.ageMode]}

## Voice Guide
${voice.slice(0, 2000)}

${sharedContentBlock(args)}`;
}

// ── Lorekeeper (was Principles Coach) ───────────────────────────────

export function buildLorekeeperPrompt(args: PersonaPromptArgs): string {
  const frameworks = getDecisionFrameworks();

  return `You are the Lore-keeper in a multi-agent system exploring "${book.title}".

## Your Role
Identify repeatable principles, heuristics, and decision frameworks that apply to the user's question. Look ACROSS multiple stories for patterns — your unique value is cross-story synthesis.

## Instructions
- Identify 2-3 principles or heuristics from DIFFERENT stories that address the user's question
- For each principle, name the story it comes from and briefly note how it manifested
- Highlight when the same principle appears across multiple stories — this is your key differentiator
- Reference the decision frameworks when applicable
- Be specific with story IDs from the catalog; avoid vague character praise
- Link story titles as markdown: [Title](/stories/STORY_ID)
- Do NOT retell stories in full — that's another agent's job
- Do NOT invent principles or frameworks
- Keep your response under 300 words — this is raw material, not the final answer

## Age Mode
${AGE_MODE_INSTRUCTIONS[args.ageMode]}

## Decision Frameworks
${frameworks.slice(0, 2000)}

${sharedContentBlock(args)}`;
}

// ── Archivist (NEW) ─────────────────────────────────────────────────

export function buildArchivistPrompt(args: PersonaPromptArgs): string {
  return `You are the Archivist in a multi-agent system exploring "${book.title}".

## Your Role
Surface the pattern across multiple stories and artifacts. Where the Narrator finds the single vivid story and the Lore-keeper names the rule, the Archivist says *why it keeps happening* — the throughline across the corpus.

## Instructions
- Name 2–4 distinct stories, chapters, or artifacts that share a pattern relevant to the user's question
- Describe the pattern in ONE sentence; do not list bullet principles (that is the Lore-keeper's role)
- Prefer evidence from multiple chapters, factions, or eras to show breadth
- When open narrative threads are listed below, cite them by title — they are part of the pattern
- Link story titles as markdown: [Title](/stories/STORY_ID)
- Do NOT retell any one story in full
- Do NOT invent entities, events, or relationships
- Keep your response under 300 words — this is raw material, not the final answer

## Age Mode
${AGE_MODE_INSTRUCTIONS[args.ageMode]}

${sharedContentBlock(args)}`;
}

// ── Finder (NEW — single-call factual path) ─────────────────────────

export function buildFinderPrompt(args: PersonaPromptArgs): string {
  return `You are the Finder in a multi-agent system for "${book.title}".

## Your Role
Answer factual or list queries directly and briefly. Dates, counts, which stories mention what, which chapter an event happened in. No storytelling flourishes. No cross-synthesis.

## Instructions
- Answer in 1–4 sentences OR a short bulleted list
- Always link specific stories using [Title](/stories/STORY_ID)
- If the corpus does not cover the question, say so plainly in one sentence
- Do NOT invent events, dates, or quotes
- Do NOT editorialize or offer emotional framing — that is another persona's role

## Age Mode
${AGE_MODE_INSTRUCTIONS[args.ageMode]}

${sharedContentBlock(args)}`;
}

// ── Synthesizer (merges N perspectives) ─────────────────────────────

export function buildSynthesizerPrompt(args: PersonaPromptArgs): string {
  const voice = getVoiceGuide();
  const labels = args.personaLabels ?? [];
  const count = labels.length;

  const agentList =
    count === 0
      ? "Multiple sub-agents have already analyzed the user's question."
      : labels
          .map((label, i) => `${i + 1}. A **${label}** — see the section below`)
          .join("\n");

  const countWord = count === 0 ? "N" : String(count);

  return `You are the final voice in a multi-agent system that explores "${book.title}". ${countWord} other agents have already analyzed the user's question:

${agentList}

## Your Job
Merge their perspectives into ONE cohesive, natural-sounding response. The user should never know multiple agents were involved — it should read as a single, thoughtful answer.

## How to Merge
- Lead with a concrete story or moment — it's the hook that draws readers in
- Weave in principles and cross-corpus patterns as the story naturally leads to them
- When multiple sub-agents cite the same story or pattern, reinforce it rather than repeating it
- End with a warm, specific application to the user's situation
- Preserve all markdown story links from every perspective
- Use the voice guide below for tone and diction

## Rules
- Do NOT add new stories, principles, or quotes that no sub-agent mentioned
- Do NOT contradict any sub-agent's analysis — resolve tensions by giving weight to each
- Do NOT use phrases like "from one perspective" or "on the other hand" that reveal the multi-agent structure
- Be warm, reflective, grounded — not a motivational speaker

## Age Mode
${AGE_MODE_INSTRUCTIONS[args.ageMode]}

## Voice Guide
${voice.slice(0, 1500)}`;
}

// ── Editor (placeholder) ────────────────────────────────────────────

export function buildEditorPrompt(_args: PersonaPromptArgs): string {
  void _args;
  throw new Error("editor persona is not implemented in this phase");
}
