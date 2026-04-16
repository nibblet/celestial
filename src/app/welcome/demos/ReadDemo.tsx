/**
 * Static illustration for the "Read" onboarding step: two sample story cards,
 * one with a pulsing heart (favorite) and a highlighted sentence fragment.
 * No real data, no links — this is purely visual.
 */
export function ReadDemo() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="relative rounded-xl border border-[var(--color-border)] bg-warm-white p-4 shadow-[0_4px_18px_rgba(44,28,16,0.06)]">
        <p className="type-era-label mb-1 text-ink-muted">Mississippi, 1952</p>
        <h4 className="type-story-title mb-2 text-base leading-snug">
          The dirt road home
        </h4>
        <p className="font-[family-name:var(--font-lora)] text-sm leading-relaxed text-ink-muted">
          That summer we walked two miles to the creek, and{" "}
          <span className="rounded-sm bg-gold/35 px-0.5 py-px">
            every step felt like freedom
          </span>
          .
        </p>
        <span
          aria-hidden
          className="absolute right-3 top-3 text-lg text-burgundy animate-[pulse_2.2s_ease-in-out_infinite]"
        >
          &#9829;
        </span>
      </div>
      <div className="rounded-xl border border-[var(--color-border)] bg-warm-white p-4 opacity-80">
        <p className="type-era-label mb-1 text-ink-muted">Chicago, 1978</p>
        <h4 className="type-story-title mb-2 text-base leading-snug">
          My first real job
        </h4>
        <p className="font-[family-name:var(--font-lora)] text-sm leading-relaxed text-ink-muted">
          The manager slid the offer letter across the desk and didn&rsquo;t say
          a word&hellip;
        </p>
        <span aria-hidden className="mt-3 inline-block text-lg text-ink-muted/40">
          &#9825;
        </span>
      </div>
    </div>
  );
}
