"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CorrectionActions({
  correctionId,
  currentStatus,
}: {
  correctionId: string;
  currentStatus: "open" | "resolved";
}) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function toggleStatus() {
    if (busy) return;
    setBusy(true);
    const newStatus = currentStatus === "open" ? "resolved" : "open";
    await fetch(`/api/admin/corrections/${correctionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    router.refresh();
    setBusy(false);
  }

  async function handleDelete() {
    if (busy) return;
    setBusy(true);
    await fetch(`/api/admin/corrections/${correctionId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={toggleStatus}
        disabled={busy}
        className={`type-ui text-xs transition-colors disabled:opacity-40 ${
          currentStatus === "open"
            ? "text-green hover:text-green/70"
            : "text-ink-ghost hover:text-ink"
        }`}
      >
        {busy
          ? "Saving\u2026"
          : currentStatus === "open"
            ? "Mark resolved"
            : "Reopen"}
      </button>
      <span className="text-ink-ghost/40">·</span>
      <button
        type="button"
        onClick={handleDelete}
        disabled={busy}
        className="type-ui text-xs text-ink-ghost transition-colors hover:text-red-600 disabled:opacity-40"
      >
        Delete
      </button>
    </div>
  );
}
