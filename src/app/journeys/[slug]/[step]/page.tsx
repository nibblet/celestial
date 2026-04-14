import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { getJourneyBySlug } from "@/lib/wiki/journeys";
import { getStoryById } from "@/lib/wiki/parser";
import { lifeStageToEraAccent } from "@/lib/design/era";
import { JourneyProgressBar } from "@/components/journeys/JourneyProgressBar";
import { JourneyConnector } from "@/components/journeys/JourneyConnector";
import { JourneyReflection } from "@/components/journeys/JourneyReflection";
import { JourneyVisitRecorder } from "@/components/journeys/JourneyVisitRecorder";

export default async function JourneyStepPage({
  params,
}: {
  params: Promise<{ slug: string; step: string }>;
}) {
  const { slug, step: stepStr } = await params;
  const journey = getJourneyBySlug(slug);
  if (!journey) notFound();

  const step = parseInt(stepStr, 10);
  if (!Number.isFinite(step) || step < 1 || step > journey.storyIds.length) {
    notFound();
  }

  const storyId = journey.storyIds[step - 1];
  const story = getStoryById(storyId);
  if (!story) notFound();

  const reflection =
    journey.reflections[storyId] ||
    "What part of this story stays with you, and why?";

  const prevStep = step > 1 ? step - 1 : null;
  const nextStep = step < journey.storyIds.length ? step + 1 : null;
  const era = lifeStageToEraAccent(story.lifeStage);

  return (
    <div className="mx-auto max-w-story px-[var(--page-padding-x)] py-6 pb-24 md:pb-10">
      <JourneyVisitRecorder slug={journey.slug} step={step} />

      <Link
        href={`/journeys/${journey.slug}`}
        className="type-ui mb-4 inline-block text-ink-ghost no-underline transition-colors hover:text-ocean"
      >
        &larr; {journey.title}
      </Link>

      <JourneyProgressBar
        step={step}
        total={journey.storyIds.length}
        journeyTitle={journey.title}
      />

      <h1 className="type-story-title mb-2">{story.title}</h1>
      <div className="mb-4 flex flex-wrap gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${era.badgeClass}`}
        >
          {story.lifeStage}
        </span>
      </div>

      <div className="mb-6 rounded-lg border border-clay-border bg-gold-pale/40 p-4">
        <p className="font-[family-name:var(--font-lora)] text-sm italic leading-relaxed text-ink">
          {story.summary}
        </p>
      </div>

      <article className="story-body prose prose-story prose-lg mb-8 max-w-none">
        <ReactMarkdown>{story.fullText}</ReactMarkdown>
      </article>

      {story.principles.length > 0 && (
        <div className="mb-6 rounded-xl border border-[var(--color-border)] bg-warm-white p-5">
          <h2 className="type-meta mb-3 text-ink">What This Story Shows</h2>
          <ul className="space-y-2">
            {story.principles.map((p, i) => (
              <li
                key={i}
                className="flex gap-2 font-[family-name:var(--font-lora)] text-sm text-ink-muted"
              >
                <span className="mt-0.5 text-clay">&#9679;</span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      <JourneyReflection prompt={reflection} />

      {nextStep !== null &&
        (() => {
          const nextStoryId = journey.storyIds[step];
          const connectorKey = `${storyId}→${nextStoryId}`;
          const connectorText = journey.connectors[connectorKey];
          return connectorText ? (
            <JourneyConnector text={connectorText} />
          ) : null;
        })()}

      <div className="flex flex-col gap-3 border-t border-[var(--color-divider)] pt-4 sm:flex-row">
        {prevStep !== null ? (
          <Link
            href={`/journeys/${journey.slug}/${prevStep}`}
            className="type-ui flex-1 rounded-lg border border-[var(--color-border)] bg-warm-white py-2.5 text-center font-medium text-ink transition-colors hover:border-clay-border"
          >
            ← Previous Story
          </Link>
        ) : (
          <span className="flex-1" />
        )}
        {nextStep !== null ? (
          <Link
            href={`/journeys/${journey.slug}/${nextStep}`}
            className="type-ui flex-1 rounded-lg bg-clay py-2.5 text-center font-medium text-warm-white transition-colors hover:bg-clay-mid"
          >
            Next Story →
          </Link>
        ) : (
          <Link
            href={`/journeys/${journey.slug}/complete`}
            className="type-ui flex-1 rounded-lg bg-clay py-2.5 text-center font-medium text-warm-white transition-colors hover:bg-clay-mid"
          >
            Finish Journey
          </Link>
        )}
      </div>
    </div>
  );
}
