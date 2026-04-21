"use client";

import { useState } from "react";

export function ReaderChapterProgressActions() {
  const [busy, setBusy] = useState<"read" | "unread" | null>(null);

  async function run(kind: "read" | "unread") {
    setBusy(kind);
    try {
      await fetch("/api/reader/progress", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          kind === "read"
            ? { markAllChaptersRead: true }
            : { markAllChaptersUnread: true }
        ),
      });
      window.location.reload();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-warm-white p-4">
      <p className="type-meta mb-1 text-ink">Chapter progress</p>
      <p className="mb-3 text-sm text-ink-muted">
        Bulk actions update which Book I chapters count as read for unlocking the
        next chapter. They do not change Re-reader mode (which only affects
        spoilers and reveal gates).
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => run("read")}
          className="rounded-md bg-ink px-3 py-2 text-sm font-medium text-warm-white disabled:opacity-60"
        >
          {busy === "read" ? "Updating…" : "Mark all chapters read"}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => run("unread")}
          className="rounded-md border border-[var(--color-border)] bg-warm-white px-3 py-2 text-sm font-medium text-ink disabled:opacity-60"
        >
          {busy === "unread" ? "Resetting…" : "Mark all chapters unread"}
        </button>
      </div>
    </div>
  );
}
