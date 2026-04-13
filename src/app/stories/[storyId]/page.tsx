import { getAllStories, getStoryById } from "@/lib/wiki/parser";
import Link from "next/link";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
  const stories = getAllStories();
  return stories.map((s) => ({ storyId: s.storyId }));
}

export default async function StoryDetailPage({
  params,
}: {
  params: Promise<{ storyId: string }>;
}) {
  const { storyId } = await params;
  const story = getStoryById(storyId);

  if (!story) notFound();

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
      {/* Back link */}
      <Link
        href="/stories"
        className="text-sm text-stone-400 hover:text-stone-600 transition-colors mb-4 inline-block"
      >
        &larr; All Stories
      </Link>

      {/* Header */}
      <h1 className="text-2xl md:text-3xl font-serif font-bold text-stone-800 mb-2">
        {story.title}
      </h1>
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="px-2.5 py-0.5 text-xs font-medium bg-stone-100 text-stone-600 rounded-full">
          {story.lifeStage}
        </span>
        {story.themes.map((theme) => (
          <Link
            key={theme}
            href={`/themes/${theme.toLowerCase().replace(/\s+/g, "-")}`}
            className="px-2.5 py-0.5 text-xs font-medium bg-amber-50 text-amber-700 rounded-full hover:bg-amber-100 transition-colors"
          >
            {theme}
          </Link>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-stone-700 italic">{story.summary}</p>
      </div>

      {/* Full text */}
      <article className="prose prose-stone prose-sm md:prose-base max-w-none mb-8 leading-relaxed">
        {story.fullText.split("\n").map((paragraph, i) =>
          paragraph.trim() ? (
            <p key={i}>{paragraph.trim()}</p>
          ) : null
        )}
      </article>

      {/* Principles */}
      {story.principles.length > 0 && (
        <div className="bg-white border border-stone-200 rounded-xl p-5 mb-4">
          <h2 className="text-sm font-semibold text-stone-800 uppercase tracking-wide mb-3">
            What This Story Shows
          </h2>
          <ul className="space-y-2">
            {story.principles.map((p, i) => (
              <li key={i} className="text-sm text-stone-600 flex gap-2">
                <span className="text-amber-600 mt-0.5">&#9679;</span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Heuristics */}
      {story.heuristics.length > 0 && (
        <div className="bg-white border border-stone-200 rounded-xl p-5 mb-4">
          <h2 className="text-sm font-semibold text-stone-800 uppercase tracking-wide mb-3">
            If You&apos;re Thinking About...
          </h2>
          <ul className="space-y-2">
            {story.heuristics.map((h, i) => (
              <li key={i} className="text-sm text-stone-600 flex gap-2">
                <span className="text-amber-600 mt-0.5">&#9679;</span>
                {h}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quotes */}
      {story.quotes.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-stone-800 uppercase tracking-wide mb-3">
            Key Quotes
          </h2>
          <div className="space-y-3">
            {story.quotes.map((q, i) => (
              <blockquote
                key={i}
                className="border-l-3 border-amber-400 pl-4 text-sm text-stone-600 italic"
              >
                {q}
              </blockquote>
            ))}
          </div>
        </div>
      )}

      {/* Related stories */}
      {story.relatedStoryIds.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-stone-800 uppercase tracking-wide mb-3">
            Related Stories
          </h2>
          <div className="space-y-2">
            {story.relatedStoryIds.map((relId) => {
              const rel = getStoryById(relId);
              if (!rel) return null;
              return (
                <Link
                  key={relId}
                  href={`/stories/${relId}`}
                  className="block bg-white border border-stone-200 rounded-lg p-3 hover:border-amber-300 transition-colors"
                >
                  <span className="text-sm font-medium text-stone-800">
                    {rel.title}
                  </span>
                  <span className="block text-xs text-stone-500 mt-0.5 line-clamp-1">
                    {rel.summary}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3 mt-8 pt-6 border-t border-stone-200">
        <Link
          href={`/ask?story=${storyId}`}
          className="flex-1 text-center py-2.5 bg-amber-700 text-white text-sm font-medium rounded-lg hover:bg-amber-800 transition-colors"
        >
          Ask about this story
        </Link>
        <Link
          href="/stories"
          className="flex-1 text-center py-2.5 bg-stone-100 text-stone-700 text-sm font-medium rounded-lg hover:bg-stone-200 transition-colors"
        >
          Browse more stories
        </Link>
      </div>
    </div>
  );
}
