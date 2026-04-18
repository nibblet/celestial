import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { getJourneyBySlug } from "@/lib/wiki/journeys";
import { JourneyExperienceBadge } from "@/components/journeys/JourneyExperienceBadge";
import { JourneyNarratedSources } from "@/components/journeys/JourneyNarratedSources";

export default async function NarratedJourneyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const journey = getJourneyBySlug(slug);

  if (!journey || journey.narratedSections.length === 0) notFound();

  const relatedSourceIds = Array.from(
    new Set(journey.narratedSections.flatMap((section) => section.sourceStoryIds))
  );

  return (
    <div className="mx-auto max-w-story px-[var(--page-padding-x)] py-6 md:py-10">
      <Link
        href={`/journeys/${journey.slug}`}
        className="type-ui mb-4 inline-block text-ink-ghost no-underline transition-colors hover:text-ocean"
      >
        &larr; {journey.title}
      </Link>

      <div className="mb-3 flex flex-wrap gap-2">
        <JourneyExperienceBadge mode="narrated" />
      </div>

      <h1 className="type-page-title mb-3">{journey.title}</h1>
      <p className="type-body mb-4 text-pretty text-ink-muted">
        {journey.narratedDek || journey.description}
      </p>

      <div className="mb-8 rounded-xl border border-[var(--color-border)] bg-burgundy-light p-5">
        <h2 className="type-meta mb-2 text-ink">About this journey</h2>
        <p className="font-[family-name:var(--font-lora)] text-sm leading-relaxed text-ink-muted">
          {journey.narratedDisclosure}
        </p>
      </div>

      <div className="space-y-8">
        {journey.narratedSections.map((section) => (
          <section key={section.title} className="space-y-4">
            <div>
              <h2 className="type-story-title mb-3 text-clay">{section.title}</h2>
              <article className="story-body prose prose-story prose-lg max-w-none">
                <ReactMarkdown>{section.body}</ReactMarkdown>
              </article>
            </div>
            <JourneyNarratedSources sourceStoryIds={section.sourceStoryIds} />
          </section>
        ))}
      </div>

      <div className="mt-10 rounded-xl border border-[var(--color-border)] bg-warm-white p-5">
        <h2 className="type-meta mb-3 text-ink">Keep Exploring</h2>
        <p className="font-[family-name:var(--font-lora)] text-sm leading-relaxed text-ink-muted">
          This narrated journey draws from {relatedSourceIds.length} memoir and interview sources. You can open the original materials or walk the guided sequence story by story.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Link
            href={`/journeys/${journey.slug}/1`}
            className="type-ui rounded-lg bg-clay px-4 py-2.5 text-center font-medium text-warm-white transition-colors hover:bg-clay-mid"
          >
            Start Guided Journey
          </Link>
          <Link
            href={`/ask?journey=${encodeURIComponent(journey.slug)}`}
            className="type-ui rounded-lg border border-[var(--color-border)] bg-warm-white-2 px-4 py-2.5 text-center font-medium text-ink transition-colors hover:border-clay-border"
          >
            Ask about this journey
          </Link>
        </div>
      </div>
    </div>
  );
}
