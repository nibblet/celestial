"use client";

import { usePathname } from "next/navigation";
import { useCallback } from "react";

export function StorySceneJump({
  sections,
}: {
  sections: { id: string; label: string }[];
}) {
  const pathname = usePathname();
  const onSelect = useCallback(
    (id: string) => {
      if (typeof document === "undefined" || !id) return;
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        if (pathname) {
          window.history.replaceState(null, "", `${pathname}#${id}`);
        }
      }
    },
    [pathname]
  );

  if (sections.length < 2) return null;

  return (
    <div className="mb-4 lg:hidden">
      <label className="type-meta text-ink-ghost" htmlFor="scene-jump">
        Jump to scene
      </label>
      <select
        id="scene-jump"
        className="type-ui mt-1.5 w-full rounded-lg border border-[var(--color-border)] bg-warm-white px-3 py-2 text-ink"
        defaultValue=""
        onChange={(e) => {
          const v = e.target.value;
          e.currentTarget.value = "";
          onSelect(v);
        }}
        aria-label="Jump to scene in this chapter"
      >
        <option value="" disabled>
          Scenes in this chapter
        </option>
        {sections.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}
