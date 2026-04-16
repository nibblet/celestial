/**
 * Static "Tell" demo: a fake textarea capture with a mic icon and a preview
 * of what a saved memory card might look like.
 */
export function TellDemo() {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-[var(--color-border)] bg-warm-white p-3">
        <div className="flex items-start gap-2">
          <span
            aria-hidden
            className="mt-1 inline-flex h-8 w-8 flex-none items-center justify-center rounded-full bg-burgundy/10 text-burgundy"
          >
            &#127908;
          </span>
          <p className="flex-1 font-[family-name:var(--font-lora)] text-sm leading-relaxed text-ink-muted">
            I remember Grandpa teaching me to skip stones on the lake at
            sunset&hellip;
            <span className="ml-0.5 inline-block h-4 w-px animate-[pulse_1s_ease-in-out_infinite] bg-ink align-text-bottom" />
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-gold/25 px-3 py-1 text-xs font-medium text-burgundy">
          <span
            aria-hidden
            className="inline-block h-2 w-2 animate-[pulse_1.4s_ease-in-out_infinite] rounded-full bg-burgundy"
          />
          Polishing&hellip;
        </span>
        <span className="type-ui text-xs text-ink-muted">
          becomes a shareable memory
        </span>
      </div>
      <div className="rounded-xl border border-clay-border bg-warm-white p-3">
        <p className="type-era-label mb-1 text-ink-muted">By you &middot; today</p>
        <h4 className="type-story-title mb-1 text-sm leading-snug">
          Stones at sunset
        </h4>
        <p className="font-[family-name:var(--font-lora)] text-xs leading-relaxed text-ink-muted">
          A memory of Grandpa and the lake&hellip;
        </p>
      </div>
    </div>
  );
}
