import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { chapterNumberFromStoryId } from "@/lib/wiki/story-ids";

export const READER_CHAPTER_COOKIE = "celestial_ch";

export interface ReaderProgress {
  readStoryIds: string[];
  currentChapter: string;
  currentChapterNumber: number;
  showAllContent: boolean;
}

function chapterIdForNumber(num: number): string {
  return `CH${String(Math.max(0, num)).padStart(2, "0")}`;
}

function maxChapterFromStoryIds(storyIds: string[]): number {
  let max = 0;
  for (const id of storyIds) {
    const num = chapterNumberFromStoryId(id);
    if (num !== null && num > max) max = num;
  }
  return max;
}

export function isStoryUnlocked(
  storyId: string,
  progress: ReaderProgress
): boolean {
  if (progress.showAllContent) return true;
  const chapterNum = chapterNumberFromStoryId(storyId);
  if (chapterNum === null) return true;
  return chapterNum <= progress.currentChapterNumber;
}

export async function getReaderProgress(): Promise<ReaderProgress> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const cookieStore = await cookies();
  const cookieChapter = cookieStore.get(READER_CHAPTER_COOKIE)?.value || "CH00";
  const cookieChapterNum = chapterNumberFromStoryId(cookieChapter) ?? 0;

  if (!user) {
    return {
      readStoryIds: [],
      currentChapter: chapterIdForNumber(cookieChapterNum),
      currentChapterNumber: cookieChapterNum,
      showAllContent: false,
    };
  }

  const [{ data: reads }, { data: profile }] = await Promise.all([
    supabase.from("sb_story_reads").select("story_id").eq("user_id", user.id),
    supabase
      .from("sb_profiles")
      .select("show_all_content")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const readStoryIds = (reads ?? []).map((row) => row.story_id);
  const maxFromReads = maxChapterFromStoryIds(readStoryIds);
  const currentChapterNumber = Math.max(maxFromReads, cookieChapterNum);
  return {
    readStoryIds,
    currentChapter: chapterIdForNumber(currentChapterNumber),
    currentChapterNumber,
    showAllContent: Boolean(profile?.show_all_content),
  };
}
