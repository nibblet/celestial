import { getAllThemes, getThemeBySlug, getStoryById } from "@/lib/wiki/parser";
import Link from "next/link";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
  const themes = getAllThemes();
  return themes.map((t) => ({ slug: t.slug }));
}

export default async function ThemeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const theme = getThemeBySlug(slug);

  if (!theme) notFound();

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
      <Link
        href="/themes"
        className="text-sm text-stone-400 hover:text-stone-600 transition-colors mb-4 inline-block"
      >
        &larr; All Themes
      </Link>

      <h1 className="text-2xl md:text-3xl font-serif font-bold text-stone-800 mb-2">
        {theme.name}
      </h1>
      <p className="text-stone-500 text-sm mb-6">
        {theme.storyCount} stories explore this theme
      </p>

      {/* Principles */}
      {theme.principles.length > 0 && (
        <div className="bg-white border border-stone-200 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-stone-800 uppercase tracking-wide mb-3">
            Key Principles
          </h2>
          <ul className="space-y-3">
            {theme.principles.map((p, i) => (
              <li key={i} className="text-sm text-stone-600">
                <span className="text-amber-600 mr-2">&#9679;</span>
                {p.text}
                {p.storyId && (
                  <Link
                    href={`/stories/${p.storyId}`}
                    className="text-amber-700 hover:underline ml-1 text-xs"
                  >
                    ({p.storyId})
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quotes */}
      {theme.quotes.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-stone-800 uppercase tracking-wide mb-3">
            Selected Quotes
          </h2>
          <div className="space-y-3">
            {theme.quotes.map((q, i) => (
              <blockquote
                key={i}
                className="border-l-3 border-amber-400 pl-4 text-sm text-stone-600 italic"
              >
                &ldquo;{q.text}&rdquo;
                {q.title && (
                  <span className="block text-xs text-stone-400 mt-1 not-italic">
                    — {q.title}
                  </span>
                )}
              </blockquote>
            ))}
          </div>
        </div>
      )}

      {/* Stories */}
      <div>
        <h2 className="text-sm font-semibold text-stone-800 uppercase tracking-wide mb-3">
          Stories
        </h2>
        <div className="space-y-2">
          {theme.storyIds.map((sid) => {
            const story = getStoryById(sid);
            if (!story) return null;
            return (
              <Link
                key={sid}
                href={`/stories/${sid}`}
                className="block bg-white border border-stone-200 rounded-lg p-3 hover:border-amber-300 transition-colors"
              >
                <span className="text-sm font-medium text-stone-800">
                  {story.title}
                </span>
                <span className="block text-xs text-stone-500 mt-0.5 line-clamp-1">
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
