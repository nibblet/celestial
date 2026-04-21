"use client";

import { useState } from "react";

export function ShowAllContentToggle({
  initialValue,
}: {
  initialValue: boolean;
}) {
  const [enabled, setEnabled] = useState(initialValue);
  const [saving, setSaving] = useState(false);

  async function onToggle(next: boolean) {
    setEnabled(next);
    setSaving(true);
    try {
      await fetch("/api/reader/progress", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showAllContent: next }),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-warm-white p-4">
      <p className="type-meta mb-1 text-ink">Re-reader mode</p>
      <p className="mb-3 text-sm text-ink-muted">
        When enabled, reveal chapter pages and lore details even if your read
        state has not reached them yet. This does not change which chapters are
        marked read — use Chapter progress below for bulk read/unread.
      </p>
      <button
        type="button"
        onClick={() => onToggle(!enabled)}
        disabled={saving}
        className={`rounded-md px-3 py-2 text-sm ${
          enabled
            ? "bg-ink text-warm-white"
            : "border border-[var(--color-border)] bg-warm-white text-ink"
        }`}
      >
        {enabled ? "Enabled" : "Disabled"}
      </button>
    </div>
  );
}
