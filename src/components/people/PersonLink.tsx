"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { peopleData, type PersonCard } from "@/lib/wiki/static-data";

const bySlug: Map<string, PersonCard> = new Map(
  peopleData.map((p) => [p.slug, p])
);

interface Props {
  slug: string;
  children: React.ReactNode;
}

export function PersonLink({ slug, children }: Props) {
  const person = bySlug.get(slug);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const show = () => {
    if (timer.current) clearTimeout(timer.current);
    setOpen(true);
  };
  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(false), 120);
  };

  if (!person) {
    return (
      <Link href={`/characters/${slug}`} className="text-ocean hover:underline">
        {children}
      </Link>
    );
  }

  return (
    <span
      className="relative inline"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      <Link
        href={`/characters/${slug}`}
        className="text-ocean underline decoration-ocean/30 underline-offset-2 hover:decoration-ocean"
      >
        {children}
      </Link>
      {open && (
        <span
          role="tooltip"
          className="not-prose absolute left-1/2 top-full z-50 mt-1 w-64 -translate-x-1/2 rounded-lg border border-[var(--color-border)] bg-warm-white p-3 text-left shadow-[0_8px_24px_rgba(44,28,16,0.12)]"
        >
          <span className="block font-[family-name:var(--font-playfair)] text-sm font-semibold text-ink">
            {person.name}
          </span>
          {person.tiers.length > 0 && (
            <span className="mt-0.5 block text-[10px] uppercase tracking-wide text-ink-ghost">
              {person.tiers.map((t) => `Tier ${t}`).join(" · ")}
            </span>
          )}
          <span className="mt-1 block font-[family-name:var(--font-lora)] text-xs leading-snug text-ink-muted">
            Appears in {person.storyCount}{" "}
            {person.storyCount === 1 ? "story" : "stories"}.
            {person.note ? ` ${person.note}` : ""}
          </span>
          <span className="mt-2 block text-[11px] font-medium text-ocean">
            View page &rarr;
          </span>
        </span>
      )}
    </span>
  );
}
