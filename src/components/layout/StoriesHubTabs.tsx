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
      className="sticky top-0 z-[40] border-b border-[rgba(127,231,225,0.18)] bg-[rgba(13,20,28,0.94)] backdrop-blur-md md:top-[60px]"
      role="tablist"
      aria-label="Reading companion sections"
    >
      <div className="mx-auto flex max-w-content gap-1 px-[var(--page-padding-x)] py-2">
        <Link
          href="/stories"
          role="tab"
          aria-selected={onChapters}
          className={`sci-chip flex-1 px-2 py-2 text-center text-xs font-medium transition-colors sm:px-3 md:text-sm ${
            onChapters
              ? "bg-[#12343d] text-[#a8f2f0] shadow-[inset_0_0_0_1px_rgba(127,231,225,0.35)]"
              : "bg-transparent text-[#b8c2bf] hover:text-[#f2eee4]"
          }`}
        >
          Chapters
        </Link>
        <Link
          href="/stories/timeline"
          role="tab"
          aria-selected={onTimeline}
          className={`sci-chip flex-1 px-2 py-2 text-center text-xs font-medium transition-colors sm:px-3 md:text-sm ${
            onTimeline
              ? "bg-[#12343d] text-[#a8f2f0] shadow-[inset_0_0_0_1px_rgba(127,231,225,0.35)]"
              : "bg-transparent text-[#b8c2bf] hover:text-[#f2eee4]"
          }`}
        >
          Timeline
        </Link>
        <Link
          href="/mission-logs"
          role="tab"
          aria-selected={onMissionLogs}
          className={`sci-chip flex-1 px-2 py-2 text-center text-xs font-medium transition-colors sm:px-3 md:text-sm ${
            onMissionLogs
              ? "bg-[#12343d] text-[#a8f2f0] shadow-[inset_0_0_0_1px_rgba(127,231,225,0.35)]"
              : "bg-transparent text-[#b8c2bf] hover:text-[#f2eee4]"
          }`}
        >
          Mission Logs
        </Link>
      </div>
    </div>
  );
}
