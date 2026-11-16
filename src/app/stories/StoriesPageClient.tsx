"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { book } from "@/config/book";
import type { StoryCard } from "@/lib/wiki/static-data";
import { chapterNumberFromStoryId } from "@/lib/wiki/story-ids";

type ChapterState = "finished" | "open" | "locked" | "account";

export function StoriesPageClient({
  stories,
  readStoryIds,
  currentChapterNumber,
  showAllContent,
  signedIn,
  freeChapterIds,
}: {
  stories: StoryCard[];
  readStoryIds: string[];
  currentChapterNumber: number;
  showAllContent: boolean;
  signedIn: boolean;
  freeChapterIds: string[];
}) {
  const [search, setSearch] = useState("");
  const readSet = useMemo(() => new Set(readStoryIds), [readStoryIds]);

  const chapters = useMemo(
    () =>
      stories
        .map((story) => ({
          story,
          number: chapterNumberFromStoryId(story.storyId),
        }))
        .filter(
          (c): c is { story: StoryCard; number: number } => c.number !== null
        )
        .sort((a, b) => a.number - b.number),
    [stories]
  );

  function stateFor(storyId: string, number: number): ChapterState {
    if (!signedIn && !freeChapterIds.includes(storyId)) return "account";
    if (showAllContent) return readSet.has(storyId) ? "finished" : "open";
    if (number <= currentChapterNumber) return "finished";
    if (number === currentChapterNumber + 1) return "open";
    return "locked";
  }

  const q = search.trim().toLowerCase();
  const filtered = chapters.filter(({ story, number }) => {
    if (!q) return true;
    const state = stateFor(story.storyId, number);
    // Only search text the reader is allowed to see.
    const haystack =
      state === "locked" || state === "account"
        ? story.title
        : `${story.title} ${story.summary}`;
    return haystack.toLowerCase().includes(q);
  });

  const finishedCount = showAllContent
    ? chapters.length
    : Math.min(currentChapterNumber, chapters.length);

  return (
    <div className="mx-auto max-w-content px-[var(--page-padding-x)] py-6 md:py-10">
      <h1 className="type-page-title mb-2">Chapters</h1>
      <p className="type-ui mb-6 text-ink-muted">
        {signedIn
          ? showAllContent
            ? `${chapters.length} chapters — everything is open.`
            : `${finishedCount} of ${chapters.length} chapters finished.`
          : `${chapters.length} chapters of ${book.title}. Chapter 1 is free to read.`}
        {signedIn && (
          <>
            {" "}
            <Link
              href="/welcome?replay=1"
              className="text-burgundy underline underline-offset-2"
            >
              Move my bookmark
            </Link>
          </>
        )}
      </p>

      <div className="mb-6">
        <label htmlFor="chapter-search" className="sr-only">
          Search chapters
        </label>
        <input
          id="chapter-search"
          type="search"
          placeholder="Search chapters…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sci-input type-ui w-full border border-[var(--color-border)] bg-warm-white px-3 py-2 text-ink placeholder:text-ink-ghost"
        />
      </div>

      <ol className="list-none space-y-3">
        {filtered.length === 0 && (
          <li className="py-8 text-center text-sm text-ink-ghost">
            No chapters match your search.
          </li>
        )}
        {filtered.map(({ story, number }) => {
          const state = stateFor(story.storyId, number);
          const cardClass = "sci-panel block p-4";
          const title = (
            <h2 className="font-[family-name:var(--font-playfair)] text-base font-semibold text-ink transition-colors group-hover:text-burgundy">
              {story.title}
            </h2>
          );

          if (state === "locked") {
            return (
              <li key={story.storyId} className={`${cardClass} opacity-70`}>
                {title}
                <p className="mt-1 text-sm text-ink-ghost">
                  Opens when you finish chapter {number - 1}.
                </p>
              </li>
            );
          }

          if (state === "account") {
            return (
              <li key={story.storyId}>
                <Link
                  href={`/signup`}
                  className={`${cardClass} sci-card-link group no-underline`}
                >
                  {title}
                  <p className="mt-1 text-sm text-ink-muted">
                    Create a free account to keep reading.
                  </p>
                </Link>
              </li>
            );
          }

          return (
            <li key={story.storyId}>
              <Link
                href={`/stories/${story.storyId}`}
                className={`${cardClass} sci-card-link group no-underline`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {title}
                    <p className="mt-1 line-clamp-2 font-[family-name:var(--font-lora)] text-sm leading-relaxed text-ink-muted">
                      {story.summary}
                    </p>
                  </div>
                  <span
                    className={`sci-chip shrink-0 px-2 py-0.5 text-[11px] font-medium ${
                      state === "finished"
                        ? "bg-green-pale text-green"
                        : "bg-clay text-warm-white"
                    }`}
                  >
                    {state === "finished"
                      ? "Read"
                      : number === 1 && currentChapterNumber === 0
                      ? "Start here"
                      : "Up next"}
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
