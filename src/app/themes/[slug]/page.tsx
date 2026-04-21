import { getThemeBySlug, getStoryById } from "@/lib/wiki/parser";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getReaderProgress, isStoryUnlocked } from "@/lib/progress/reader-progress";

export default async function ThemeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const theme = getThemeBySlug(slug);
  const progress = await getReaderProgress();

  if (!theme) notFound();

  return (
    <div className="mx-auto max-w-content px-[var(--page-padding-x)] py-6 md:py-10">
      <Link
        href="/themes"
        className="type-ui mb-4 inline-block text-ink-ghost no-underline transition-colors hover:text-ocean"
      >
        &larr; All Themes
      </Link>

      <h1 className="type-page-title mb-2">{theme.name}</h1>
      <p className="type-ui mb-6 text-ink-muted">
        {theme.storyCount} stories explore this theme
      </p>

      {theme.principles.length > 0 && (
        <div className="mb-6 rounded-xl border border-[var(--color-border)] bg-warm-white p-5">
          <h2 className="type-meta mb-3 text-ink">Key Principles</h2>
          <ul className="space-y-3">
            {theme.principles
              .filter((p) => !p.storyId || isStoryUnlocked(p.storyId, progress))
              .map((p, i) => (
              <li
                key={i}
                className="font-[family-name:var(--font-lora)] text-sm text-ink-muted"
              >
                <span className="mr-2 text-clay">&#9679;</span>
                {p.text}
                {p.storyId && (
                  <Link
                    href={`/stories/${p.storyId}`}
                    className="ml-1 text-xs text-ocean hover:underline"
                  >
                    ({p.storyId})
                  </Link>
                )}
              </li>
              ))}
          </ul>
        </div>
      )}

      {theme.quotes.length > 0 && (
        <div className="mb-6">
          <h2 className="type-meta mb-3 text-ink">Selected Quotes</h2>
          <div className="space-y-3">
            {theme.quotes.map((q, i) => (
              <blockquote
                key={i}
                className="type-pullquote border-l-[3px] border-clay-mid pl-4 text-base not-italic text-ink-muted"
              >
                &ldquo;{q.text}&rdquo;
                {q.title && (
                  <span className="type-ui mt-1 block normal-case not-italic tracking-normal text-ink-ghost">
                    — {q.title}
                  </span>
                )}
              </blockquote>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="type-meta mb-3 text-ink">Stories</h2>
        <div className="space-y-2">
          {theme.storyIds.filter((sid) => isStoryUnlocked(sid, progress)).map((sid) => {
            const story = getStoryById(sid);
            if (!story) return null;
            return (
              <Link
                key={sid}
                href={`/stories/${sid}`}
                className="block rounded-lg border border-[var(--color-border)] bg-warm-white p-3 transition-colors hover:border-clay-border"
              >
                <span className="type-ui block text-ink">{story.title}</span>
                <span className="mt-0.5 line-clamp-1 font-[family-name:var(--font-lora)] text-xs text-ink-muted">
                  {story.summary}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
