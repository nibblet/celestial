import Link from "next/link";
import { notFound } from "next/navigation";
import { getMissionLogInventory } from "@/lib/wiki/parser";
import { getReaderProgress, isStoryUnlocked } from "@/lib/progress/reader-progress";

export default async function MissionLogDetailPage({
  params,
}: {
  params: Promise<{ logId: string }>;
}) {
  const { logId } = await params;
  const decoded = decodeURIComponent(logId);
  const inventory = getMissionLogInventory();
  if (!inventory) notFound();
  const row = inventory.missionLogs.find((item) => item.logId === decoded);
  if (!row) notFound();
  const progress = await getReaderProgress();
  if (!isStoryUnlocked(row.chapterId, progress)) notFound();

  return (
    <div className="mx-auto max-w-content px-[var(--page-padding-x)] py-6 md:py-10">
      <Link
        href="/mission-logs"
        className="type-ui mb-4 inline-block text-ink-ghost no-underline transition-colors hover:text-ocean"
      >
        &larr; All mission logs
      </Link>
      <h1 className="type-page-title mb-1">{row.logId}</h1>
      <p className="text-sm text-ink-muted">
        {row.chapterId} -{" "}
        <Link href={`/stories/${row.chapterId}`} className="text-ocean hover:underline">
          {row.chapterTitle}
        </Link>
      </p>

      <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-warm-white p-5">
        <p className="text-sm text-ink-muted">
          <strong>Author:</strong> {row.author || "n/a"} | <strong>Type:</strong>{" "}
          {row.logType || "n/a"} | <strong>Location:</strong> {row.location || "n/a"}
        </p>
        <p className="mt-3 text-sm text-ink">
          <strong>Summary:</strong> {row.summary || "n/a"}
        </p>
        <article className="prose prose-story mt-4 max-w-none">
          <p>{row.mainBody || row.summary || "No body content."}</p>
        </article>
      </div>
    </div>
  );
}
