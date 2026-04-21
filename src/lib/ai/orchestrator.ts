/**
 * Ask orchestrator — routes questions through either:
 *   Simple path: single Sonnet call (current behavior)
 *   Deep path:   two parallel perspective calls + synthesizer
 *
 * Feature-flagged via ENABLE_DEEP_ASK env var.
 *
 * Every Anthropic call is recorded through logAiCall() so we have end-to-end
 * token/cost/latency tracking before Celestial opens up.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildSystemPrompt } from "./prompts";
import {
  buildStorytellerPrompt,
  buildPrinciplesCoachPrompt,
  buildSynthesizerPrompt,
} from "./perspectives";
import { classifyQuestion } from "./classifier";
import { logAiCall } from "./ledger";
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
  /** Server/admin Supabase client used for ledger inserts. */
  supabase: SupabaseClient;
  /** Auth user id that owns this Ask call (nullable for pre-auth probes). */
  userId?: string | null;
  /** Conversation id used as the ledger context_id. */
  conversationId?: string | null;
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
  params: OrchestrateParams,
): Promise<OrchestrateResult> {
  const deepEnabled = process.env.ENABLE_DEEP_ASK === "true";
  const classified = classifyQuestion(params.message, params.messages);
  const depth = deepEnabled && classified === "deep" ? "deep" : "simple";

  if (depth === "deep") {
    return { stream: deepPath(params), depth: "deep" };
  }
  return { stream: simplePath(params), depth: "simple" };
}

// ── Simple path (single Sonnet call) ────────────────────────────────

async function* simplePath(
  params: OrchestrateParams,
): AsyncGenerator<string> {
  const { anthropic, supabase, userId, conversationId, messages, ageMode, storySlug, journeySlug, readerProgress } = params;

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
    readerProgress,
  );

  const startedAt = Date.now();
  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  });

  try {
    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield event.delta.text;
      }
    }
    const final = await stream.finalMessage();
    void logAiCall(supabase, {
      userId: userId ?? null,
      persona: "synthesizer",
      contextType: "ask",
      contextId: conversationId ?? null,
      model: MODEL,
      inputTokens: final.usage?.input_tokens ?? null,
      outputTokens: final.usage?.output_tokens ?? null,
      latencyMs: Date.now() - startedAt,
      meta: { path: "simple" },
    });
  } catch (err) {
    void logAiCall(supabase, {
      userId: userId ?? null,
      persona: "synthesizer",
      contextType: "ask",
      contextId: conversationId ?? null,
      model: MODEL,
      latencyMs: Date.now() - startedAt,
      status: "error",
      errorMessage: err instanceof Error ? err.message : String(err),
      meta: { path: "simple" },
    });
    throw err;
  }
}

// ── Deep path (multi-perspective) ───────────────────────────────────

async function* deepPath(
  params: OrchestrateParams,
): AsyncGenerator<string> {
  const { anthropic, supabase, userId, conversationId, messages, ageMode, storySlug, journeySlug, readerProgress } = params;
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

  const storytellerPrompt = buildStorytellerPrompt(
    ageMode,
    storySlug,
    journeySlug,
    wikiSummaries,
    storyCatalog,
    readerProgress,
  );
  const principlesPrompt = buildPrinciplesCoachPrompt(
    ageMode,
    storySlug,
    journeySlug,
    wikiSummaries,
    storyCatalog,
    readerProgress,
  );

  const commonCtx = { supabase, userId: userId ?? null, conversationId: conversationId ?? null };
  const [storytellerResult, principlesResult] = await Promise.all([
    callPerspective({
      anthropic,
      persona: "narrator",
      systemPrompt: storytellerPrompt,
      messages,
      ...commonCtx,
    }),
    callPerspective({
      anthropic,
      persona: "lorekeeper",
      systemPrompt: principlesPrompt,
      messages,
      ...commonCtx,
    }),
  ]);

  const storytellerText = storytellerResult.text;
  const principlesText = principlesResult.text;

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

  const startedAt = Date.now();
  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: 1024,
    system: synthesizerPrompt,
    messages: synthMessages,
  });

  try {
    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield event.delta.text;
      }
    }
    const final = await stream.finalMessage();
    void logAiCall(supabase, {
      userId: userId ?? null,
      persona: "synthesizer",
      contextType: "ask",
      contextId: conversationId ?? null,
      model: MODEL,
      inputTokens: final.usage?.input_tokens ?? null,
      outputTokens: final.usage?.output_tokens ?? null,
      latencyMs: Date.now() - startedAt,
      meta: { path: "deep" },
    });
  } catch (err) {
    void logAiCall(supabase, {
      userId: userId ?? null,
      persona: "synthesizer",
      contextType: "ask",
      contextId: conversationId ?? null,
      model: MODEL,
      latencyMs: Date.now() - startedAt,
      status: "error",
      errorMessage: err instanceof Error ? err.message : String(err),
      meta: { path: "deep" },
    });
    throw err;
  }
}

// ── Helpers ─────────────────────────────────────────────────────────

async function callPerspective(args: {
  anthropic: Anthropic;
  persona: "narrator" | "lorekeeper" | "archivist" | "finder";
  systemPrompt: string;
  messages: { role: "user" | "assistant"; content: string }[];
  supabase: SupabaseClient;
  userId: string | null;
  conversationId: string | null;
}): Promise<{ text: string }> {
  const startedAt = Date.now();
  try {
    const result = await args.anthropic.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: args.systemPrompt,
      messages: args.messages,
    });
    const text = result.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");
    void logAiCall(args.supabase, {
      userId: args.userId,
      persona: args.persona,
      contextType: "ask",
      contextId: args.conversationId,
      model: MODEL,
      inputTokens: result.usage?.input_tokens ?? null,
      outputTokens: result.usage?.output_tokens ?? null,
      latencyMs: Date.now() - startedAt,
    });
    return { text };
  } catch (err) {
    void logAiCall(args.supabase, {
      userId: args.userId,
      persona: args.persona,
      contextType: "ask",
      contextId: args.conversationId,
      model: MODEL,
      latencyMs: Date.now() - startedAt,
      status: "error",
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
