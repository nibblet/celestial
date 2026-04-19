"use client";

import { useAgeMode } from "@/hooks/useAgeMode";

type Props = {
  readCount: number;
  totalStories: number;
};

/**
 * Stories read progress (IDEA-014). Completion line is celebratory for young readers
 * when they've opened every library story at least once.
 */
export function StoriesReadProgress({ readCount, totalStories }: Props) {
  const { ageMode } = useAgeMode();

  if (readCount <= 0 || totalStories <= 0) return null;

  const pct = Math.min(100, Math.round((readCount / totalStories) * 100));
  const complete = readCount >= totalStories;

  const showYoungCelebration =
    ageMode === "young_reader" && complete;
  const showStandardComplete = complete && !showYoungCelebration;

  return (
    <div className="lg:col-span-6">
      <div className="rounded-[20px] border border-[rgba(240,232,213,0.14)] bg-[rgba(240,232,213,0.03)] p-5">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <p className="type-era-label text-[rgba(240,232,213,0.58)]">
            Stories read
          </p>
          <p className="font-[family-name:var(--font-inter)] text-xs tabular-nums text-[rgba(240,232,213,0.72)]">
            {readCount} of {totalStories}
          </p>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[rgba(240,232,213,0.12)]">
          <div
            className="h-full rounded-full bg-[var(--color-gold)] transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        {showYoungCelebration && (
          <p className="mt-3 font-[family-name:var(--font-lora)] text-sm leading-snug text-[rgba(240,232,213,0.92)]">
            You read ALL of Grandpa&apos;s stories! 🎉
          </p>
        )}
        {showStandardComplete && (
          <p className="mt-3 font-[family-name:var(--font-inter)] text-sm text-[var(--color-gold)]">
            You&apos;ve read every story. ✓
          </p>
        )}
      </div>
    </div>
  );
}
