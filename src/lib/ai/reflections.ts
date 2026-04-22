/**
 * Beyond-side reflection cache helper.
 *
 * One helper is used for three kinds of author-side summaries:
 *
 *   session_wrap   — "here's where you left off" on /beyond (Phase H3)
 *   story_so_far   — compact retrospective on a single draft's arc
 *   draft_digest   — cross-draft digest (not yet wired)
 *
 * Cache contract:
 *
 *   - Key:   (user_id, kind, target_id)
 *   - Hit:   if the persisted `input_signature` matches the incoming one,
 *            return the cached text unchanged ({ generated: false }).
 *   - Miss:  call the caller-supplied `generate()`, log a ledger row via
 *            logAiCall (so cost and latency appear in /api/admin/ai-activity),
 *            upsert the reflection row (linking `ai_interaction_id`), and
 *            return the fresh text ({ generated: true }).
 *
 * Fail-open philosophy:
 *
 *   The caller's user-facing surface must never break because of this
 *   cache. Any DB read/write error short-circuits to calling `generate()`
 *   and returning its output uncached. Only errors thrown inside
 *   `generate()` itself propagate — they're the caller's domain.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { logAiCall } from "@/lib/ai/ledger";

export type ReflectionKind = "session_wrap" | "story_so_far" | "draft_digest";

export type ReflectionContext = {
  /** Anthropic model slug used for this call (required for ledger + row). */
  model: string;
  /** Top-level ledger bucket — 'beyond' for Phase H surfaces. */
  contextType: string;
  /** Free-form ledger id (draft id, session id, or user id). */
  contextId?: string | null;
};

export type GenerateOutput = {
  text: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
  latencyMs?: number | null;
};

export type GetOrGenerateArgs = ReflectionContext & {
  userId: string;
  kind: ReflectionKind;
  targetId: string | null;
  inputSignature: string;
  generate: () => Promise<GenerateOutput>;
  /**
   * Admin-capable Supabase client. Defaults to the caller's client when
   * omitted, but writes need service-role because RLS only grants SELECT
   * to authenticated users (see migration 029).
   */
  supabase: SupabaseClient;
};

export type GetOrGenerateResult = {
  text: string;
  generated: boolean;
};

type CachedRow = {
  reflection_text: string;
  input_signature: string;
};

// ── Pure decision (unit-testable) ──────────────────────────────────

/**
 * Same-shape decision as `shouldRegenerateReflection` in
 * analytics/profile-reflection but without a cooldown: the caller
 * supplies a deterministic signature, so any change → regenerate.
 *
 * "none" is intentionally not a case here — the caller knows whether
 * they want to surface anything; this helper only answers "can we reuse
 * what's on disk?".
 */
export function decideReflectionAction(args: {
  cached: CachedRow | null;
  inputSignature: string;
}): "use-cache" | "generate" {
  if (!args.cached) return "generate";
  if (args.cached.input_signature === args.inputSignature) return "use-cache";
  return "generate";
}

// ── DB-facing helper ───────────────────────────────────────────────

async function readCachedRow(
  supabase: SupabaseClient,
  userId: string,
  kind: ReflectionKind,
  targetId: string | null,
): Promise<CachedRow | null> {
  // target_id is nullable and the unique constraint (user_id, kind,
  // target_id) treats NULLs as distinct in Postgres. We filter
  // explicitly with .is() when null so we always get the single row.
  const query = supabase
    .from("sb_beyond_reflections")
    .select("reflection_text, input_signature")
    .eq("user_id", userId)
    .eq("kind", kind);
  const finalQuery =
    targetId === null ? query.is("target_id", null) : query.eq("target_id", targetId);
  const { data, error } = await finalQuery.maybeSingle();
  if (error) {
    console.error("[reflections] read failed:", error.message);
    return null;
  }
  return (data as CachedRow | null) ?? null;
}

async function persistReflection(
  supabase: SupabaseClient,
  row: {
    userId: string;
    kind: ReflectionKind;
    targetId: string | null;
    text: string;
    inputSignature: string;
    modelSlug: string;
    aiInteractionId: string | null;
  },
): Promise<void> {
  // Read-then-(update|insert) instead of upsert because the unique
  // constraint is deferred for NULL target_id (Postgres default). This
  // keeps the NULL case clean without assuming DB-level NULLS NOT
  // DISTINCT support.
  const existing = await readCachedRow(supabase, row.userId, row.kind, row.targetId);
  const payload = {
    user_id: row.userId,
    kind: row.kind,
    target_id: row.targetId,
    reflection_text: row.text,
    input_signature: row.inputSignature,
    model_slug: row.modelSlug,
    ai_interaction_id: row.aiInteractionId,
    generated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (existing) {
    const q = supabase
      .from("sb_beyond_reflections")
      .update(payload)
      .eq("user_id", row.userId)
      .eq("kind", row.kind);
    const { error } = await (row.targetId === null
      ? q.is("target_id", null)
      : q.eq("target_id", row.targetId));
    if (error) {
      console.error("[reflections] update failed:", error.message);
    }
  } else {
    const { error } = await supabase
      .from("sb_beyond_reflections")
      .insert(payload);
    if (error) {
      console.error("[reflections] insert failed:", error.message);
    }
  }
}

// ── Public entry point ─────────────────────────────────────────────

export async function getOrGenerateBeyondReflection(
  args: GetOrGenerateArgs,
): Promise<GetOrGenerateResult> {
  const { supabase, userId, kind, targetId, inputSignature, generate } = args;

  const cached = await readCachedRow(supabase, userId, kind, targetId);
  const action = decideReflectionAction({ cached, inputSignature });

  if (action === "use-cache" && cached) {
    return { text: cached.reflection_text, generated: false };
  }

  // Cache miss → generate. Caller is responsible for handling failures
  // inside generate(); we surface those by letting them throw.
  const out = await generate();

  const aiInteractionId = await logAiCall(supabase, {
    userId,
    persona: `beyond_${kind}`,
    contextType: args.contextType,
    contextId: args.contextId ?? targetId ?? userId,
    model: args.model,
    inputTokens: out.inputTokens ?? null,
    outputTokens: out.outputTokens ?? null,
    latencyMs: out.latencyMs ?? null,
  });

  // Persist off the hot path. If this fails the user still sees fresh
  // output — we simply recompute next render.
  await persistReflection(supabase, {
    userId,
    kind,
    targetId,
    text: out.text,
    inputSignature,
    modelSlug: args.model,
    aiInteractionId,
  });

  return { text: out.text, generated: true };
}
