import Link from "next/link";
import type { ChapterRecordEntry } from "@/lib/archive/record";

/**
 * A file's record, chapter by chapter. For a spoiler-safe reader the entries
 * stop at their bookmark and `partial` explains why the rest is not shown.
 */
export function ChapterRecord({
  entries,
  partial,
}: {
  entries: ChapterRecordEntry[];
  /** True when later chapters are held back for a spoiler-safe reader. */
  partial: boolean;
}) {
  if (entries.length === 0 && !partial) return null;
  return (
    <section aria-label="On record, by chapter" className="mb-8">
      <h2 className="mb-3 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-ink-ghost">
        On record · by chapter
      </h2>
      {entries.length > 0 ? (
        <ol className="list-none space-y-3">
          {entries.map((entry) => (
            <li key={entry.chapterId} className="flex gap-3">
              <Link
                href={`/stories/${entry.chapterId}`}
                className="w-12 shrink-0 pt-0.5 font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-ocean no-underline hover:text-burgundy"
                aria-label={`Chapter ${entry.chapterNumber}: ${entry.chapterTitle}`}
              >
                Ch {entry.chapterNumber}
              </Link>
              <p className="font-[family-name:var(--font-lora)] text-[0.9375rem] leading-relaxed text-ink-muted">
                {entry.text}
              </p>
            </li>
          ))}
        </ol>
      ) : null}
      {partial ? (
        <p className="mt-4 rounded-lg border border-[var(--color-border)] bg-warm-white px-3 py-2 text-sm text-ink-muted">
          {entries.length > 0
            ? "This file shows only what is on record up to your bookmark. It grows as you read on."
            : "Nothing is on record for this file up to your bookmark yet."}{" "}
          <Link href="/welcome?replay=1" className="text-ocean underline underline-offset-2">
            Open the whole book
          </Link>
        </p>
      ) : null}
    </section>
  );
}
