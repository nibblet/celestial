import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** POST /api/threads { conversationId, pinned } — pin or unpin a conversation. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    conversationId?: unknown;
    pinned?: unknown;
  };
  if (typeof body.conversationId !== "string" || body.conversationId.length > 80) {
    return Response.json({ error: "Invalid conversation" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("cel_conversations")
    .update({ pinned_at: body.pinned === false ? null : new Date().toISOString() })
    .eq("id", body.conversationId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[api/threads] pin failed", error);
    return Response.json({ error: "Could not pin this." }, { status: 500 });
  }
  if (!data) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ok: true });
}
