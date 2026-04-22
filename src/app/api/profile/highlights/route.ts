import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("cel_story_highlights")
    .select(
      "id, story_id, story_title, passage_text, note, saved_at, passage_ask_conversation_id"
    )
    .eq("user_id", user.id)
    .order("saved_at", { ascending: false })
    .limit(500);

  return Response.json({ highlights: data ?? [] });
}
