import { createClient } from "@/lib/supabase/server";

/**
 * Admin-only JSON feed of the AI call ledger.
 *
 * Usage: GET /api/admin/ai-activity?limit=100&contextType=ask
 *   - limit:       1..500 (default 100)
 *   - contextType: optional filter on the `context_type` column
 *   - persona:     optional filter on the `persona` column
 *
 * Access: requires sb_profiles.role IN ('admin', 'keith'). Row-level RLS on
 * cel_ai_interactions also enforces this; the explicit role check here lets us
 * return a clean 403 instead of an empty result set.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("sb_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "keith"].includes(profile.role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const parsedLimit = Number.parseInt(url.searchParams.get("limit") ?? "", 10);
  const limit =
    Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.min(500, parsedLimit)
      : 100;
  const contextType = url.searchParams.get("contextType");
  const persona = url.searchParams.get("persona");

  let query = supabase
    .from("sb_ai_interactions")
    .select(
      "id, user_id, persona, context_type, context_id, model, input_tokens, output_tokens, latency_ms, cost_usd, status, error_message, meta, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (contextType) query = query.eq("context_type", contextType);
  if (persona) query = query.eq("persona", persona);

  const { data, error } = await query;

  if (error) {
    return Response.json(
      { error: "Failed to load ai_interactions", detail: error.message },
      { status: 500 },
    );
  }

  return Response.json({ rows: data ?? [], limit });
}
