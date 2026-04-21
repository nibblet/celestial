"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function StoriesHubTabs() {
  const pathname = usePathname();
  const onTimeline = pathname === "/stories/timeline";
  const onMissionLogs = pathname.startsWith("/mission-logs");
  const onChapters =
    !onTimeline &&
    !onMissionLogs &&
    (pathname === "/stories" ||
      (pathname.startsWith("/stories/") && pathname !== "/stories/timeline"));

  return (
    <div
      className="sticky top-0 z-[40] border-b border-[var(--color-border)] bg-warm-white/95 backdrop-blur-md md:top-[60px]"
      role="tablist"
      aria-label="Reading companion sections"
    >
      <div className="mx-auto flex max-w-content gap-1 px-[var(--page-padding-x)] py-2">
        <Link
          href="/stories"
          role="tab"
          aria-selected={onChapters}
          className={`flex-1 rounded-full px-2 py-2 text-center text-xs font-medium transition-colors sm:px-3 md:text-sm ${
            onChapters
              ? "bg-ink text-warm-white"
              : "bg-transparent text-ink-muted hover:text-ink"
          }`}
        >
          Chapters
        </Link>
        <Link
          href="/stories/timeline"
          role="tab"
          aria-selected={onTimeline}
          className={`flex-1 rounded-full px-2 py-2 text-center text-xs font-medium transition-colors sm:px-3 md:text-sm ${
            onTimeline
              ? "bg-ink text-warm-white"
              : "bg-transparent text-ink-muted hover:text-ink"
          }`}
        >
          Timeline
        </Link>
        <Link
          href="/mission-logs"
          role="tab"
          aria-selected={onMissionLogs}
          className={`flex-1 rounded-full px-2 py-2 text-center text-xs font-medium transition-colors sm:px-3 md:text-sm ${
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
