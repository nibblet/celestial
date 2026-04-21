import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { chapterNumberFromStoryId } from "@/lib/wiki/story-ids";
import { READER_CHAPTER_COOKIE } from "@/lib/progress/reader-progress";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ storyId: string }> }
) {
  const { storyId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const chapterNum = chapterNumberFromStoryId(storyId.trim());
  if (chapterNum !== null) {
    const cookieStore = await cookies();
    cookieStore.set(READER_CHAPTER_COOKIE, `CH${String(chapterNum).padStart(2, "0")}`, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  if (!storyId?.trim()) {
    return Response.json({ error: "storyId required" }, { status: 400 });
  }

  if (!user) {
    return Response.json({ ok: true, guest: true });
  }

  const { error } = await supabase
    .from("sb_story_reads")
    .upsert(
      {
        user_id: user.id,
        story_id: storyId.trim(),
      },
      {
        onConflict: "user_id,story_id",
        ignoreDuplicates: true,
      }
    );

  if (error) {
    return Response.json(
      { error: "Failed to mark story as read" },
      { status: 500 }
    );
  }

  return Response.json({ ok: true });
}
