"use client";

import { useAgeMode } from "@/hooks/useAgeMode";
import type { AgeMode } from "@/types";
import { ageModeLabel } from "@/lib/utils/age-mode";

const modes: AgeMode[] = ["young_reader", "teen", "adult"];

type AgeModeSwitcherProps = {
  variant?: "default" | "compact";
};

export function AgeModeSwitcher({ variant = "default" }: AgeModeSwitcherProps) {
  const { ageMode, setAgeMode } = useAgeMode();
  const compact = variant === "compact";

  return (
    <div className={compact ? undefined : "text-center"}>
      <div
        className="inline-flex max-w-[min(100%,14rem)] shrink overflow-hidden rounded-full border border-[var(--color-border)] bg-warm-white sm:max-w-none"
        role="group"
        aria-label="Reading level"
      >
        {modes.map((mode) => {
          const active = ageMode === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => setAgeMode(mode)}
              className={`font-medium transition-[background-color,color] duration-[var(--duration-normal)] ${
                compact
                  ? `px-1.5 py-0.5 text-[0.625rem] leading-tight sm:px-2 sm:text-xs ${
                      active
                        ? "rounded-full bg-ink text-warm-white"
                        : "bg-transparent text-ink-muted hover:text-ink"
                    }`
                  : `px-3 py-1 text-xs ${
                      active
                        ? "rounded-full bg-ink text-warm-white"
                        : "bg-transparent text-ink-muted hover:text-ink"
                    }`
              }`}
            >
              {ageModeLabel(mode)}
            </button>
          );
        })}
      </div>
      {!compact && (
        <p className="type-meta mt-2 normal-case tracking-normal text-ink-ghost">
          Changes examples and reading style for kids, teens, or adults.
        </p>
      )}
    </div>
  );
}
