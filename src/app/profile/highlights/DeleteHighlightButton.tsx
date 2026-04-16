"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteHighlightButton({
  highlightId,
}: {
  highlightId: string;
}) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (busy) return;
    setBusy(true);
    await fetch(`/api/profile/highlights/${highlightId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={busy}
      className="type-ui text-xs text-ink-ghost transition-colors hover:text-clay disabled:opacity-40"
    >
      {busy ? "Removing\u2026" : "Remove"}
    </button>
  );
}
