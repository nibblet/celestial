import Image from "next/image";
import Link from "next/link";
import { book } from "@/config/book";
import {
  getTimeline,
  getStoryById,
  getPrologueTimeline,
} from "@/lib/wiki/parser";
import type { TimelineSourceLegacy } from "@/lib/wiki/taxonomy";
import { yearToEraAccent } from "@/lib/design/era";

function formatYearLabel(year: number): string {
  if (year < 0) {
    const magnitude = Math.abs(year);
    return magnitude >= 5000 ? `~${magnitude} BCE` : `${magnitude} BCE`;
  }
  return `${year}`;
}

function TimelineSourceRibbon({ source }: { source: TimelineSourceLegacy }) {
  if (source === "memoir") return null;
  if (source === "public_record") {
    return (
      <span className="sci-chip bg-[#12343d] px-1.5 py-0.5 text-[9px] font-medium text-[#a8f2f0]">
        World snapshot
      </span>
    );
  }
  return (
    <span className="sci-chip bg-[#12343d] px-1.5 py-0.5 text-[9px] font-medium text-[#a8f2f0]">
      Interview
    </span>
  );
}

export function TimelineView() {
  const events = getTimeline();
  const prologue = getPrologueTimeline().sort((a, b) => a.year - b.year);

  if (events.length === 0) {
    return (
      <div className="min-h-screen bg-[#0d141c] text-[#f2eee4]">
        <div className="mx-auto max-w-content px-[var(--page-padding-x)] py-6 md:py-10">
          <h1 className="mb-2 font-[family-name:var(--font-playfair)] text-[clamp(1.75rem,3vw,2.5rem)] font-semibold leading-tight text-[#efe8da]">
            Timeline
          </h1>
          <div className="sci-panel p-5 text-sm text-[#b8c2bf]">
          <p className="font-medium text-[#f2eee4]">No timeline rows parsed.</p>
          <p className="mt-2">
            Add bullet lines to{" "}
            <code className="rounded bg-[var(--color-muted)] px-1 py-0.5 text-xs text-ink">
              content/wiki/timeline/career-timeline.md
            </code>{" "}
            using the format{" "}
            <code className="rounded bg-[var(--color-muted)] px-1 py-0.5 text-xs text-ink">
              - **YYYY** — Event — [[CH01]]
            </code>
            , then run{" "}
            <code className="rounded bg-[var(--color-muted)] px-1 py-0.5 text-xs text-ink">
              npx tsx scripts/generate-static-data.ts
            </code>{" "}
            so the static fallback stays in sync.
          </p>
          </div>
        </div>
      </div>
    );
  }

  const decades: Record<string, typeof events> = {};
  for (const evt of events) {
    const decade = `${Math.floor(evt.year / 10) * 10}s`;
    if (!decades[decade]) decades[decade] = [];
    decades[decade].push(evt);
  }

  return (
    <div className="min-h-screen bg-[#0d141c] text-[#f2eee4]">
      <div className="mx-auto max-w-content px-[var(--page-padding-x)] py-6 md:py-10">
        <h1 className="mb-2 font-[family-name:var(--font-playfair)] text-[clamp(1.75rem,3vw,2.5rem)] font-semibold leading-tight text-[#efe8da]">
          Timeline
        </h1>
        <p className="type-ui mb-6 text-[#b8c2bf]">
          {`${events.length} events in the ${book.title} companion timeline`}
        </p>

      <div className="relative">
        <div className="absolute bottom-0 left-4 top-0 w-px bg-[rgba(127,231,225,0.2)]" />

        {prologue.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-3 ml-10 font-[family-name:var(--font-playfair)] text-xl font-semibold text-[#efe8da]">
              Before Valkyrie
            </h2>
            <div className="space-y-4" role="list">
              {prologue.map((evt, i) => (
                <div
                  key={`prologue-${i}`}
                  className="relative ml-0 flex items-start gap-4"
                  role="listitem"
                  aria-label={`Prologue event, ${formatYearLabel(evt.year)}`}
                >
                  <div className="flex w-8 shrink-0 justify-center pt-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-[#788991] ring-2 ring-[#15222b]" />
                  </div>
                  <div className="sci-panel min-w-0 flex-1 border-dashed p-3">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-xs font-bold text-[#b8c2bf]">
                        {formatYearLabel(evt.year)}
                      </span>
                      <span className="text-sm text-[#f2eee4]">{evt.event}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {Object.entries(decades)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([decade, decadeEvents]) => (
            <div key={decade} className="mb-8">
              <h2 className="mb-3 ml-10 font-[family-name:var(--font-playfair)] text-xl font-semibold text-[#efe8da]">
                {decade}
              </h2>
              <div className="space-y-4" role="list">
                {decadeEvents
                  .sort((a, b) => a.year - b.year)
                  .map((evt, i) => {
                    const story = getStoryById(evt.storyRef);
                    const accent = yearToEraAccent(evt.year);
                    const label = `Era: ${accent.label}, year ${evt.year}`;
                    const illAlt =
                      [evt.organization, evt.location].filter(Boolean).join(", ") ||
                      evt.event;
                    return (
                      <div
                        key={i}
                        className="relative ml-0 flex items-start gap-4"
                        role="listitem"
                        aria-label={label}
                      >
                        <div className="flex w-8 shrink-0 justify-center pt-1.5">
                          <div
                            className={`h-2.5 w-2.5 rounded-full ring-2 ring-[#15222b] ${accent.dot}`}
                          />
                        </div>
                        <div
                          className={`sci-panel min-w-0 flex-1 p-3 ${accent.border}`}
                        >
                          <div className="flex flex-wrap items-baseline gap-2">
                            <span
                              className={`text-xs font-bold ${accent.yearText}`}
                            >
                              {evt.year}
                            </span>
                            <span className="text-sm text-[#f2eee4]">{evt.event}</span>
                            <TimelineSourceRibbon source={evt.source} />
                          </div>
                          {(evt.organization || evt.location) && (
                            <p className="mt-0.5 text-xs text-[#788991]">
                              {[evt.organization, evt.location]
                                .filter(Boolean)
                                .join(" — ")}
                            </p>
                          )}
                          {evt.illustration && (
                            <div className="relative mt-2 h-28 w-full overflow-hidden rounded-md bg-[var(--color-muted)]">
                              <Image
                                src={evt.illustration}
                                alt={`Context image: ${illAlt}`}
                                width={640}
                                height={224}
                                className="h-full w-full object-cover"
                                sizes="(max-width: 768px) 100vw, 720px"
                              />
                            </div>
                          )}
                          {story && (
                            <Link
                              href={`/stories/${evt.storyRef}`}
                              className="mt-1 inline-block text-xs font-medium text-[#6fd6df] hover:underline"
                            >
                              Read: {story.title}
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
      </div>
      </div>
    </div>
  );
}
