import Link from "next/link";

export default function ArcsPage() {
  return (
    <div className="mx-auto max-w-content px-[var(--page-padding-x)] py-6 md:py-10">
      <h1 className="type-page-title mb-2">Arcs</h1>
      <p className="type-ui mb-6 max-w-2xl text-ink-muted">
        Arc-based exploration is part of the Celestial roadmap and is not yet
        published in this release.
      </p>

      <div className="rounded-2xl border border-[var(--color-border)] bg-warm-white p-5 md:p-6">
        <p className="font-[family-name:var(--font-lora)] text-base text-ink">
          Coming soon: curated arc views that connect story beats, turning
          points, and thematic throughlines across the book.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/stories"
            className="type-ui inline-flex min-h-[44px] items-center justify-center rounded-lg bg-clay px-4 py-2.5 font-medium text-warm-white transition-colors hover:bg-clay-mid"
          >
            Browse Chapters
          </Link>
          <Link
            href="/ask"
            className="type-ui inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[var(--color-border)] bg-warm-white px-4 py-2.5 font-medium text-ink transition-colors hover:border-clay-border"
          >
            Ask Celestial
          </Link>
        </div>
      </div>
    </div>
  );
}
