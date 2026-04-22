/**
 * Ask orchestrator — routes the user's question through one of two paths,
 * both driven by the persona registry (src/lib/ai/personas.ts):
 *
 *   Single path (route.personas.length === 1)
 *     One persona call (default: Finder), streamed straight to the client.
 *
 *   Multi path (route.personas.length > 1)
 *     Every sub-persona fires in parallel (non-streaming), their outputs
 *     are concatenated into a synthesis user-message, and the Synthesizer
 *     persona streams the final merged answer.
 *
 * Routing is owned by src/lib/ai/router.ts. The ENABLE_DEEP_ASK env flag is
 * an ops kill-switch: when it is not "true" every route is demoted to the
 * single Finder call, preserving today's shipped behavior in prod until
 * explicitly opted in.
 *
 * Every Anthropic call — sub-persona and synthesizer — is recorded via
 * logAiCall() for end-to-end token/cost/latency visibility.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logAiCall } from "./ledger";
import { routeAsk, type PersonaRoute } from "./router";
import {
  getPersona,
  getPersonaLabels,
  type PersonaKey,
  type PersonaPromptArgs,
} from "./personas";
import type { AgeMode } from "@/types";
import {
  getCanonicalStoryMarkdown,
  getCanonicalStories,
  getCanonicalWikiSummaries,
} from "@/lib/wiki/corpus";
import type { ReaderProgress } from "@/lib/progress/reader-progress";
import { isStoryUnlocked } from "@/lib/progress/reader-progress";
import { getScenesForChapter } from "@/lib/wiki/scenes-db";
import { listUnresolvedThroughChapter } from "@/lib/threads/repo";
import { listBeatsByJourney } from "@/lib/beats/repo";
import {
  buildAskMessageEvidence,
  type AskMessageEvidence,
  type AskReaderMode,
} from "./ask-evidence";
import { getRulesContext } from "./prompts";

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
  /**
   * Reader preference: Deep uses normal routing (Finder vs multi-persona).
   * Fast forces a single Finder pass for lower latency.
   */
  askMode?: AskReaderMode;
}

export interface OrchestrateResult {
  /** Async iterable of text chunks for SSE streaming */
  stream: AsyncIterable<string>;
  /** High-level classification kept for backwards compatibility with
   *  existing callers that log it. */
  depth: "simple" | "deep";
  /** Full route including the persona plan — useful for downstream debug UIs. */
  route: PersonaRoute;
  /**
   * Build structured evidence after the stream is fully read. Uses the same
   * prompt args as the model call and parses in-answer markdown links.
   */
  buildEvidence: (fullAssistantText: string) => AskMessageEvidence;
}

/**
 * Main entry point. Returns a streamable result regardless of path.
 */
export async function orchestrateAsk(
  params: OrchestrateParams,
): Promise<OrchestrateResult> {
  const classifiedRoute = routeAsk(params.message);
  const askModeRequested: AskReaderMode = params.askMode ?? "deep";

  const routeAfterAskMode: PersonaRoute =
    askModeRequested === "fast"
      ? {
          personas: ["finder"],
          depth: classifiedRoute.depth,
          reason: `reader fast mode; classifier would have: ${classifiedRoute.reason}`,
        }
      : classifiedRoute;

  const deepEnabled = process.env.ENABLE_DEEP_ASK === "true";

  // Kill-switch: when deep synthesis is disabled in prod, force every route
  // back onto the single Finder call.
  const route: PersonaRoute =
    !deepEnabled && routeAfterAskMode.personas.length > 1
      ? {
          personas: ["finder"],
          depth: routeAfterAskMode.depth,
          reason: `deep synthesis disabled (ENABLE_DEEP_ASK != true); prior: ${routeAfterAskMode.reason}`,
        }
      : routeAfterAskMode;

  const promptArgs = await buildPromptArgs(params);

  const stream =
    route.personas.length > 1
      ? multiPath(params, route, promptArgs)
      : singlePath(params, route, route.personas[0] ?? "finder", promptArgs);

  const askModeApplied: AskReaderMode =
    route.personas.length > 1 ? "deep" : "fast";
  const askModeNote = buildAskModeNote(
    askModeRequested,
    deepEnabled,
    classifiedRoute,
    route,
  );

  const buildEvidence = (fullAssistantText: string) =>
    buildAskMessageEvidence(promptArgs, route, fullAssistantText, {
      deepAskOperational: deepEnabled,
      askModeRequested,
      askModeApplied,
      askModeNote,
    });

  return { stream, depth: route.depth, route, buildEvidence };
}

function buildAskModeNote(
  requested: AskReaderMode,
  deepEnabled: boolean,
  classifiedRoute: PersonaRoute,
  finalRoute: PersonaRoute,
): string | undefined {
  if (requested === "fast") {
    return "Fast mode: single Finder pass (no multi-persona synthesis).";
  }
  if (!deepEnabled && classifiedRoute.personas.length > 1) {
    return "Multi-persona synthesis is disabled for this deployment (ENABLE_DEEP_ASK).";
  }
  if (
    requested === "deep" &&
    finalRoute.personas.length === 1 &&
    classifiedRoute.depth === "simple"
  ) {
    return "Classified as a short factual lookup — single Finder pass.";
  }
  return undefined;
}

// ── Prompt args assembly ────────────────────────────────────────────

async function buildPromptArgs(
  params: OrchestrateParams,
): Promise<PersonaPromptArgs> {
  const { supabase, ageMode, storySlug, journeySlug, readerProgress } = params;

  // Only fetch open threads when we know what chapter the reader is on — the
  // progress gate is what scopes them to "unresolved through current
  // chapter". Otherwise personas could see spoilery future mysteries.
  const threadCutoffChapter = readerProgress?.currentChapter ?? null;

  const [
    wikiSummaries,
    stories,
    storyContextRaw,
    chapterScenes,
    openThreads,
    journeyBeats,
  ] = await Promise.all([
    getCanonicalWikiSummaries(),
    getCanonicalStories(),
    storySlug ? getCanonicalStoryMarkdown(storySlug) : Promise.resolve(""),
    storySlug ? getScenesForChapter(storySlug) : Promise.resolve([]),
    threadCutoffChapter
      ? listUnresolvedThroughChapter(supabase, threadCutoffChapter)
      : Promise.resolve([]),
    journeySlug
      ? listBeatsByJourney(supabase, journeySlug)
      : Promise.resolve([]),
  ]);
  void storyContextRaw; // storyContext is assembled inside each persona builder

  const visibleStories = readerProgress
    ? stories.filter((story) => isStoryUnlocked(story.storyId, readerProgress))
    : stories;

  const storyCatalog = visibleStories
    .map((story) => `- ${story.storyId} — ${story.title}`)
    .join("\n");

  return {
    ageMode,
    storySlug,
    journeySlug,
    wikiSummaries,
    storyCatalog,
    readerProgress,
    chapterScenes: chapterScenes.map((s) => ({
      orderIndex: s.orderIndex,
      slug: s.slug,
      title: s.title,
      goal: s.goal,
      conflict: s.conflict,
      outcome: s.outcome,
    })),
    openThreads: openThreads.map((t) => ({
      title: t.title,
      question: t.question,
      openedInChapterId: t.openedInChapterId,
      resolved: t.resolved,
    })),
    beats: journeyBeats.map((b) => ({
      act: b.act,
      title: b.title,
      whyItMatters: b.whyItMatters,
      beatType: b.beatType,
      chapterId: b.chapterId,
    })),
    rulesContextIncluded: getRulesContext().length > 0,
  };
}

// ── Single path (one persona, streamed) ─────────────────────────────

async function* singlePath(
  params: OrchestrateParams,
  route: PersonaRoute,
  personaKey: PersonaKey,
  promptArgs: PersonaPromptArgs,
): AsyncGenerator<string> {
  const { anthropic, supabase, userId, conversationId, messages } = params;
  const persona = getPersona(personaKey);
  const systemPrompt = persona.buildSystemPrompt(promptArgs);

  const startedAt = Date.now();
  const stream = anthropic.messages.stream({
    model: persona.model,
    max_tokens: persona.maxTokens,
    temperature: persona.temperature,
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
      persona: persona.key,
      contextType: "ask",
      contextId: conversationId ?? null,
      model: persona.model,
      inputTokens: final.usage?.input_tokens ?? null,
      outputTokens: final.usage?.output_tokens ?? null,
      latencyMs: Date.now() - startedAt,
      meta: {
        path: "single",
        route_depth: route.depth,
        route_reason: route.reason,
      },
    });
  } catch (err) {
    void logAiCall(supabase, {
      userId: userId ?? null,
      persona: persona.key,
      contextType: "ask",
      contextId: conversationId ?? null,
      model: persona.model,
      latencyMs: Date.now() - startedAt,
      status: "error",
      errorMessage: err instanceof Error ? err.message : String(err),
      meta: {
        path: "single",
        route_depth: route.depth,
        route_reason: route.reason,
      },
    });
    throw err;
  }
}

// ── Multi path (N sub-personas -> synthesizer stream) ───────────────

async function* multiPath(
  params: OrchestrateParams,
  route: PersonaRoute,
  promptArgs: PersonaPromptArgs,
): AsyncGenerator<string> {
  const { anthropic, supabase, userId, conversationId, messages, ageMode } =
    params;

  const subPersonas = route.personas.map(getPersona);

  // Fire every sub-persona in parallel. Failures in any one sub-call are
  // logged by callPerspective and re-thrown so the orchestrator surfaces
  // the error — we'd rather fail the whole Ask than silently synthesize
  // over a missing perspective.
  const perspectiveTexts = await Promise.all(
    subPersonas.map((persona) =>
      callPerspective({
        anthropic,
        persona: persona.key,
        systemPrompt: persona.buildSystemPrompt(promptArgs),
        messages,
        supabase,
        userId: userId ?? null,
        conversationId: conversationId ?? null,
        meta: {
          path: "multi",
          route_depth: route.depth,
          route_reason: route.reason,
        },
      }),
    ),
  );

  const synthesizer = getPersona("synthesizer");
  const synthesizerPrompt = synthesizer.buildSystemPrompt({
    ...promptArgs,
    ageMode,
    personaLabels: getPersonaLabels(route.personas),
  });

  const perspectiveBlocks = subPersonas
    .map(
      (persona, i) =>
        `---${persona.label.toUpperCase()} PERSPECTIVE---\n${perspectiveTexts[i]}`,
    )
    .join("\n\n");

  const synthMessages: { role: "user" | "assistant"; content: string }[] = [
    ...messages,
    {
      role: "user" as const,
      content: `Here are ${subPersonas.length} perspectives on my question. Please synthesize them into one response.\n\n${perspectiveBlocks}`,
    },
  ];

  const startedAt = Date.now();
  const stream = anthropic.messages.stream({
    model: synthesizer.model,
    max_tokens: synthesizer.maxTokens,
    temperature: synthesizer.temperature,
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
      persona: synthesizer.key,
      contextType: "ask",
      contextId: conversationId ?? null,
      model: synthesizer.model,
      inputTokens: final.usage?.input_tokens ?? null,
      outputTokens: final.usage?.output_tokens ?? null,
      latencyMs: Date.now() - startedAt,
      meta: {
        path: "multi",
        route_depth: route.depth,
        route_reason: route.reason,
        sub_personas: route.personas,
      },
    });
  } catch (err) {
    void logAiCall(supabase, {
      userId: userId ?? null,
      persona: synthesizer.key,
      contextType: "ask",
      contextId: conversationId ?? null,
      model: synthesizer.model,
      latencyMs: Date.now() - startedAt,
      status: "error",
      errorMessage: err instanceof Error ? err.message : String(err),
      meta: {
        path: "multi",
        route_depth: route.depth,
        route_reason: route.reason,
        sub_personas: route.personas,
      },
    });
    throw err;
  }
}

// ── Helpers ─────────────────────────────────────────────────────────

async function callPerspective(args: {
  anthropic: Anthropic;
  persona: PersonaKey;
  systemPrompt: string;
  messages: { role: "user" | "assistant"; content: string }[];
  supabase: SupabaseClient;
  userId: string | null;
  conversationId: string | null;
  meta?: Record<string, unknown>;
}): Promise<string> {
  const persona = getPersona(args.persona);
  const startedAt = Date.now();
  try {
    const result = await args.anthropic.messages.create({
      model: persona.model,
      max_tokens: persona.maxTokens,
      temperature: persona.temperature,
      system: args.systemPrompt,
      messages: args.messages,
    });
    const text = result.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");
    void logAiCall(args.supabase, {
      userId: args.userId,
      persona: persona.key,
      contextType: "ask",
      contextId: args.conversationId,
      model: persona.model,
      inputTokens: result.usage?.input_tokens ?? null,
      outputTokens: result.usage?.output_tokens ?? null,
      latencyMs: Date.now() - startedAt,
      meta: args.meta,
    });
    return text;
  } catch (err) {
    void logAiCall(args.supabase, {
      userId: args.userId,
      persona: persona.key,
      contextType: "ask",
      contextId: args.conversationId,
      model: persona.model,
      latencyMs: Date.now() - startedAt,
      status: "error",
      errorMessage: err instanceof Error ? err.message : String(err),
      meta: args.meta,
    });
    throw err;
  }
}
