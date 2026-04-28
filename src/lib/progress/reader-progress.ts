import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { chapterNumberFromStoryId } from "@/lib/wiki/story-ids";
import { storiesData } from "@/lib/wiki/static-data";

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

function getChapterStoryIds(): string[] {
  return storiesData
    .filter((story) => /^CH\d+/i.test(story.storyId))
    .map((story) => story.storyId);
}

export function getCompanionDefaultChapterNumber(): number {
  return maxChapterFromStoryIds(getChapterStoryIds());
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
  // Product direction shift: Celestial is now a companion-first app.
  // Default progression should expose the full published story set.
  const defaultChapterNum = getCompanionDefaultChapterNumber();
  const defaultReadStoryIds = getChapterStoryIds();

  if (!user) {
    return {
      readStoryIds: defaultReadStoryIds,
      currentChapter: chapterIdForNumber(Math.max(cookieChapterNum, defaultChapterNum)),
      currentChapterNumber: Math.max(cookieChapterNum, defaultChapterNum),
      showAllContent: false,
    };
  }

  const [{ data: reads }, { data: profile }] = await Promise.all([
    supabase.from("cel_story_reads").select("story_id").eq("user_id", user.id),
    supabase
      .from("cel_profiles")
      .select("show_all_content")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const readStoryIdsFromDb = (reads ?? []).map((row) => row.story_id);
  const readStoryIds =
    readStoryIdsFromDb.length > 0 ? readStoryIdsFromDb : defaultReadStoryIds;
  const maxFromReads = maxChapterFromStoryIds(readStoryIds);
  const currentChapterNumber = Math.max(maxFromReads, cookieChapterNum, defaultChapterNum);
  return {
    readStoryIds,
    currentChapter: chapterIdForNumber(currentChapterNumber),
    currentChapterNumber,
    showAllContent: Boolean(profile?.show_all_content),
  };
}
