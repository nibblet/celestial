import { book } from "@/config/book";
import { buildAskSuggestions } from "@/lib/ai/ask-suggestions";
import {
  getLastChapterNumber,
  getReaderProgress,
} from "@/lib/progress/reader-progress";
import { getCanonicalStoryById } from "@/lib/wiki/corpus";

/**
 * GET /api/ask/context — what Ask will answer through for this reader, plus
 * starter questions from the last chapter they finished.
 */
export async function GET() {
  const progress = await getReaderProgress();
  const last = getLastChapterNumber();
  const wholeBook =
    progress.showAllContent || progress.currentChapterNumber >= last;
  const through = wholeBook ? last : progress.currentChapterNumber;
  const story =
    through > 0
      ? await getCanonicalStoryById(`CH${String(through).padStart(2, "0")}`)
      : null;

  return Response.json({
    wholeBook,
    through,
    throughTitle: story?.title ?? null,
    suggestions: buildAskSuggestions(
      through,
      story?.title ?? null,
      book.title,
      wholeBook
    ),
  });
}
