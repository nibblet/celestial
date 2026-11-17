"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { CodexEntry, CodexKind } from "@/lib/wiki/codex";

type KindFilter = CodexKind | "all";

/** A square image, or the entry's initial when it has none (or it fails). */
function Thumb({ src, name }: { src?: string; name: string }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- already resized by storage
      <img
        src={src}
        alt=""
        width={48}
        height={48}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className="h-12 w-12 shrink-0 rounded-md object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-[var(--color-border)] font-[family-name:var(--font-playfair)] text-lg text-ink-ghost"
    >
      {name.replace(/^the\s+/i, "").charAt(0).toUpperCase()}
    </span>
  );
}

export function CodexClient({
  entries,
  thumbnails,
  isAuthor,
  hiddenCount,
  kinds,
  initialKind,
  currentChapterNumber,
  lastChapterNumber,
  showAllContent,
}: {
  entries: CodexEntry[];
  /** Entity slug → image URL, for entries that have an approved image. */
  thumbnails: Record<string, string>;
  /** The author also gets a filter for entries still missing an image. */
  isAuthor: boolean;
  hiddenCount: number;
  kinds: { kind: CodexKind; label: string; singular: string }[];
  initialKind: KindFilter;
  currentChapterNumber: number;
  lastChapterNumber: number;
  showAllContent: boolean;
}) {
  const [kind, setKind] = useState<KindFilter>(initialKind);
  const [search, setSearch] = useState("");
  const [missingOnly, setMissingOnly] = useState(false);
  const missingCount = entries.filter((e) => !thumbnails[e.slug]).length;

  const counts = useMemo(() => {
    const out = new Map<CodexKind, number>();
    for (const e of entries) out.set(e.kind, (out.get(e.kind) ?? 0) + 1);
    return out;
  }, [entries]);
  const singular = useMemo(
    () => new Map(kinds.map((k) => [k.kind, k.singular])),
    [kinds]
  );

  const q = search.trim().toLowerCase();
  const filtered = entries.filter(
    (e) =>
      (kind === "all" || e.kind === kind) &&
      (!q || e.name.toLowerCase().includes(q)) &&
      (!missingOnly || !thumbnails[e.slug])
  );

  const wholeBook = showAllContent || currentChapterNumber >= lastChapterNumber;
  const chip = (active: boolean) =>
    `sci-chip type-meta shrink-0 px-3 py-1.5 transition-colors ${
      active
        ? "bg-ink text-warm-white"
        : "bg-warm-white text-ink-muted ring-1 ring-[var(--color-border)] hover:text-ink"
    }`;

  return (
    <div className="mx-auto max-w-content px-[var(--page-padding-x)] py-6 md:py-10">
      <h1 className="type-page-title mb-2">Codex</h1>
      <p className="type-ui mb-6 text-ink-muted">
        {wholeBook
          ? "Everyone and everything in the book."
          : currentChapterNumber === 0
          ? "The people, places and rules of the world appear here as you meet them."
          : `Everyone and everything you've met through chapter ${currentChapterNumber}.`}
      </p>

      {entries.length === 0 ? (
        <div className="sci-panel p-6">
          <p className="font-[family-name:var(--font-lora)] text-base text-ink">
            Nothing here yet — the codex fills in as you read. Finish chapter 1
            and its characters, places and rules will be waiting.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/stories/CH01"
              className="rounded-lg bg-clay px-4 py-2.5 text-sm font-medium text-warm-white no-underline transition-colors hover:bg-clay-mid"
            >
              Read chapter 1
            </Link>
            <Link
              href="/welcome?replay=1"
              className="rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-ink no-underline transition-colors hover:border-clay-border"
            >
              I&apos;m further along
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-6 space-y-3">
            <label htmlFor="codex-search" className="sr-only">
              Search the codex
            </label>
            <input
              id="codex-search"
              type="search"
              placeholder="Search by name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sci-input type-ui w-full border border-[var(--color-border)] bg-warm-white px-3 py-2 text-ink placeholder:text-ink-ghost"
            />
            <div
              className="flex gap-2 overflow-x-auto pb-1"
              role="group"
              aria-label="Filter by type"
            >
              <button
                type="button"
                aria-pressed={kind === "all"}
                onClick={() => setKind("all")}
                className={chip(kind === "all")}
              >
                All · {entries.length}
              </button>
              {kinds
                .filter((k) => (counts.get(k.kind) ?? 0) > 0)
                .map((k) => (
                  <button
                    key={k.kind}
                    type="button"
                    aria-pressed={kind === k.kind}
                    onClick={() => setKind(k.kind)}
                    className={chip(kind === k.kind)}
                  >
                    {k.label} · {counts.get(k.kind)}
                  </button>
                ))}
              {isAuthor && missingCount > 0 && (
                <button
                  type="button"
                  aria-pressed={missingOnly}
                  onClick={() => setMissingOnly((v) => !v)}
                  className={chip(missingOnly)}
                >
                  No image · {missingCount}
                </button>
              )}
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-ghost">
              Nothing matches — or you haven&apos;t met it yet.
            </p>
          ) : (
            <ul className="grid list-none gap-2 sm:grid-cols-2">
              {filtered.map((e) => (
                <li key={`${e.kind}:${e.slug}`}>
                  <Link
                    href={e.href}
                    className="sci-panel sci-card-link group flex items-center gap-3 px-2.5 py-2 no-underline"
                  >
                    <Thumb src={thumbnails[e.slug]} name={e.name} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-[family-name:var(--font-playfair)] text-base text-ink transition-colors group-hover:text-burgundy">
                        {e.name}
                      </span>
                      <span className="type-meta block normal-case tracking-normal text-ink-ghost">
                        {singular.get(e.kind)}
                        {e.firstChapter !== null ? ` · ch. ${e.firstChapter}` : ""}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {hiddenCount > 0 && entries.length > 0 && (
        <p className="type-ui mt-8 text-center text-ink-ghost">
          {hiddenCount} more {hiddenCount === 1 ? "entry" : "entries"} will
          appear as you read on.
        </p>
      )}
    </div>
  );
}
