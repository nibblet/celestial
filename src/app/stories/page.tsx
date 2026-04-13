"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { storiesData } from "@/lib/wiki/static-data";

const LIFE_STAGES = ["All", "Childhood", "Education", "Early Career", "Mid Career", "Leadership", "Reflection", "Legacy"];

export default function StoriesPage() {
  const [search, setSearch] = useState("");
  const [selectedStage, setSelectedStage] = useState("All");
  const [selectedTheme, setSelectedTheme] = useState("All");

  const allThemes = useMemo(() => {
    const themes = new Set<string>();
    storiesData.forEach((s) => s.themes.forEach((t) => themes.add(t)));
    return ["All", ...Array.from(themes).sort()];
  }, []);

  const filtered = useMemo(() => {
    return storiesData.filter((story) => {
      const matchesSearch =
        !search ||
        story.title.toLowerCase().includes(search.toLowerCase()) ||
        story.summary.toLowerCase().includes(search.toLowerCase());
      const matchesStage =
        selectedStage === "All" || story.lifeStage === selectedStage;
      const matchesTheme =
        selectedTheme === "All" || story.themes.includes(selectedTheme);
      return matchesSearch && matchesStage && matchesTheme;
    });
  }, [search, selectedStage, selectedTheme]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:py-10">
      <h1 className="text-2xl md:text-3xl font-serif font-bold text-stone-800 mb-2">
        Story Library
      </h1>
      <p className="text-stone-500 text-sm mb-6">
        {storiesData.length} stories from Keith Cobb&apos;s life
      </p>

      {/* Filters */}
      <div className="space-y-3 mb-6">
        <input
          type="text"
          placeholder="Search stories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        />
        <div className="flex gap-2 overflow-x-auto pb-1">
          {LIFE_STAGES.map((stage) => (
            <button
              key={stage}
              onClick={() => setSelectedStage(stage)}
              className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                selectedStage === stage
                  ? "bg-amber-700 text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              {stage}
            </button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {allThemes.map((theme) => (
            <button
              key={theme}
              onClick={() => setSelectedTheme(theme)}
              className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                selectedTheme === theme
                  ? "bg-amber-700 text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              {theme}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <p className="text-stone-400 text-sm py-8 text-center">
            No stories match your filters.
          </p>
        )}
        {filtered.map((story) => (
          <Link
            key={story.storyId}
            href={`/stories/${story.storyId}`}
            className="block bg-white rounded-xl border border-stone-200 p-4 hover:border-amber-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-stone-800 group-hover:text-amber-700 transition-colors">
                  {story.title}
                </h2>
                <p className="text-sm text-stone-500 mt-1 line-clamp-2">
                  {story.summary}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="px-2 py-0.5 text-[10px] font-medium bg-stone-100 text-stone-600 rounded-full">
                    {story.lifeStage}
                  </span>
                  {story.themes.slice(0, 3).map((theme) => (
                    <span
                      key={theme}
                      className="px-2 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-700 rounded-full"
                    >
                      {theme}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
