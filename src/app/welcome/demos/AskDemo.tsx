"use client";

import type { AgeMode } from "@/types";

/**
 * Static Ask Keith demo: a fake chat with a user question, typing dots, and
 * a short Keith reply with a source chip. Copy branches on age mode so
 * young readers see a kid-friendly exchange.
 */
export function AskDemo({ ageMode }: { ageMode: AgeMode }) {
  const question =
    ageMode === "young_reader"
      ? "What was your favorite game as a kid?"
      : "What did you do after school growing up?";
  const reply =
    ageMode === "young_reader"
      ? "We played marbles in the dirt behind the schoolhouse — I usually lost my best blue one."
      : "Chopped wood, hauled water, and when there was time, met the other boys by the creek.";

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-burgundy px-4 py-2 text-sm text-warm-white">
          {question}
        </div>
      </div>
      <div className="flex justify-start">
        <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-[var(--color-border)] bg-warm-white px-4 py-3">
          <p className="font-[family-name:var(--font-lora)] text-sm leading-relaxed text-ink">
            {reply}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-gold/20 px-2 py-0.5 text-[11px] font-medium text-burgundy">
              <span aria-hidden>&bull;</span> From &ldquo;The dirt road home&rdquo;
            </span>
          </div>
        </div>
      </div>
      <div className="flex justify-start" aria-hidden>
        <div className="flex gap-1 rounded-2xl bg-[var(--color-border)]/40 px-3 py-2">
          <span className="h-1.5 w-1.5 animate-[pulse_1.2s_ease-in-out_infinite] rounded-full bg-ink-muted" />
          <span className="h-1.5 w-1.5 animate-[pulse_1.2s_ease-in-out_0.2s_infinite] rounded-full bg-ink-muted" />
          <span className="h-1.5 w-1.5 animate-[pulse_1.2s_ease-in-out_0.4s_infinite] rounded-full bg-ink-muted" />
        </div>
      </div>
    </div>
  );
}
