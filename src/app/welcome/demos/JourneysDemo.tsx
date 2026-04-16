/**
 * Static Journeys & Themes demo: a journey card with a small dot-timeline
 * and a row of theme pills.
 */
export function JourneysDemo() {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-[var(--color-border)] bg-warm-white p-4">
        <p className="type-era-label mb-2 text-ink-muted">Journey</p>
        <h4 className="type-story-title mb-3 text-base leading-snug">
          From Mississippi to the boardroom
        </h4>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-burgundy" />
          <span className="h-px flex-1 bg-[var(--color-border)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-clay" />
          <span className="h-px flex-1 bg-[var(--color-border)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-gold" />
          <span className="h-px flex-1 bg-[var(--color-border)]" />
          <span className="h-2.5 w-2.5 rounded-full border border-ink-muted/40 bg-transparent" />
        </div>
        <p className="type-ui mt-2 text-xs text-ink-muted">Step 3 of 7</p>
      </div>
      <div>
        <p className="type-era-label mb-2 text-ink-muted">Themes</p>
        <div className="flex flex-wrap gap-2">
          {["Resilience", "Family", "Craft"].map((t) => (
            <span
              key={t}
              className="inline-flex items-center rounded-full border border-clay-border bg-warm-white px-3 py-1 text-xs font-medium text-ink"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
