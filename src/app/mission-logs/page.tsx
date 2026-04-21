import Link from "next/link";
import { getMissionLogInventory } from "@/lib/wiki/parser";
import { getReaderProgress, isStoryUnlocked } from "@/lib/progress/reader-progress";

export default async function MissionLogsPage() {
  const inventory = getMissionLogInventory();
  if (!inventory) {
    return (
      <div className="mx-auto max-w-content px-[var(--page-padding-x)] py-8">
        <h1 className="type-page-title mb-2">Mission Logs</h1>
        <p className="type-ui text-ink-muted">No mission log inventory found yet.</p>
      </div>
    );
  }
  const progress = await getReaderProgress();
  const visible = inventory.missionLogs.filter((row) =>
    isStoryUnlocked(row.chapterId, progress)
  );

  return (
    <div className="mx-auto max-w-wide px-[var(--page-padding-x)] py-6 md:py-10">
      <div className="mx-auto max-w-content">
        <h1 className="type-page-title mb-2">Mission Logs</h1>
        <p className="type-ui mb-3 text-ink-muted">
          Structured ship-log entries extracted from chapter artifacts.
        </p>
        <p className="type-meta mb-8 text-ink-ghost">{visible.length} visible logs</p>
        <div className="space-y-2">
          {visible.map((row) => (
            <Link
              key={row.logId}
              href={`/mission-logs/${encodeURIComponent(row.logId)}`}
              className="block rounded-lg border border-[var(--color-border)] bg-warm-white p-3 transition-colors hover:border-clay-border"
            >
              <span className="type-ui block text-ink">
                {row.logId} - {row.summary || "Mission log entry"}
              </span>
              <span className="mt-0.5 block text-xs text-ink-muted">
                {row.chapterId} - {row.author || "Unknown author"} - {row.logType || "n/a"}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
