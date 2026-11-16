import { HomePageClient } from "@/components/home/HomePageClient";
import { createClient } from "@/lib/supabase/server";
import { getCanonicalStories } from "@/lib/wiki/corpus";
import { getChapterTags } from "@/lib/wiki/chapter-tags";
import {
  getLastChapterNumber,
  getReaderProgress,
  nextChapterId,
} from "@/lib/progress/reader-progress";

export default async function HomePage() {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    progress,
    stories,
  ] = await Promise.all([
    supabase.auth.getUser(),
    getReaderProgress(),
    getCanonicalStories(),
  ]);

  const lastChapter = getLastChapterNumber();
  const finished =
    progress.showAllContent || progress.currentChapterNumber >= lastChapter;
  const nextId = nextChapterId(progress);
  const nextTitle = stories.find((s) => s.storyId === nextId)?.title ?? null;

  // "Where you left off": the last finished chapter and its one-line recap.
  const lastFinishedId =
    !finished && progress.currentChapterNumber > 0
      ? `CH${String(progress.currentChapterNumber).padStart(2, "0")}`
      : null;
  const leftOff = lastFinishedId
    ? {
        title:
          stories.find((s) => s.storyId === lastFinishedId)?.title ??
          lastFinishedId,
        recap: getChapterTags(lastFinishedId)?.summary?.trim() || null,
      }
    : null;

  return (
    <HomePageClient
      leftOff={leftOff}
      signedIn={Boolean(user)}
      chapterCount={lastChapter}
      reading={{
        state: finished
          ? "finished"
          : progress.currentChapterNumber > 0
          ? "reading"
          : "new",
        nextHref: finished ? "/stories" : `/stories/${nextId}`,
        nextTitle,
        finishedCount: Math.min(progress.currentChapterNumber, lastChapter),
      }}
    />
  );
}
