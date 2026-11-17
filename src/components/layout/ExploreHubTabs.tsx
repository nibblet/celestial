import Link from "next/link";

/**
 * Slim bar above every codex entry. The nine-tab Explore hub it replaced is
 * now the single searchable index at /codex.
 */
export function ExploreHubTabs() {
  return (
    <div className="sticky top-0 z-[40] border-b border-[var(--color-border)] bg-[rgba(13,20,28,0.92)] backdrop-blur-md md:top-[60px]">
      <div className="mx-auto flex max-w-content items-center px-[var(--page-padding-x)] py-2">
        <Link
          href="/codex"
          className="type-ui text-sm text-ink-muted no-underline transition-colors hover:text-ink"
        >
          &larr; Codex
        </Link>
      </div>
    </div>
  );
}
