import Image from "next/image";
import Link from "next/link";
import { getTimeline, getStoryById } from "@/lib/wiki/parser";
import { yearToEraAccent } from "@/lib/design/era";

export default function TimelinePage() {
  const events = getTimeline();

  const decades: Record<string, typeof events> = {};
  for (const evt of events) {
    const decade = `${Math.floor(evt.year / 10) * 10}s`;
    if (!decades[decade]) decades[decade] = [];
    decades[decade].push(evt);
  }

  return (
    <div className="mx-auto max-w-content px-[var(--page-padding-x)] py-6 md:py-10">
      <h1 className="type-page-title mb-2">Life Timeline</h1>
      <p className="type-ui mb-6 text-ink-muted">
        {`${events.length} events spanning Keith Cobb's life and career`}
      </p>

      <div className="relative">
        <div className="absolute bottom-0 left-4 top-0 w-px bg-[var(--color-divider)]" />

        {Object.entries(decades)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([decade, decadeEvents]) => (
            <div key={decade} className="mb-8">
              <h2 className="type-story-title mb-3 ml-10 text-burgundy">
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
                            className={`h-2.5 w-2.5 rounded-full ring-2 ring-warm-white ${accent.dot}`}
                          />
                        </div>
                        <div
                          className={`min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-warm-white p-3 ${accent.border}`}
                        >
                          <div className="flex flex-wrap items-baseline gap-2">
                            <span
                              className={`text-xs font-bold ${accent.yearText}`}
                            >
                              {evt.year}
                            </span>
                            <span className="text-sm text-ink">{evt.event}</span>
                          </div>
                          {(evt.organization || evt.location) && (
                            <p className="mt-0.5 text-xs text-ink-ghost">
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
                              className="mt-1 inline-block text-xs font-medium text-ocean hover:underline"
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
  );
}
