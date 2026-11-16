import Link from "next/link";
import { getMissionLogInventory } from "@/lib/wiki/parser";
import { getCanonicalStories } from "@/lib/wiki/corpus";
import { getReaderProgress, isStoryUnlocked } from "@/lib/progress/reader-progress";

export default async function MissionLogsPage() {
  const inventory = getMissionLogInventory();
  if (!inventory) {
    return (
      <div className="mx-auto max-w-content px-[var(--page-padding-x)] py-8">
        <h1 className="type-page-title mb-2">Mission Logs</h1>
        <p className="type-ui text-ink-muted">No mission logs yet.</p>
      </div>
    );
  }
  const [progress, stories] = await Promise.all([
    getReaderProgress(),
    getCanonicalStories(),
  ]);
  const titles = new Map(stories.map((s) => [s.storyId, s.title]));
  const visible = inventory.missionLogs.filter((row) =>
    isStoryUnlocked(row.chapterId, progress)
  );
  const hidden = inventory.missionLogs.length - visible.length;

  // Logs live with the chapter they were filed in.
  const byChapter = new Map<string, typeof visible>();
  for (const row of visible) {
    const list = byChapter.get(row.chapterId) ?? [];
    list.push(row);
    byChapter.set(row.chapterId, list);
  }
  const chapters = [...byChapter.keys()].sort();

  return (
    <div className="mx-auto max-w-content px-[var(--page-padding-x)] py-6 md:py-10">
      <h1 className="type-page-title mb-2">Mission Logs</h1>
      <p className="type-ui mb-8 text-ink-muted">
        The log entries filed during each chapter you&apos;ve finished.
      </p>

      {visible.length === 0 && (
        <div className="sci-panel p-6">
          <p className="font-[family-name:var(--font-lora)] text-base text-ink">
            No logs yet — they appear here as you finish each chapter.
          </p>
        </div>
      )}

      <div className="space-y-8">
        {chapters.map((chapterId) => (
          <section key={chapterId} aria-labelledby={`logs-${chapterId}`}>
            <h2
              id={`logs-${chapterId}`}
              className="mb-3 font-[family-name:var(--font-playfair)] text-lg font-semibold text-ink"
            >
              <Link
                href={`/stories/${chapterId}`}
                className="no-underline hover:text-burgundy"
              >
                {titles.get(chapterId) ?? chapterId}
              </Link>
            </h2>
            <div className="space-y-2">
              {byChapter.get(chapterId)!.map((row) => (
                <Link
                  key={row.logId}
                  href={`/mission-logs/${encodeURIComponent(row.logId)}`}
                  className="block rounded-lg border border-[var(--color-border)] bg-warm-white p-3 no-underline transition-colors hover:border-clay-border"
                >
                  <span className="type-ui block text-ink">
                    {row.summary || "Mission log entry"}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-muted">
                    {[row.author, row.logType].filter(Boolean).join(" · ") ||
                      row.logId}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      {hidden > 0 && visible.length > 0 && (
        <p className="type-ui mt-8 text-center text-ink-ghost">
          {hidden} more {hidden === 1 ? "log" : "logs"} will appear as you read
          on.
        </p>
      )}
    </div>
  );
}
