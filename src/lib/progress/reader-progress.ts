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

/** Highest published chapter number (the end of the book as shipped). */
export function getLastChapterNumber(): number {
  return maxChapterFromStoryIds(getChapterStoryIds());
}

/**
 * Lore gate: content tagged to a chapter is visible once the reader has
 * finished that chapter. `currentChapterNumber` is the last chapter finished.
 */
export function isStoryUnlocked(
  storyId: string,
  progress: ReaderProgress
): boolean {
  if (progress.showAllContent) return true;
  const chapterNum = chapterNumberFromStoryId(storyId);
  if (chapterNum === null) return true;
  return chapterNum <= progress.currentChapterNumber;
}

/**
 * Reading gate: a reader can always open the chapter after the last one they
 * finished, so the next chapter is never locked.
 */
export function canOpenChapter(
  storyId: string,
  progress: ReaderProgress
): boolean {
  if (progress.showAllContent) return true;
  const chapterNum = chapterNumberFromStoryId(storyId);
  if (chapterNum === null) return true;
  return chapterNum <= progress.currentChapterNumber + 1;
}

/** The chapter the reader should open next (capped at the last chapter). */
export function nextChapterId(progress: ReaderProgress): string {
  const last = getLastChapterNumber();
  const next = Math.min(progress.currentChapterNumber + 1, Math.max(last, 1));
  return chapterIdForNumber(next);
}

/**
 * The reader's real place in the book. Signed-in readers: the highest chapter
 * marked read (or the guest cookie carried over from before sign-up). Guests:
 * the cookie alone. Nobody is floored at the latest chapter — spoiler gates
 * depend on this number being true. Re-reader mode (`showAllContent`) is the
 * way to open the whole book.
 */
export async function getReaderProgress(): Promise<ReaderProgress> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const cookieStore = await cookies();
  const cookieChapter = cookieStore.get(READER_CHAPTER_COOKIE)?.value || "CH00";
  const lastChapter = getLastChapterNumber();
  const cookieChapterNum = Math.min(
    chapterNumberFromStoryId(cookieChapter) ?? 0,
    lastChapter
  );

  if (!user) {
    return {
      readStoryIds: [],
      currentChapter: chapterIdForNumber(cookieChapterNum),
      currentChapterNumber: cookieChapterNum,
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

  const readStoryIds = (reads ?? []).map((row) => row.story_id);
  const currentChapterNumber = Math.min(
    Math.max(maxChapterFromStoryIds(readStoryIds), cookieChapterNum),
    lastChapter
  );
  return {
    readStoryIds,
    currentChapter: chapterIdForNumber(currentChapterNumber),
    currentChapterNumber,
    showAllContent: Boolean(profile?.show_all_content),
  };
}
