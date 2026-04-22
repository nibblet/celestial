"use client";

import { useState } from "react";

type Props = {
  text: string;
  /** True when this render actually hit Anthropic. Cached renders set false. */
  generated: boolean;
};

/**
 * Top-of-page "here's where you left off" card. Dismiss is in-memory:
 * it resets on refresh on purpose, because the cache behind it already
 * makes the server-side call cheap and the card is the intended
 * welcome-back signal.
 */
export function SessionWrapCard({ text, generated }: Props) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || !text) return null;

  return (
    <div
      className="beyond-theme mx-auto mt-4 max-w-content rounded-lg border border-border/60 bg-surface/60 px-4 py-3 text-sm text-foreground/90 shadow-sm"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 leading-relaxed">
          <p className="whitespace-pre-wrap">{text}</p>
          {generated ? (
            <p className="mt-1 text-xs text-foreground/50">Refreshed just now.</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss welcome message"
          className="rounded-md border border-transparent px-2 py-1 text-xs text-foreground/60 transition hover:border-border/60 hover:text-foreground"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
