import Link from "next/link";

export default function PrinciplesPage() {
  return (
    <div className="mx-auto max-w-content px-[var(--page-padding-x)] py-6 md:py-10">
      <h1 className="type-page-title mb-2">Principles</h1>
      <p className="type-ui mb-6 max-w-2xl text-ink-muted">
        Principle mapping is planned for Celestial and is not yet available in
        this release.
      </p>

      <div className="rounded-2xl border border-[var(--color-border)] bg-warm-white p-5 md:p-6">
        <p className="font-[family-name:var(--font-lora)] text-base text-ink">
          Coming soon: book-native principles with linked passages, supporting
          evidence, and guided reflection paths.
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
