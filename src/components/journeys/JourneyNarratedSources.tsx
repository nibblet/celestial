import Link from "next/link";
import { getStoryById } from "@/lib/wiki/parser";
import { SourceBadge } from "@/components/ui/SourceBadge";
import { enrichLegacyStorySource } from "@/lib/wiki/taxonomy";

export function JourneyNarratedSources({
  sourceStoryIds,
}: {
  sourceStoryIds: string[];
}) {
  const stories = sourceStoryIds
    .flatMap((id) => {
      const story = getStoryById(id);
      return story ? [story] : [];
    });

  if (stories.length === 0) return null;

  return (
    <details className="rounded-xl border border-[var(--color-border)] bg-warm-white">
      <summary className="type-ui cursor-pointer list-none px-4 py-3 font-medium text-ink marker:content-none">
        Sources behind this section
      </summary>
      <div className="space-y-3 border-t border-[var(--color-divider)] px-4 py-4">
        {stories.map((story) => (
          <Link
            key={story.storyId}
            href={`/stories/${story.storyId}`}
            className="block rounded-lg border border-[var(--color-border)] bg-warm-white-2 p-3 transition-colors hover:border-clay-border"
          >
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="type-ui text-ink">{story.title}</span>
              <SourceBadge
                sourceType={enrichLegacyStorySource(story.storyId, story.source).sourceType}
                legacySource={story.source}
              />
            </div>
            <p className="font-[family-name:var(--font-lora)] text-xs leading-relaxed text-ink-muted">
              {story.summary}
            </p>
          </Link>
        ))}
      </div>
    </details>
  );
}
