import Link from "next/link";
import type { Beat } from "@/lib/beats/repo";

/**
 * Reader-facing timeline of structural beats for a journey.
 *
 * Beats arrive already sorted by (act, order_index). Grouping happens at
 * render time so the header labels can stay data-driven: if a journey
 * stays in Act I the timeline shows one act, if it reaches Act V it
 * shows five.
 *
 * Intentionally a Server Component. `<details>/<summary>` gives us the
 * collapsible "Why it matters" without any client JS.
 */

const BEAT_TYPE_STYLE: Record<string, string> = {
  opening: "bg-gold-pale text-clay",
  inciting: "bg-burgundy-light text-burgundy",
  rising: "bg-gold-pale text-clay",
  midpoint: "bg-ocean/20 text-ocean",
  climax: "bg-burgundy-light text-burgundy",
  falling: "bg-ocean/20 text-ocean",
  resolution: "bg-gold-pale text-clay",
  reveal: "bg-burgundy-light text-burgundy",
  decision: "bg-ocean/20 text-ocean",
  reflection: "bg-gold-pale text-clay",
  setup: "bg-clay-border/40 text-ink-muted",
  payoff: "bg-burgundy-light text-burgundy",
};

function beatTypeClasses(beatType: string): string {
  return (
    BEAT_TYPE_STYLE[beatType] ?? "bg-clay-border/40 text-ink-muted"
  );
}

function beatAnchorHref(beat: Beat): string | null {
  if (!beat.chapterId) return null;
  return beat.sceneSlug
    ? `/stories/${beat.chapterId}#${beat.sceneSlug}`
    : `/stories/${beat.chapterId}`;
}

function groupByAct(beats: Beat[]): Map<number, Beat[]> {
  const map = new Map<number, Beat[]>();
  for (const beat of beats) {
    const bucket = map.get(beat.act);
    if (bucket) bucket.push(beat);
    else map.set(beat.act, [beat]);
  }
  return map;
}

export function BeatTimeline({ beats }: { beats: Beat[] }) {
  if (beats.length === 0) return null;

  const grouped = groupByAct(beats);
  const acts = Array.from(grouped.keys()).sort((a, b) => a - b);

  return (
    <section
      aria-label="Journey beats"
      className="mb-8 rounded-xl border border-[var(--color-border)] bg-warm-white p-5"
    >
      <div className="mb-3">
        <h2 className="type-meta text-ink">Beats</h2>
        <p className="type-meta mt-1 normal-case tracking-normal text-ink-ghost">
          The structural map of this arc — what each moment is doing for
          the story. Expand &ldquo;Why it matters&rdquo; for the teaching
          payload.
        </p>
      </div>

      <ol className="space-y-6">
        {acts.map((act) => {
          const actBeats = grouped.get(act) ?? [];
          return (
            <li key={act}>
              <div className="type-meta mb-2 text-ink-muted">
                Act {act}
              </div>
              <ol className="space-y-3 border-l border-clay-border pl-4">
                {actBeats.map((beat) => {
                  const href = beatAnchorHref(beat);
                  return (
                    <li key={beat.id} className="relative">
                      <span
                        aria-hidden="true"
                        className="absolute -left-[1.125rem] top-1.5 h-2.5 w-2.5 rounded-full bg-clay"
                      />
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${beatTypeClasses(beat.beatType)}`}
                        >
                          {beat.beatType}
                        </span>
                        <h3 className="font-[family-name:var(--font-playfair)] text-base font-semibold text-ink">
                          {beat.title}
                        </h3>
                        {href && (
                          <Link
                            href={href}
                            className="type-meta text-ink-ghost transition-colors hover:text-ocean"
                          >
                            {beat.sceneSlug
                              ? `${beat.chapterId} · scene`
                              : beat.chapterId}
                          </Link>
                        )}
                      </div>
                      {beat.summary && (
                        <p className="mt-1 font-[family-name:var(--font-lora)] text-sm text-ink-muted">
                          {beat.summary}
                        </p>
                      )}
                      {beat.whyItMatters && (
                        <details className="mt-2 group">
                          <summary className="type-meta cursor-pointer select-none text-clay transition-colors hover:text-burgundy">
                            Why it matters
                          </summary>
                          <p className="mt-1 font-[family-name:var(--font-lora)] text-sm italic leading-snug text-ink">
                            {beat.whyItMatters}
                          </p>
                        </details>
                      )}
                    </li>
                  );
                })}
              </ol>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
