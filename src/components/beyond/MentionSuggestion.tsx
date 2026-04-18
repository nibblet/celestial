"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";

export interface PersonSuggestion {
  id: string;
  slug: string;
  display_name: string;
  relationship: string | null;
  isNew?: boolean;
}

interface Props {
  items: PersonSuggestion[];
  command: (item: { id: string; label: string; slug: string }) => void;
  query: string;
}

export interface MentionListHandle {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

/**
 * Dropdown list rendered next to the caret while the user is typing after
 * an `@`. Arrow keys / enter / tab navigate; click selects.
 */
export const MentionList = forwardRef<MentionListHandle, Props>(function MentionList(
  { items, command, query },
  ref
) {
  const [index, setIndex] = useState(0);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setIndex(0), [items]);

  function pick(i: number) {
    const item = items[i];
    if (!item) return;
    if (item.isNew) {
      // Create-new flow: POST to /api/people then call command.
      fetch("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: query }),
      })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((data: { person: PersonSuggestion }) => {
          command({
            id: data.person.id,
            label: data.person.display_name,
            slug: data.person.slug,
          });
        })
        .catch(() => {
          // Silently fall back to plain text insertion — TipTap will undo
          // nothing; user can retry the @ mention.
        });
      return;
    }
    command({ id: item.id, label: item.display_name, slug: item.slug });
  }

  useImperativeHandle(ref, () => ({
    onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowDown") {
        setIndex((i) => (i + 1) % Math.max(items.length, 1));
        return true;
      }
      if (event.key === "ArrowUp") {
        setIndex((i) => (i - 1 + Math.max(items.length, 1)) % Math.max(items.length, 1));
        return true;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        pick(index);
        return true;
      }
      return false;
    },
  }));

  if (items.length === 0) return null;

  return (
    <div className="max-h-60 w-64 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-warm-white shadow-lg">
      {items.map((item, i) => (
        <button
          key={item.id}
          type="button"
          onClick={() => pick(i)}
          className={`type-ui flex w-full flex-col items-start gap-0.5 px-3 py-1.5 text-left text-sm transition-colors ${
            i === index ? "bg-clay-pale text-clay" : "text-ink hover:bg-warm-white-2"
          }`}
        >
          <span className="font-medium">
            {item.isNew ? `Create "${query}"` : item.display_name}
          </span>
          {!item.isNew && item.relationship && (
            <span className="text-xs text-ink-ghost">{item.relationship}</span>
          )}
        </button>
      ))}
    </div>
  );
});
