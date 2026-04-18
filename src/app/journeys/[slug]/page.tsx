import Link from "next/link";
import { notFound } from "next/navigation";
import { getJourneyBySlug } from "@/lib/wiki/journeys";
import { getStoryById } from "@/lib/wiki/parser";
import { JourneyIntroContinue } from "@/components/journeys/JourneyIntroContinue";
import { JourneyExperienceBadge } from "@/components/journeys/JourneyExperienceBadge";

export default async function JourneyIntroPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const journey = getJourneyBySlug(slug);

  if (!journey) notFound();

  const titles = journey.storyIds.map((id) => {
    const s = getStoryById(id);
    return { id, title: s?.title || id };
  });

  return (
    <div className="mx-auto max-w-content px-[var(--page-padding-x)] py-6 md:py-10">
      <Link
        href="/journeys"
        className="type-ui mb-4 inline-block text-ink-ghost no-underline transition-colors hover:text-ocean"
      >
        &larr; All Journeys
      </Link>

      <h1 className="type-page-title mb-3">{journey.title}</h1>
      <p className="type-body mb-6 text-pretty text-ink-muted">
        {journey.description}
      </p>

      <JourneyIntroContinue
        slug={journey.slug}
        totalSteps={journey.storyIds.length}
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {journey.experienceModes.map((mode) => (
          <JourneyExperienceBadge key={mode} mode={mode} />
        ))}
      </div>

      {journey.experienceModes.includes("narrated") && (
        <div className="mb-6 rounded-xl border border-clay-border bg-gold-pale/50 p-5">
          <h2 className="type-meta mb-2 text-ink">Narrated Journey</h2>
          <p className="type-body mb-4 text-ink-muted">
            {journey.narratedDek ||
              "Read a single longform retelling woven from Keith's memoir stories and interviews."}
          </p>
          <p className="type-meta mb-4 normal-case tracking-normal text-ink-ghost">
            Narrative = one woven retelling. Chapters = the original stories in
            order.
          </p>
          <Link
            href={`/journeys/${journey.slug}/narrated`}
            className="type-ui inline-block rounded-lg bg-clay px-5 py-2.5 font-medium text-warm-white transition-colors hover:bg-clay-mid"
          >
            Read Narrative
          </Link>
        </div>
      )}

      <div className="mb-8 rounded-xl border border-[var(--color-border)] bg-warm-white p-5">
        <h2 className="type-meta mb-3 text-ink">Guided Journey Story Order</h2>
        <ol className="list-inside list-decimal space-y-2 font-[family-name:var(--font-lora)] text-sm text-ink">
          {titles.map(({ id, title }) => (
            <li key={id}>
              <span>{title}</span>
            </li>
          ))}
        </ol>
      </div>

      <Link
        href={`/journeys/${journey.slug}/1`}
        className="type-ui inline-block w-full rounded-lg bg-clay py-3 text-center font-medium text-warm-white transition-colors hover:bg-clay-mid sm:w-auto sm:px-6"
      >
        Start Guided Journey
      </Link>
    </div>
  );
}
