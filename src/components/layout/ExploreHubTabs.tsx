"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function ExploreHubTabs() {
  const pathname = usePathname();
  const onJourneys = pathname.startsWith("/journeys");
  const onPrinciples = pathname.startsWith("/principles");
  const onPeople = pathname.startsWith("/people");

  return (
    <div
      className="sticky top-0 z-[40] border-b border-[var(--color-border)] bg-warm-white/95 backdrop-blur-md md:top-[60px]"
      role="tablist"
      aria-label="Explore section"
    >
      <div className="mx-auto flex max-w-content gap-1 px-[var(--page-padding-x)] py-2">
        <Link
          href="/journeys"
          role="tab"
          aria-selected={onJourneys}
          className={`flex-1 rounded-full px-3 py-2 text-center text-xs font-medium transition-colors md:text-sm ${
            onJourneys
              ? "bg-ink text-warm-white"
              : "bg-transparent text-ink-muted hover:text-ink"
          }`}
        >
          Journeys
        </Link>
        <Link
          href="/principles"
          role="tab"
          aria-selected={onPrinciples}
          className={`flex-1 rounded-full px-3 py-2 text-center text-xs font-medium transition-colors md:text-sm ${
            onPrinciples
              ? "bg-ink text-warm-white"
              : "bg-transparent text-ink-muted hover:text-ink"
          }`}
        >
          Principles
        </Link>
        <Link
          href="/people"
          role="tab"
          aria-selected={onPeople}
          className={`flex-1 rounded-full px-3 py-2 text-center text-xs font-medium transition-colors md:text-sm ${
            onPeople
              ? "bg-ink text-warm-white"
              : "bg-transparent text-ink-muted hover:text-ink"
          }`}
        >
          People
        </Link>
      </div>
    </div>
  );
}
