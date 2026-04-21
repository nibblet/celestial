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
  /** High-level classification kept for backwards compatibility with
   *  existing callers that log it. */
  depth: "simple" | "deep";
  /** Full route including the persona plan — useful for downstream debug UIs. */
  route: PersonaRoute;
}

/**
 * Main entry point. Returns a streamable result regardless of path.
 */
export async function orchestrateAsk(
  params: OrchestrateParams,
): Promise<OrchestrateResult> {
  const rawRoute = routeAsk(params.message);
  const deepEnabled = process.env.ENABLE_DEEP_ASK === "true";

  // Kill-switch: when deep synthesis is disabled in prod, force every route
  // back onto the single Finder call. Keep the classified depth around so
  // downstream telemetry can still see what the router *wanted* to do.
  const route: PersonaRoute =
    !deepEnabled && rawRoute.personas.length > 1
      ? {
          personas: ["finder"],
          depth: rawRoute.depth,
          reason: `deep route demoted to finder (ENABLE_DEEP_ASK != true); original: ${rawRoute.reason}`,
        }
      : rawRoute;

  const stream =
    route.personas.length > 1
      ? multiPath(params, route)
      : singlePath(params, route, route.personas[0] ?? "finder");

  return { stream, depth: route.depth, route };
}

// ── Prompt args assembly ────────────────────────────────────────────

async function buildPromptArgs(
  params: OrchestrateParams,
): Promise<PersonaPromptArgs> {
  const { ageMode, storySlug, journeySlug, readerProgress } = params;

  const [wikiSummaries, stories, storyContextRaw] = await Promise.all([
    getCanonicalWikiSummaries(),
    getCanonicalStories(),
    storySlug ? getCanonicalStoryMarkdown(storySlug) : Promise.resolve(""),
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
  };
}

// ── Single path (one persona, streamed) ─────────────────────────────

async function* singlePath(
  params: OrchestrateParams,
  route: PersonaRoute,
  personaKey: PersonaKey,
): AsyncGenerator<string> {
  const { anthropic, supabase, userId, conversationId, messages } = params;
  const persona = getPersona(personaKey);
  const promptArgs = await buildPromptArgs(params);
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
): AsyncGenerator<string> {
  const { anthropic, supabase, userId, conversationId, messages, ageMode } =
    params;
  const promptArgs = await buildPromptArgs(params);

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
