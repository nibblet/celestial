/**
 * Ask orchestrator — routes the user's question through one of two paths,
 * both driven by the persona registry (src/lib/ai/personas.ts):
 *
 *   Single path (route.personas.length === 1)
 *     One persona call (default: Ask Answerer over a wiki-first context pack),
 *     streamed straight to the client.
 *
 *   Multi path (route.personas.length > 1)
 *     Every sub-persona fires in parallel (non-streaming), their outputs
 *     are concatenated into a synthesis user-message, and the Synthesizer
 *     persona streams the final merged answer.
 *
 * Routing starts in src/lib/ai/router.ts, then resolveAskRoute() maps normal
 * Ask traffic onto the wiki-first single-call path. Legacy multi-persona
 * synthesis is available only when both ENABLE_DEEP_ASK and
 * ENABLE_MULTI_PERSONA_ASK are true.
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
  getCanonicalStories,
  getCanonicalWikiSummaries,
} from "@/lib/wiki/corpus";
import { classifyAskIntent } from "./ask-intent";
import { createAskContextPack, type AskContextItem } from "./ask-context";
import {
  buildDefaultAskRetrievalSources,
  retrieveAskContextItems,
} from "@/lib/wiki/ask-retrieval";
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
import {
  getCharacterArcContext,
  getCharacterCanonContext,
  getRulesContext,
} from "./prompts";

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
   * Reader preference: Deep uses a richer wiki-first pack. Fast uses a smaller
   * pack for lower latency.
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

export function resolveAskRoute(input: {
  classifiedRoute: PersonaRoute;
  askModeRequested: AskReaderMode;
  deepEnabled: boolean;
  multiPersonaEnabled: boolean;
}): PersonaRoute {
  const { classifiedRoute, askModeRequested, deepEnabled, multiPersonaEnabled } =
    input;
  const routeAfterAskMode: PersonaRoute =
    askModeRequested === "fast"
      ? {
          personas: ["finder"],
          depth: classifiedRoute.depth,
          reason: `reader fast mode; classifier would have: ${classifiedRoute.reason}`,
        }
      : classifiedRoute;

  if (askModeRequested === "fast") {
    return {
      personas: ["ask_answerer"],
      depth: routeAfterAskMode.depth,
      reason: `reader fast mode; wiki-first compact context; classifier would have: ${classifiedRoute.reason}`,
    };
  }

  if (
    routeAfterAskMode.personas.length > 1 &&
    deepEnabled &&
    multiPersonaEnabled
  ) {
    return routeAfterAskMode;
  }

  return {
    personas: ["ask_answerer"],
    depth: routeAfterAskMode.depth,
    reason:
      routeAfterAskMode.personas.length > 1
        ? `wiki-first single-call path; legacy multi-persona disabled unless ENABLE_MULTI_PERSONA_ASK=true; prior: ${routeAfterAskMode.reason}`
        : `wiki-first single-call path; prior: ${routeAfterAskMode.reason}`,
  };
}

/**
 * Main entry point. Returns a streamable result regardless of path.
 */
export async function orchestrateAsk(
  params: OrchestrateParams,
): Promise<OrchestrateResult> {
  const classifiedRoute = routeAsk(params.message);
  const askModeRequested: AskReaderMode = params.askMode ?? "deep";

  const deepEnabled = process.env.ENABLE_DEEP_ASK === "true";
  const multiPersonaEnabled = process.env.ENABLE_MULTI_PERSONA_ASK === "true";

  // Wiki-first Ask is the normal path: one streamed answer call over a compact
  // context pack. Legacy multi-persona synthesis remains behind an explicit
  // fallback gate for comparative testing.
  const route = resolveAskRoute({
    classifiedRoute,
    askModeRequested,
    deepEnabled,
    multiPersonaEnabled,
  });

  const promptArgs = await buildPromptArgs(params);

  const stream =
    route.personas.length > 1
      ? multiPath(params, route, promptArgs)
      : singlePath(params, route, route.personas[0] ?? "finder", promptArgs);

  const askModeApplied: AskReaderMode =
    route.personas.length > 1 ? "deep" : askModeRequested;
  const askModeNote = buildAskModeNote(
    askModeRequested,
    deepEnabled,
    multiPersonaEnabled,
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
  multiPersonaEnabled: boolean,
  classifiedRoute: PersonaRoute,
  finalRoute: PersonaRoute,
): string | undefined {
  if (requested === "fast") {
    return "Fast mode: compact wiki-first context and one streamed answer call.";
  }
  if (classifiedRoute.personas.length > 1 && finalRoute.personas.length === 1) {
    if (!deepEnabled) {
      return "Deep Ask kill-switch is disabled (ENABLE_DEEP_ASK); using wiki-first single-call path.";
    }
    if (!multiPersonaEnabled) {
      return "Wiki-first single-call path; legacy multi-persona synthesis requires ENABLE_MULTI_PERSONA_ASK.";
    }
  }
  if (!deepEnabled && classifiedRoute.personas.length > 1) {
    return "Multi-persona synthesis is disabled for this deployment (ENABLE_DEEP_ASK).";
  }
  if (
    requested === "deep" &&
    finalRoute.personas.length === 1 &&
    classifiedRoute.depth === "simple"
  ) {
    return "Classified as a short factual lookup — wiki-first single-call path.";
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

  const [wikiSummaries, stories, chapterScenes, openThreads, journeyBeats] =
    await Promise.all([
      getCanonicalWikiSummaries(),
      getCanonicalStories(),
      storySlug ? getScenesForChapter(storySlug) : Promise.resolve([]),
      threadCutoffChapter
        ? listUnresolvedThroughChapter(supabase, threadCutoffChapter)
        : Promise.resolve([]),
      journeySlug
        ? listBeatsByJourney(supabase, journeySlug)
        : Promise.resolve([]),
    ]);

  const visibleStories = readerProgress
    ? stories.filter((story) => isStoryUnlocked(story.storyId, readerProgress))
    : stories;

  const storyCatalog = visibleStories
    .map((story) => `- ${story.storyId} — ${story.title}`)
    .join("\n");
  const intent = classifyAskIntent(params.message);
  const retrievedItems = retrieveAskContextItems({
    message: params.message,
    intent,
    storySlug,
    readerProgress,
    sources: buildDefaultAskRetrievalSources({
      stories: visibleStories.map((story) => ({
        storyId: story.storyId,
        title: story.title,
        href: `/stories/${story.storyId}`,
        summary: story.summary,
        text: [
          story.summary,
          story.themes.join(" "),
          story.principles.join(" "),
          story.quotes.join(" "),
          story.fullText,
        ].join("\n"),
      })),
    }),
    limit: params.askMode === "fast" ? 6 : 12,
  });
  const scopedItems: AskContextItem[] = [
    ...chapterScenes
      .slice(0, params.askMode === "fast" ? 3 : 8)
      .map((scene) => ({
        kind: "scene" as const,
        title: scene.title,
        href: storySlug
          ? `/stories/${storySlug}#${scene.slug}`
          : `/stories/${scene.slug}`,
        canonRank: "chapter_text" as const,
        excerpt: [scene.goal, scene.conflict, scene.outcome]
          .filter(Boolean)
          .join(" "),
        score: storySlug ? 7 : 3,
        storyId: storySlug,
        slug: scene.slug,
      })),
    ...openThreads.slice(0, params.askMode === "fast" ? 2 : 5).map((thread) => ({
      kind: "open_thread" as const,
      title: thread.title,
      href: `/stories/${thread.openedInChapterId}`,
      canonRank: "derived_inference" as const,
      excerpt: thread.question,
      score: intent.kind === "future_speculation" ? 8 : 4,
      storyId: thread.openedInChapterId,
    })),
    ...journeyBeats.slice(0, params.askMode === "fast" ? 2 : 6).map((beat) => ({
      kind: "journey_beat" as const,
      title: beat.title,
      href: beat.chapterId ? `/stories/${beat.chapterId}` : "/ask",
      canonRank: "derived_inference" as const,
      excerpt: beat.whyItMatters,
      score: 5,
      storyId: beat.chapterId ?? undefined,
    })),
  ];
  const askContextPack = createAskContextPack({
    message: params.message,
    intent,
    items: [...retrievedItems, ...scopedItems],
    mode: params.askMode ?? "deep",
    maxItems: params.askMode === "fast" ? 6 : 12,
    maxChars: params.askMode === "fast" ? 4_000 : 9_000,
    gaps:
      retrievedItems.length === 0
        ? ["No high-confidence wiki match was found for this question."]
        : [],
  });

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
    characterCanonContextIncluded: getCharacterCanonContext().length > 0,
    characterArcContextIncluded: getCharacterArcContext().length > 0,
    askContextPack,
  };
}

// ── Single path (one persona, streamed) ─────────────────────────────

function askContextMeta(promptArgs: PersonaPromptArgs): Record<string, unknown> {
  const pack = promptArgs.askContextPack;
  if (!pack) return {};
  return {
    ask_intent: pack.intent.kind,
    retrieval_confidence: pack.confidence,
    context_item_count: pack.items.length,
    context_pack_chars: pack.budget.actualChars,
    context_pack_mode: pack.mode,
    context_gaps: pack.gaps.length,
  };
}

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
        multi_persona_fallback: false,
        ...askContextMeta(promptArgs),
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
        multi_persona_fallback: false,
        ...askContextMeta(promptArgs),
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
          multi_persona_fallback: true,
          ...askContextMeta(promptArgs),
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
        multi_persona_fallback: true,
        ...askContextMeta(promptArgs),
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
        multi_persona_fallback: true,
        ...askContextMeta(promptArgs),
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
