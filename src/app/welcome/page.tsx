import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthenticatedProfileContext } from "@/lib/auth/profile-context";
import { getCanonicalStories } from "@/lib/wiki/corpus";
import { getReaderProgress } from "@/lib/progress/reader-progress";
import { chapterNumberFromStoryId } from "@/lib/wiki/story-ids";
import { book } from "@/config/book";
import { BookmarkSetup } from "./BookmarkSetup";

export const metadata: Metadata = {
  title: "Where are you in the book?",
  description: `Set your place in ${book.title} so the companion never spoils what you have not read.`,
};

type WelcomePageProps = {
  searchParams: Promise<{ replay?: string }>;
};

export default async function WelcomePage({ searchParams }: WelcomePageProps) {
  const { user, profile } = await getAuthenticatedProfileContext();

  if (!user) redirect("/login");

  const params = await searchParams;
  const replay = params.replay === "1";

  const displayName =
    (profile?.display_name?.trim() ||
      (typeof user.user_metadata?.display_name === "string"
        ? user.user_metadata.display_name
        : null) ||
      "").trim();

  const [stories, progress] = await Promise.all([
    getCanonicalStories(),
    getReaderProgress(),
  ]);
  const chapters = stories
    .map((s) => ({
      number: chapterNumberFromStoryId(s.storyId),
      title: s.title,
    }))
    .filter((c): c is { number: number; title: string } => c.number !== null)
    .sort((a, b) => a.number - b.number);

  return (
    <BookmarkSetup
      chapters={chapters}
      displayName={displayName}
      replay={replay}
      initialFinishedThrough={progress.currentChapterNumber}
      initialShowAll={progress.showAllContent}
    />
  );
}
