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
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: highlight, error } = await supabase
    .from("cel_story_highlights")
    .select(
      "id, story_id, story_title, passage_text, note, saved_at, passage_ask_conversation_id"
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !highlight) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({ highlight });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // RLS guarantees users can only delete their own rows.
  const { error } = await supabase
    .from("cel_story_highlights")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return Response.json({ error: "Could not delete." }, { status: 500 });
  }
  return Response.json({ ok: true });
}
