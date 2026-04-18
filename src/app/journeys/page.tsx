import { getAllJourneys } from "@/lib/wiki/journeys";
import { JourneyStatusBadge } from "@/components/journeys/JourneyStatusBadge";
import { JourneyCTAButtons } from "@/components/journeys/JourneyCTAButtons";

export default function JourneysPage() {
  const journeys = getAllJourneys();

  return (
    <div className="mx-auto max-w-content px-[var(--page-padding-x)] py-6 md:py-10">
      <h1 className="type-page-title mb-2">Journeys</h1>
      <p className="type-ui mb-6 text-ink-muted">
        Explore Keith&apos;s life as either a curated path through stories or a
        woven retelling built from the memoir and interviews.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {journeys.map((journey) => {
          const hasNarrated = journey.experienceModes.includes("narrated");
          const hasGuided = journey.experienceModes.includes("guided");
          const singleMode =
            journey.experienceModes.length === 1
              ? journey.experienceModes[0]
              : null;

          return (
            <div
              key={journey.slug}
              className="relative rounded-xl border border-[var(--color-border)] bg-warm-white p-4 pb-5 pt-5 pr-16"
            >
              <JourneyStatusBadge
                slug={journey.slug}
                totalSteps={journey.storyIds.length}
              />
              <div className="group">
                <h2 className="font-[family-name:var(--font-playfair)] text-base font-semibold text-ink transition-colors group-hover:text-burgundy">
                  {journey.title}
                </h2>
                {singleMode && (
                  <p className="type-meta mt-1.5 text-ink-ghost">
                    {singleMode === "narrated"
                      ? "Narrated experience only"
                      : "Guided path only"}
                  </p>
                )}
                <p className="mt-2 line-clamp-3 font-[family-name:var(--font-lora)] text-sm italic leading-snug text-ink-muted">
                  {journey.description}
                </p>
                <p className="type-meta mt-3 normal-case tracking-normal text-ink-ghost">
                  {journey.storyCount} stories
                </p>
              </div>
              <JourneyCTAButtons
                slug={journey.slug}
                hasNarrated={hasNarrated}
                hasGuided={hasGuided}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
