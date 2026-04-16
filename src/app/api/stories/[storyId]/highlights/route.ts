import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

const MAX_PASSAGE = 1000;
const MIN_PASSAGE = 10;
const MAX_NOTE = 500;
const MAX_STORY_ID_LENGTH = 64;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ storyId: string }> }
) {
  const { storyId } = await params;
  if (!storyId || storyId.length > MAX_STORY_ID_LENGTH) {
    return Response.json({ error: "Invalid story id" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rateLimit = checkRateLimit(`${user.id}:highlight`, 30, 60_000);
  if (!rateLimit.allowed) {
    return Response.json(
      { error: "Too many saves — try again in a moment." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { passage_text, story_title, note } = body as {
    passage_text?: unknown;
    story_title?: unknown;
    note?: unknown;
  };

  if (
    typeof passage_text !== "string" ||
    passage_text.trim().length < MIN_PASSAGE ||
    passage_text.trim().length > MAX_PASSAGE
  ) {
    return Response.json(
      { error: `Passage must be ${MIN_PASSAGE}–${MAX_PASSAGE} characters.` },
      { status: 400 }
    );
  }

  const normalizedNote =
    typeof note === "string" && note.trim()
      ? note.trim().slice(0, MAX_NOTE)
      : null;

  const normalizedTitle =
    typeof story_title === "string" ? story_title.trim().slice(0, 200) : "";

  const { data, error } = await supabase
    .from("sb_story_highlights")
    .insert({
      user_id: user.id,
      story_id: storyId,
      story_title: normalizedTitle,
      passage_text: passage_text.trim(),
      note: normalizedNote,
    })
    .select("id, saved_at")
    .single();

  if (error || !data) {
    console.error("Failed to save highlight:", error);
    return Response.json(
      { error: "Could not save the passage." },
      { status: 500 }
    );
  }

  return Response.json({ id: data.id, saved_at: data.saved_at });
}
