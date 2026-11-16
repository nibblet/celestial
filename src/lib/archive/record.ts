import { getAllChapterTags, type ChapterTagKind } from "@/lib/wiki/chapter-tags";
import { chapterNumberFromStoryId } from "@/lib/wiki/story-ids";
import type { ReaderProgress } from "@/lib/progress/reader-progress";

export interface ChapterRecordEntry {
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  /** What the chapter puts on record about this entry. */
  text: string;
}

/**
 * A file's record, chapter by chapter, built from the chapter tags. For a
 * spoiler-safe reader it stops at their bookmark, so the same file grows as
 * they read on without a hand-written "story so far" version.
 */
export function getChapterRecord(
  kind: ChapterTagKind,
  slug: string,
  progress: Pick<ReaderProgress, "currentChapterNumber" | "showAllContent">
): ChapterRecordEntry[] {
  const out: ChapterRecordEntry[] = [];
  for (const record of getAllChapterTags()) {
    const n = chapterNumberFromStoryId(record.chapterId);
    if (n === null) continue;
    if (!progress.showAllContent && n > progress.currentChapterNumber) continue;
    const ref = record[kind].find((r) => r.slug === slug);
    if (!ref || !ref.justification.trim()) continue;
    out.push({
      chapterId: record.chapterId,
      chapterNumber: n,
      chapterTitle: record.title.replace(/^Chapter\s+\d+:\s*/i, ""),
      text: ref.justification.trim(),
    });
  }
  return out.sort((a, b) => a.chapterNumber - b.chapterNumber);
}
