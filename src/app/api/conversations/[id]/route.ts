import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get conversation (RLS ensures user can only see own)
  const { data: conversation, error: convError } = await supabase
    .from("cel_conversations")
    .select("*")
    .eq("id", id)
    .single();

  if (convError || !conversation) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // Get messages
  const { data: messages, error: msgError } = await supabase
    .from("cel_messages")
    .select("id, role, content, cited_story_slugs, evidence, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  if (msgError) {
    return Response.json({ error: msgError.message }, { status: 500 });
  }

  return Response.json({ conversation, messages });
}
