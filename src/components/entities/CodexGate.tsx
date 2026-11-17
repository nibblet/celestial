import Link from "next/link";
import {
  findCodexEntry,
  isCodexEntryVisible,
  type CodexKind,
} from "@/lib/wiki/codex";
import {
  getLastChapterNumber,
  getReaderProgress,
  nextChapterId,
  type ReaderProgress,
} from "@/lib/progress/reader-progress";

/**
 * Page-level spoiler gate for codex entries. Returns the reader's progress
 * when the entry is hidden (so the caller can render <CodexLocked />), or
 * null when it is safe to show.
 */
export async function getCodexLock(
  kind: CodexKind,
  slug: string
): Promise<ReaderProgress | null> {
  const progress = await getReaderProgress();
  const entry = findCodexEntry(kind, slug);
  if (!entry) return progress.showAllContent ? null : progress;
  return isCodexEntryVisible(entry, progress) ? null : progress;
}

/** Whole-book material (character arc ledgers) opens only at the end. */
export async function getWholeBookLock(): Promise<ReaderProgress | null> {
  const progress = await getReaderProgress();
  const done =
    progress.showAllContent ||
    progress.currentChapterNumber >= getLastChapterNumber();
  return done ? null : progress;
}

export function CodexLocked({
  progress,
  wholeBook = false,
}: {
  progress: ReaderProgress;
  wholeBook?: boolean;
}) {
  return (
    <div className="mx-auto max-w-content px-[var(--page-padding-x)] py-10">
      <div className="sci-panel p-6">
        <h1 className="type-story-title">You haven&apos;t reached this yet</h1>
        <p className="mt-3 font-[family-name:var(--font-lora)] text-base text-ink-muted">
          {wholeBook
            ? "This page covers the whole book, so it opens once you've finished the last chapter."
            : "This entry belongs to a chapter beyond your bookmark. It will appear in the codex when you get there."}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={`/stories/${nextChapterId(progress)}`}
            className="rounded-lg bg-clay px-4 py-2.5 text-sm font-medium text-warm-white no-underline transition-colors hover:bg-clay-mid"
          >
            Keep reading
          </Link>
          <Link
            href="/codex"
            className="rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-ink no-underline transition-colors hover:border-clay-border"
          >
            Back to the codex
          </Link>
        </div>
      </div>
    </div>
  );
}
