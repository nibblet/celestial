import Link from "next/link";
import { notFound } from "next/navigation";
import { getJourneyBySlug } from "@/lib/wiki/journeys";
import { getStoryById } from "@/lib/wiki/parser";
import { JourneyCompleteMarker } from "@/components/journeys/JourneyCompleteMarker";
import { JourneyCompleteSummary } from "@/components/journeys/JourneyCompleteSummary";

function uniquePrinciplesForJourney(storyIds: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of storyIds) {
    const s = getStoryById(id);
    if (!s) continue;
    for (const p of s.principles) {
      const key = p.trim().toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        out.push(p.trim());
      }
    }
  }
  return out;
}

export default async function JourneyCompletePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const journey = getJourneyBySlug(slug);
  if (!journey) notFound();

  const principles = uniquePrinciplesForJourney(journey.storyIds);

  return (
    <div className="mx-auto max-w-content px-[var(--page-padding-x)] py-6 md:py-10">
      <JourneyCompleteMarker slug={journey.slug} />

      <Link
        href="/journeys"
        className="type-ui mb-4 inline-block text-ink-ghost no-underline transition-colors hover:text-ocean"
      >
        &larr; All Journeys
      </Link>

      <h1 className="type-page-title mb-2">You&apos;ve completed</h1>
      <p className="type-story-title mb-6 text-clay">{journey.title}</p>

      <JourneyCompleteSummary
        journeyTitle={journey.title}
        principles={
          principles.length > 0
            ? principles
            : [
                "Carry forward the lessons that spoke to you — you can revisit any story anytime.",
              ]
        }
      />

      <div className="flex flex-col gap-3">
        <Link
          href={`/ask?journey=${encodeURIComponent(journey.slug)}`}
          className="type-ui rounded-lg bg-clay py-2.5 text-center font-medium text-warm-white transition-colors hover:bg-clay-mid"
        >
          Ask Keith about this journey
        </Link>
        <Link
          href="/journeys"
          className="type-ui rounded-lg border border-[var(--color-border)] bg-warm-white py-2.5 text-center font-medium text-ink transition-colors hover:border-clay-border"
        >
          Explore another journey
        </Link>
        <Link
          href="/stories"
          className="type-ui rounded-lg border border-[var(--color-border)] bg-warm-white-2 py-2.5 text-center font-medium text-ink transition-colors hover:border-clay-border"
        >
          Browse all stories
        </Link>
      </div>
    </div>
  );
}
