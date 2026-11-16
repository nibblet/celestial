"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function UnpinButton({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/threads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId, pinned: false }),
        }).catch(() => {});
        router.refresh();
        setBusy(false);
      }}
      className="min-h-11 shrink-0 px-4 text-xs text-ink-muted underline underline-offset-2 disabled:opacity-50"
    >
      Unpin
    </button>
  );
}
