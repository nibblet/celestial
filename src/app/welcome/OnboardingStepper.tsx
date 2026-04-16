"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { AgeMode } from "@/types";
import { getSteps } from "./steps";

type OnboardingStepperProps = {
  ageMode: AgeMode;
  displayName: string;
  replay: boolean;
};

/**
 * Client-side stepper for /welcome. Holds the current step in local state,
 * renders the age-aware step content + demo, and posts to
 * /api/profile/onboarding on finish/skip. Replay mode never flips the
 * has_onboarded flag; it simply returns to /profile.
 */
export function OnboardingStepper({
  ageMode,
  displayName,
  replay,
}: OnboardingStepperProps) {
  const router = useRouter();
  const steps = getSteps(ageMode);
  const [index, setIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const isLast = index === steps.length - 1;
  const step = steps[index];

  const complete = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await fetch("/api/profile/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replay }),
      });
    } catch {
      // Non-fatal: fall through to the redirect anyway. The DB flag will
      // remain false and the proxy will send them back here next time —
      // a reasonable failure mode.
    }
    router.push(replay ? "/profile" : "/");
    router.refresh();
  }, [replay, router, submitting]);

  return (
    <div className="mx-auto max-w-2xl px-[var(--page-padding-x)] py-10 md:py-14">
      <div className="mb-8 text-center">
        <p className="type-era-label mb-2 text-ink-muted">
          {replay
            ? "Retaking the tour"
            : `Welcome${displayName ? `, ${displayName}` : ""}`}
        </p>
        <h1 className="type-page-title text-balance">
          The Keith Cobb Story Library
        </h1>
        <p className="type-ui mx-auto mt-3 max-w-md text-ink-muted">
          {replay
            ? "Walk through the four things you can do here."
            : "A quick tour of what you can do here before you dive in."}
        </p>
      </div>

      {/* Step indicator */}
      <div
        className="mb-6 flex items-center justify-center gap-2"
        aria-label={`Step ${index + 1} of ${steps.length}`}
      >
        {steps.map((s, i) => (
          <span
            key={s.key}
            className={`h-1.5 rounded-full transition-all duration-[var(--duration-slow)] ${
              i === index
                ? "w-8 bg-burgundy"
                : i < index
                ? "w-4 bg-clay"
                : "w-4 bg-[var(--color-border)]"
            }`}
          />
        ))}
      </div>

      {/* Step card */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-parchment p-5 shadow-[0_12px_40px_rgba(44,28,16,0.06)] md:p-8">
        <h2 className="type-story-title mb-3 text-balance">{step.title}</h2>
        <p className="mb-6 font-[family-name:var(--font-lora)] text-base leading-relaxed text-ink-muted">
          {step.body}
        </p>
        <div className="mb-2">
          <step.Demo ageMode={ageMode} />
        </div>
      </div>

      {/* Controls */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={complete}
          disabled={submitting}
          className="type-ui min-h-[44px] rounded-full px-4 text-ink-muted transition-colors hover:text-ink disabled:opacity-50"
        >
          {replay ? "Close tour" : "Skip tour"}
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0 || submitting}
            className="type-ui min-h-[44px] rounded-full border border-[var(--color-border)] bg-warm-white px-5 text-ink transition-colors hover:border-clay-border disabled:cursor-not-allowed disabled:opacity-40"
          >
            Back
          </button>
          {isLast ? (
            <button
              type="button"
              onClick={complete}
              disabled={submitting}
              className="type-ui min-h-[44px] rounded-full bg-burgundy px-6 font-medium text-warm-white transition-colors hover:bg-burgundy/90 disabled:opacity-60"
            >
              {replay ? "Done" : "Start exploring"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIndex((i) => Math.min(steps.length - 1, i + 1))}
              disabled={submitting}
              className="type-ui min-h-[44px] rounded-full bg-burgundy px-6 font-medium text-warm-white transition-colors hover:bg-burgundy/90 disabled:opacity-60"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
