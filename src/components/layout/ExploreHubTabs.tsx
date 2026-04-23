"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function ExploreHubTabs() {
  const pathname = usePathname();
  const onJourneys = pathname.startsWith("/journeys") || pathname.startsWith("/arcs");
  const onPrinciples = pathname.startsWith("/principles");
  const onCharacters =
    pathname.startsWith("/characters") || pathname.startsWith("/people");
  const onArtifacts = pathname.startsWith("/artifacts");
  const onVaults = pathname.startsWith("/vaults");
  const onLocations = pathname.startsWith("/locations");
  const onFactions = pathname.startsWith("/factions");
  const onRules = pathname.startsWith("/rules");
  const onMissionLogs = pathname.startsWith("/mission-logs");

  return (
    <div
      className="sticky top-0 z-[40] border-b border-[var(--color-border)] bg-[rgba(13,20,28,0.92)] backdrop-blur-md md:top-[60px]"
      role="tablist"
      aria-label="Explore section"
    >
      <div className="mx-auto flex max-w-content flex-wrap gap-1 px-[var(--page-padding-x)] py-2">
        <Link
          href="/arcs"
          role="tab"
          aria-selected={onJourneys}
          className={`sci-chip flex-1 px-3 py-2 text-center text-xs font-medium transition-colors md:text-sm ${
            onJourneys
              ? "bg-ink text-warm-white"
              : "bg-transparent text-ink-muted hover:text-ink"
          }`}
        >
          Arcs
        </Link>
        <Link
          href="/principles"
          role="tab"
          aria-selected={onPrinciples}
          className={`sci-chip flex-1 px-3 py-2 text-center text-xs font-medium transition-colors md:text-sm ${
            onPrinciples
              ? "bg-ink text-warm-white"
              : "bg-transparent text-ink-muted hover:text-ink"
          }`}
        >
          Principles
        </Link>
        <Link
          href="/characters"
          role="tab"
          aria-selected={onCharacters}
          className={`sci-chip flex-1 px-3 py-2 text-center text-xs font-medium transition-colors md:text-sm ${
            onCharacters
              ? "bg-ink text-warm-white"
              : "bg-transparent text-ink-muted hover:text-ink"
          }`}
        >
          Characters
        </Link>
        <Link
          href="/artifacts"
          role="tab"
          aria-selected={onArtifacts}
          className={`sci-chip flex-1 px-3 py-2 text-center text-xs font-medium transition-colors md:text-sm ${
            onArtifacts
              ? "bg-ink text-warm-white"
              : "bg-transparent text-ink-muted hover:text-ink"
          }`}
        >
          Artifacts
        </Link>
        <Link
          href="/vaults"
          role="tab"
          aria-selected={onVaults}
          className={`sci-chip flex-1 px-3 py-2 text-center text-xs font-medium transition-colors md:text-sm ${
            onVaults
              ? "bg-ink text-warm-white"
              : "bg-transparent text-ink-muted hover:text-ink"
          }`}
        >
          Vaults
        </Link>
        <Link
          href="/locations"
          role="tab"
          aria-selected={onLocations}
          className={`sci-chip flex-1 px-3 py-2 text-center text-xs font-medium transition-colors md:text-sm ${
            onLocations
              ? "bg-ink text-warm-white"
              : "bg-transparent text-ink-muted hover:text-ink"
          }`}
        >
          Locations
        </Link>
        <Link
          href="/factions"
          role="tab"
          aria-selected={onFactions}
          className={`sci-chip flex-1 px-3 py-2 text-center text-xs font-medium transition-colors md:text-sm ${
            onFactions
              ? "bg-ink text-warm-white"
              : "bg-transparent text-ink-muted hover:text-ink"
          }`}
        >
          Factions
        </Link>
        <Link
          href="/rules"
          role="tab"
          aria-selected={onRules}
          className={`sci-chip flex-1 px-3 py-2 text-center text-xs font-medium transition-colors md:text-sm ${
            onRules
              ? "bg-ink text-warm-white"
              : "bg-transparent text-ink-muted hover:text-ink"
          }`}
        >
          Rules
        </Link>
        <Link
          href="/mission-logs"
          role="tab"
          aria-selected={onMissionLogs}
          className={`sci-chip flex-1 px-3 py-2 text-center text-xs font-medium transition-colors md:text-sm ${
            onMissionLogs
              ? "bg-ink text-warm-white"
              : "bg-transparent text-ink-muted hover:text-ink"
          }`}
        >
          Mission Logs
        </Link>
      </div>
    </div>
  );
}
