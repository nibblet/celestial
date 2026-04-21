/**
 * Ask orchestrator — routes questions through either:
 *   Simple path: single Sonnet call (current behavior)
 *   Deep path:   two parallel perspective calls + synthesizer
 *
 * Feature-flagged via ENABLE_DEEP_ASK env var.
 */

import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "./prompts";
import {
  buildStorytellerPrompt,
  buildPrinciplesCoachPrompt,
  buildSynthesizerPrompt,
} from "./perspectives";
import { classifyQuestion } from "./classifier";
import type { AgeMode } from "@/types";
import {
  getCanonicalStoryMarkdown,
  getCanonicalStories,
  getCanonicalWikiSummaries,
} from "@/lib/wiki/corpus";
import type { ReaderProgress } from "@/lib/progress/reader-progress";
import { isStoryUnlocked } from "@/lib/progress/reader-progress";

const MODEL = "claude-sonnet-4-20250514";

export interface OrchestrateParams {
  anthropic: Anthropic;
  message: string;
  messages: { role: "user" | "assistant"; content: string }[];
  ageMode: AgeMode;
  storySlug?: string;
  journeySlug?: string;
  readerProgress?: ReaderProgress;
}

export interface OrchestrateResult {
  /** Async iterable of text chunks for SSE streaming */
  stream: AsyncIterable<string>;
  /** Whether the deep (multi-perspective) path was used */
  depth: "simple" | "deep";
}

/**
 * Main entry point. Returns a streamable result regardless of path.
 */
export async function orchestrateAsk(
  params: OrchestrateParams
): Promise<OrchestrateResult> {
  const deepEnabled = process.env.ENABLE_DEEP_ASK === "true";
  const classified = classifyQuestion(params.message, params.messages);
  const depth = deepEnabled && classified === "deep" ? "deep" : "simple";

  if (depth === "deep") {
    return { stream: deepPath(params), depth: "deep" };
  }
  return { stream: simplePath(params), depth: "simple" };
}

// ── Simple path (unchanged behavior) ────────────────────────────────

async function* simplePath(
  params: OrchestrateParams
): AsyncGenerator<string> {
  const { anthropic, messages, ageMode, storySlug, journeySlug, readerProgress } = params;

  const [wikiSummaries, stories, storyContextRaw] = await Promise.all([
    getCanonicalWikiSummaries(),
    getCanonicalStories(),
    storySlug ? getCanonicalStoryMarkdown(storySlug) : Promise.resolve(""),
  ]);
  const visibleStories = readerProgress
    ? stories.filter((story) => isStoryUnlocked(story.storyId, readerProgress))
    : stories;
  const storyCatalog = visibleStories
    .map((story) => `- ${story.storyId} — ${story.title}`)
    .join("\n");
  const storyContext =
    storySlug && readerProgress && !isStoryUnlocked(storySlug, readerProgress)
      ? ""
      : storyContextRaw;
  const systemPrompt = buildSystemPrompt(
    ageMode,
    storySlug,
    journeySlug,
    undefined,
    wikiSummaries,
    storyCatalog,
    storyContext || undefined,
    readerProgress
  );

  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      yield event.delta.text;
    }
  }
}

// ── Deep path (multi-perspective) ───────────────────────────────────

async function* deepPath(
  params: OrchestrateParams
): AsyncGenerator<string> {
  const { anthropic, messages, ageMode, storySlug, journeySlug, readerProgress } = params;
  const [wikiSummaries, stories] = await Promise.all([
    getCanonicalWikiSummaries(),
    getCanonicalStories(),
  ]);
  const visibleStories = readerProgress
    ? stories.filter((story) => isStoryUnlocked(story.storyId, readerProgress))
    : stories;
  const storyCatalog = visibleStories
    .map((story) => `- ${story.storyId} — ${story.title}`)
    .join("\n");

  // Build perspective prompts
  const storytellerPrompt = buildStorytellerPrompt(
    ageMode,
    storySlug,
    journeySlug,
    wikiSummaries,
    storyCatalog,
    readerProgress
  );
  const principlesPrompt = buildPrinciplesCoachPrompt(
    ageMode,
    storySlug,
    journeySlug,
    wikiSummaries,
    storyCatalog,
    readerProgress
  );

  // Fire both perspective calls in parallel (non-streaming)
  const [storytellerResult, principlesResult] = await Promise.all([
    anthropic.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: storytellerPrompt,
      messages,
    }),
    anthropic.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: principlesPrompt,
      messages,
    }),
  ]);

  const storytellerText = storytellerResult.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  const principlesText = principlesResult.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  // Synthesize into one voice (streamed to user)
  const synthesizerPrompt = buildSynthesizerPrompt(ageMode);

  const synthMessages: { role: "user" | "assistant"; content: string }[] = [
    ...messages,
    {
      role: "user" as const,
      content: `Here are two perspectives on my question. Please synthesize them into one response.

---NARRATOR PERSPECTIVE---
${storytellerText}

---LORE-KEEPER PERSPECTIVE---
${principlesText}`,
    },
  ];

  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: 1024,
    system: synthesizerPrompt,
    messages: synthMessages,
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      yield event.delta.text;
    }
  }
}
