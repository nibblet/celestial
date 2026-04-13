import Link from "next/link";
import { getAllThemes } from "@/lib/wiki/parser";

export default function ThemesPage() {
  const themes = getAllThemes();

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
      <h1 className="text-2xl md:text-3xl font-serif font-bold text-stone-800 mb-2">
        Themes &amp; Principles
      </h1>
      <p className="text-stone-500 text-sm mb-6">
        The values and principles that shaped Keith&apos;s decisions
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {themes.map((theme) => (
          <Link
            key={theme.slug}
            href={`/themes/${theme.slug}`}
            className="bg-white rounded-xl border border-stone-200 p-4 hover:border-amber-300 hover:shadow-sm transition-all group"
          >
            <h2 className="text-base font-semibold text-stone-800 group-hover:text-amber-700 transition-colors">
              {theme.name}
            </h2>
            <p className="text-xs text-stone-400 mt-1">
              {theme.storyCount} stories &middot;{" "}
              {theme.principles.length} principles
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
