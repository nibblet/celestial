/**
 * AI call ledger — central helper that records every server-side Anthropic
 * (or other provider) call into `cel_ai_interactions` (proxied from
 * `sb_ai_interactions`).
 *
 * Design goals:
 * - Single callsite contract: every server-side AI call funnels through
 *   {@link logAiCall} so we have one place to track persona, tokens, cost,
 *   and latency.
 * - Fail-open: ledger writes never throw into the calling path. A DB error
 *   or RLS denial is logged to console and swallowed — we never break a
 *   user-facing Ask/Tell/Beyond flow because the ledger couldn't write.
 * - Proxy-friendly: the client is duck-typed (`.from(table).insert(...)`)
 *   so the withCelTablePrefix proxy remaps `sb_ai_interactions` →
 *   `cel_ai_interactions` transparently.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type AiCallRecord = {
  userId?: string | null;
  /**
   * Persona / subsystem identifier. Free-form but constrained by convention:
   *   narrator | archivist | lorekeeper | finder | synthesizer
   *   tell_gather | tell_draft | beyond_polish | profile_reflection | other
   */
  persona: string;
  /** Top-level context bucket: 'ask' | 'tell_session' | 'beyond_polish' | 'profile' | 'script' | ... */
  contextType: string;
  /** Free-form id: conversation id, session id, draft id, user id, or null. */
  contextId?: string | null;
  model: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
  latencyMs?: number | null;
  /** If omitted, derived from model + tokens via the rate table below. */
  costUsd?: number | null;
  status?: "ok" | "error";
  errorMessage?: string | null;
  meta?: Record<string, unknown>;
};

/**
 * Cost lookup — add rows as new models come online. Unknown models return
 * null so missing entries don't silently introduce $0 to the ledger.
 *
 * Prices expressed as USD per 1K tokens, matching Anthropic's published
 * rates at the time each model was wired up.
 */
const MODEL_COST: Record<string, { in: number; out: number }> = {
  "claude-sonnet-4-20250514": { in: 0.003, out: 0.015 },
  "claude-3-5-haiku-20241022": { in: 0.0008, out: 0.004 },
};

export function estimateCostUsd(
  model: string,
  inputTokens?: number | null,
  outputTokens?: number | null,
): number | null {
  const rate = MODEL_COST[model];
  if (!rate) return null;
  if (inputTokens == null || outputTokens == null) return null;
  return (inputTokens / 1000) * rate.in + (outputTokens / 1000) * rate.out;
}

/**
 * Insert a ledger row. Never throws — failures are logged and swallowed.
 * Returns the inserted row id, or null on error.
 */
export async function logAiCall(
  supabase: SupabaseClient,
  record: AiCallRecord,
): Promise<string | null> {
  try {
    const costUsd =
      record.costUsd ??
      estimateCostUsd(record.model, record.inputTokens, record.outputTokens);
    const { data, error } = await supabase
      .from("sb_ai_interactions")
      .insert({
        user_id: record.userId ?? null,
        persona: record.persona,
        context_type: record.contextType,
        context_id: record.contextId ?? null,
        model: record.model,
        input_tokens: record.inputTokens ?? null,
        output_tokens: record.outputTokens ?? null,
        latency_ms: record.latencyMs ?? null,
        cost_usd: costUsd,
        status: record.status ?? "ok",
        error_message: record.errorMessage ?? null,
        meta: record.meta ?? {},
      })
      .select("id")
      .single();
    if (error) {
      console.error("[ai-ledger] insert failed:", error.message);
      return null;
    }
    return (data?.id as string) ?? null;
  } catch (err) {
    console.error("[ai-ledger] unexpected error:", err);
    return null;
  }
}
