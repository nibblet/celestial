"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { book } from "@/config/book";

type Chapter = { number: number; title: string };
type Choice = "start" | "reading" | "finished";

type BookmarkSetupProps = {
  chapters: Chapter[];
  displayName: string;
  /** True when a reader reopens this from their profile to move the bookmark. */
  replay: boolean;
  initialFinishedThrough: number;
  initialShowAll: boolean;
};

function chapterId(n: number): string {
  return `CH${String(n).padStart(2, "0")}`;
}

/**
 * The one onboarding question: where is the reader in the book? The answer
 * becomes the bookmark every spoiler gate reads (chapters, lore pages, Ask).
 */
export function BookmarkSetup({
  chapters,
  displayName,
  replay,
  initialFinishedThrough,
  initialShowAll,
}: BookmarkSetupProps) {
  const router = useRouter();
  const lastChapter = chapters.length ? chapters[chapters.length - 1]!.number : 1;
  const [choice, setChoice] = useState<Choice>(
    initialShowAll
      ? "finished"
      : initialFinishedThrough > 0
      ? "reading"
      : "start"
  );
  // "I'm on chapter N" means chapters 1..N-1 are finished.
  const [onChapter, setOnChapter] = useState(
    Math.min(Math.max(initialFinishedThrough + 1, 2), lastChapter)
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    const finishedThrough =
      choice === "start" ? 0 : choice === "reading" ? onChapter - 1 : lastChapter;
    try {
      const res = await fetch("/api/reader/progress", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          finishedThrough,
          showAllContent: choice === "finished",
        }),
      });
      if (!res.ok) throw new Error("save failed");
      const done = await fetch("/api/profile/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replay }),
      });
      // Without this the sign-in gate would send them straight back here.
      if (!done.ok) throw new Error("onboarding failed");
    } catch {
      setError("We couldn't save your place. Check your connection and try again.");
      setSubmitting(false);
      return;
    }
    const destination = replay
      ? "/profile"
      : choice === "finished"
      ? "/"
      : `/stories/${chapterId(choice === "start" ? 1 : onChapter)}`;
    router.push(destination);
    router.refresh();
  }

  const options: { value: Choice; title: string; body: string }[] = [
    {
      value: "start",
      title: "Just starting",
      body: "Begin at chapter 1. The companion opens up as you read.",
    },
    {
      value: "reading",
      title: "Partway through",
      body: "Tell us the chapter you're on. Everything before it is unlocked.",
    },
    {
      value: "finished",
      title: "I've finished it",
      body: "Open everything: every chapter, every character, every log.",
    },
  ];

  return (
    <div className="mx-auto max-w-2xl px-[var(--page-padding-x)] py-10 md:py-14">
      <div className="mb-8 text-center">
        <p className="type-era-label mb-2 text-ink-muted">
          {replay
            ? "Move your bookmark"
            : `Welcome${displayName ? `, ${displayName}` : ""}`}
        </p>
        <h1 className="type-page-title text-balance">
          Where are you in {book.title}?
        </h1>
        <p className="type-ui mx-auto mt-3 max-w-md text-ink-muted">
          Characters, places, mission logs and Ask only show what you have
          already read. You can change this any time from your profile.
        </p>
      </div>

      <fieldset className="space-y-3" disabled={submitting}>
        <legend className="sr-only">Your place in the book</legend>
        {options.map((opt) => {
          const selected = choice === opt.value;
          return (
            <label
              key={opt.value}
              className={`sci-panel block cursor-pointer p-4 transition-colors md:p-5 ${
                selected ? "!border-clay" : ""
              }`}
            >
              <span className="flex items-start gap-3">
                <input
                  type="radio"
                  name="place"
                  value={opt.value}
                  checked={selected}
                  onChange={() => setChoice(opt.value)}
                  className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-clay)]"
                />
                <span className="min-w-0 flex-1">
                  <span className="type-story-title block text-lg">
                    {opt.title}
                  </span>
                  <span className="mt-1 block font-[family-name:var(--font-lora)] text-sm leading-relaxed text-ink-muted">
                    {opt.body}
                  </span>
                  {opt.value === "reading" && selected && (
                    <span className="mt-3 block">
                      <label
                        htmlFor="on-chapter"
                        className="type-meta mb-1 block text-ink"
                      >
                        I&apos;m on
                      </label>
                      <select
                        id="on-chapter"
                        value={onChapter}
                        onChange={(e) => setOnChapter(Number(e.target.value))}
                        className="sci-input type-ui w-full border border-[var(--color-border)] bg-warm-white px-3 py-2 text-ink"
                      >
                        {chapters
                          .filter((c) => c.number >= 2)
                          .map((c) => (
                            <option key={c.number} value={c.number}>
                              {c.title}
                            </option>
                          ))}
                      </select>
                    </span>
                  )}
                </span>
              </span>
            </label>
          );
        })}
      </fieldset>

      {error && (
        <p role="alert" className="notice-error mt-4 rounded-lg p-3 text-sm">
          {error}
        </p>
      )}

      <div className="mt-6 flex items-center justify-end gap-3">
        {replay && (
          <button
            type="button"
            onClick={() => router.push("/profile")}
            disabled={submitting}
            className="type-ui min-h-[44px] rounded-full px-4 text-ink-muted transition-colors hover:text-ink disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={save}
          disabled={submitting}
          className="type-ui min-h-[44px] rounded-full bg-clay px-6 font-medium text-warm-white transition-colors hover:bg-clay-mid disabled:opacity-60"
        >
          {submitting
            ? "Saving…"
            : replay
            ? "Save my place"
            : choice === "finished"
            ? "Open the companion"
            : "Start reading"}
        </button>
      </div>
    </div>
  );
}
