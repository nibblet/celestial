import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  READER_CHAPTER_COOKIE,
  getReaderProgress,
} from "@/lib/progress/reader-progress";
import { chapterNumberFromStoryId } from "@/lib/wiki/story-ids";
import { storiesData } from "@/lib/wiki/static-data";

export async function GET() {
  const progress = await getReaderProgress();
  return Response.json(progress);
}

export async function PUT(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    chapterId?: string;
    showAllContent?: boolean;
    markAllChaptersRead?: boolean;
    markAllChaptersUnread?: boolean;
  };

  const cookieStore = await cookies();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && body.markAllChaptersRead === true) {
    const chapterIds = storiesData
      .filter((s) => /^CH\d+/i.test(s.storyId))
      .map((s) => s.storyId);
    if (chapterIds.length > 0) {
      const rows = chapterIds.map((story_id) => ({
        user_id: user.id,
        story_id,
      }));
      await supabase.from("sb_story_reads").upsert(rows, {
        onConflict: "user_id,story_id",
        ignoreDuplicates: false,
      });
      const maxNum = chapterIds.reduce((acc, id) => {
        const n = chapterNumberFromStoryId(id);
        return n !== null && n > acc ? n : acc;
      }, 0);
      cookieStore.set(
        READER_CHAPTER_COOKIE,
        `CH${String(maxNum).padStart(2, "0")}`,
        {
          path: "/",
          httpOnly: false,
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 365,
        }
      );
    }
  }

  if (user && body.markAllChaptersUnread === true) {
    await supabase
      .from("sb_story_reads")
      .delete()
      .eq("user_id", user.id)
      .like("story_id", "CH%");
    cookieStore.set(READER_CHAPTER_COOKIE, "CH00", {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  if (body.chapterId) {
    const num = chapterNumberFromStoryId(body.chapterId);
    if (num !== null) {
      cookieStore.set(READER_CHAPTER_COOKIE, `CH${String(num).padStart(2, "0")}`, {
        path: "/",
        httpOnly: false,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
  }

  if (typeof body.showAllContent === "boolean") {
    if (user) {
      await supabase
        .from("sb_profiles")
        .update({ show_all_content: body.showAllContent })
        .eq("id", user.id);
    }
  }

  return Response.json(await getReaderProgress());
}
