import { getStoryById } from "@/lib/wiki/parser";
import { getPublishedStoryById } from "@/lib/wiki/supabase-stories";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { ReadingProgressBar } from "@/components/story/ReadingProgressBar";
import { StoryAudioControls } from "@/components/story/StoryAudioControls";
import { AskAboutStory } from "@/components/stories/AskAboutStory";
import { AnsweredQuestionsList } from "@/components/stories/AnsweredQuestionsList";
import { SourceBadge } from "@/components/ui/SourceBadge";
import { lifeStageToEraAccent } from "@/lib/design/era";

const STORY_AUDIO_UI_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_STORY_AUDIO === "true";

export default async function StoryDetailPage({
  params,
}: {
  params: Promise<{ storyId: string }>;
}) {
  const { storyId } = await params;
  // Try filesystem first (Volume 1), then Supabase (Volume 2+)
  const story = getStoryById(storyId) || (await getPublishedStoryById(storyId));

  if (!story) notFound();

  const era = lifeStageToEraAccent(story.lifeStage);
  const supportsListenMode =
    STORY_AUDIO_UI_ENABLED &&
    (story.source === "memoir" || story.source === "interview");

  return (
    <>
      <ReadingProgressBar />
      <div className="mx-auto max-w-story px-[var(--page-padding-x)] py-6 md:py-10">
        <Link
          href="/stories"
          className="type-ui mb-4 inline-block text-ink-ghost no-underline transition-colors hover:text-ocean"
        >
          &larr; All Stories
        </Link>

        <h1 className="type-story-title mb-2 text-balance">{story.title}</h1>
        {story.sourceDetail && (
          <p className="type-meta mb-2 text-ink-ghost">
            {story.sourceDetail}
          </p>
        )}
        <div className="mb-4 flex flex-wrap gap-2">
          <SourceBadge source={story.source} />
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${era.badgeClass}`}
          >
            {story.lifeStage}
          </span>
          {story.themes.map((theme) => {
            const isLeadership = theme.toLowerCase().includes("leadership");
            return (
              <Link
                key={theme}
                href={`/themes/${theme.toLowerCase().replace(/\s+/g, "-")}`}
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                  isLeadership
                    ? "bg-ocean-pale text-ocean hover:bg-ocean-pale/80"
                    : "bg-green-pale text-green hover:bg-green-pale/80"
                }`}
              >
                {theme}
              </Link>
            );
          })}
        </div>

        <div className="mb-6 rounded-lg border border-clay-border bg-gold-pale/40 p-4">
          <p className="font-[family-name:var(--font-lora)] text-sm italic leading-relaxed text-ink">
            {story.summary}
          </p>
        </div>

        {supportsListenMode && (
          <StoryAudioControls
            title={story.title}
            fullText={story.fullText}
            wordCount={story.wordCount}
          />
        )}

        <article className="story-body prose prose-story prose-lg max-w-none pb-8">
          <ReactMarkdown>{story.fullText}</ReactMarkdown>
        </article>

        {story.principles.length > 0 && (
          <div className="mb-4 rounded-xl border border-[var(--color-border)] bg-warm-white p-5">
            <h2 className="type-meta mb-3 text-ink">
              What This Story Shows
            </h2>
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

        {story.heuristics.length > 0 && (
          <div className="mb-4 rounded-xl border border-[var(--color-border)] bg-warm-white p-5">
            <h2 className="type-meta mb-3 text-ink">
              If You&apos;re Thinking About...
            </h2>
            <ul className="space-y-2">
              {story.heuristics.map((h, i) => (
                <li
                  key={i}
                  className="flex gap-2 font-[family-name:var(--font-lora)] text-sm text-ink-muted"
                >
                  <span className="mt-0.5 text-clay">&#9679;</span>
                  {h}
                </li>
              ))}
            </ul>
          </div>
        )}

        {story.quotes.length > 0 && (
          <div className="mb-6">
            <h2 className="type-meta mb-3 text-ink">Key Quotes</h2>
            <div className="space-y-3">
              {story.quotes.map((q, i) => (
                <blockquote
                  key={i}
                  className="type-pullquote border-l-[3px] border-clay-mid pl-4 text-base not-italic text-ink-muted"
                >
                  {q}
                </blockquote>
              ))}
            </div>
          </div>
        )}

        {story.relatedStoryIds.length > 0 && (
          <div className="mb-6">
            <h2 className="type-meta mb-3 text-ink">Related Stories</h2>
            <div className="space-y-2">
              {story.relatedStoryIds.map((relId) => {
                const rel = getStoryById(relId);
                if (!rel) return null;
                return (
                  <Link
                    key={relId}
                    href={`/stories/${relId}`}
                    className="block rounded-lg border border-[var(--color-border)] bg-warm-white p-3 transition-colors hover:border-clay-border"
                  >
                    <span className="type-ui block text-ink">
                      {rel.title}
                    </span>
                    <span className="mt-0.5 line-clamp-1 font-[family-name:var(--font-lora)] text-xs text-ink-muted">
                      {rel.summary}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <AnsweredQuestionsList storyId={storyId} />

        <AskAboutStory storyId={storyId} />

        <div className="mt-8 flex flex-col gap-3 border-t border-[var(--color-divider)] pt-6 sm:flex-row">
          <Link
            href={`/ask?story=${storyId}`}
            className="flex-1 rounded-lg bg-clay py-2.5 text-center text-sm font-medium text-warm-white transition-colors hover:bg-clay-mid"
          >
            Ask about this story
          </Link>
          <Link
            href="/stories"
            className="flex-1 rounded-lg border border-[var(--color-border)] bg-warm-white py-2.5 text-center text-sm font-medium text-ink transition-colors hover:border-clay-border"
          >
            Browse more stories
          </Link>
        </div>
      </div>
    </>
  );
}
