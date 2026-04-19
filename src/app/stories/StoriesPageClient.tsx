"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { StoryCard, StorySource } from "@/lib/wiki/static-data";
import { Reveal } from "@/components/ui/Reveal";
import { SourceBadge } from "@/components/ui/SourceBadge";
import { lifeStageToEraAccent } from "@/lib/design/era";
import { ReadBadgeAgeAware } from "@/components/story/ReadBadgeAgeAware";

const SOURCE_FILTERS: { label: string; value: StorySource | "all" }[] = [
  { label: "All Sources", value: "all" },
  { label: "Memoir", value: "memoir" },
  { label: "Interview", value: "interview" },
  { label: "Family", value: "family" },
];

const IV_PLACEMENT: Record<string, string> = {
  IV_S01: "P1_S39",
  IV_S02: "P1_S02",
  IV_S03: "P1_S24",
  IV_S04: "P1_S25",
  IV_S05: "P1_S25",
  IV_S06: "P1_S38",
  IV_S07: "P1_S26",
  IV_S08: "P1_S17",
  IV_S09: "P1_S35",
  IV_S10: "P1_S39",
};

function interleaveSort(stories: StoryCard[]): StoryCard[] {
  const memoirOrder = new Map<string, number>();
  stories
    .filter((s) => s.source === "memoir")
    .sort((a, b) => a.storyId.localeCompare(b.storyId))
    .forEach((s, i) => memoirOrder.set(s.storyId, (i + 1) * 100));

  const sortKey = new Map<string, number>();
  for (const story of stories) {
    if (story.source === "memoir") {
      sortKey.set(story.storyId, memoirOrder.get(story.storyId) || 0);
    } else if (story.storyId in IV_PLACEMENT) {
      const anchorOrder = memoirOrder.get(IV_PLACEMENT[story.storyId]) || 9999;
      const ivNum = parseInt(story.storyId.replace("IV_S", "")) || 0;
      sortKey.set(story.storyId, anchorOrder + ivNum);
    } else {
      sortKey.set(story.storyId, 50000);
    }
  }

  return [...stories].sort(
    (a, b) => (sortKey.get(a.storyId) || 0) - (sortKey.get(b.storyId) || 0)
  );
}

const LIFE_STAGES = [
  "All",
  "Childhood",
  "Education",
  "Early Career",
  "Mid Career",
  "Leadership",
  "Reflection",
  "Legacy",
];

export function StoriesPageClient({
  stories,
  readStoryIds,
}: {
  stories: StoryCard[];
  readStoryIds: string[];
}) {
  const [search, setSearch] = useState("");
  const [selectedSource, setSelectedSource] = useState<StorySource | "all">("all");
  const [selectedStage, setSelectedStage] = useState("All");
  const [selectedTheme, setSelectedTheme] = useState("All");

  const readSet = useMemo(
    () => new Set(readStoryIds),
    [readStoryIds]
  );

  const allThemes = useMemo(() => {
    const themes = new Set<string>();
    stories.forEach((s) => s.themes.forEach((t) => themes.add(t)));
    return ["All", ...Array.from(themes).sort()];
  }, [stories]);

  const sorted = useMemo(() => interleaveSort(stories), [stories]);

  const filtered = useMemo(() => {
    return sorted.filter((story) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        story.title.toLowerCase().includes(q) ||
        story.summary.toLowerCase().includes(q);
      const matchesSource =
        selectedSource === "all" || story.source === selectedSource;
      const matchesStage =
        selectedStage === "All" || story.lifeStage === selectedStage;
      const matchesTheme =
        selectedTheme === "All" || story.themes.includes(selectedTheme);
      return matchesSearch && matchesSource && matchesStage && matchesTheme;
    });
  }, [sorted, search, selectedSource, selectedStage, selectedTheme]);

  return (
    <div className="mx-auto max-w-content px-[var(--page-padding-x)] py-6 md:py-10">
      <h1 className="type-page-title mb-2">Story Library</h1>
      <p className="type-ui mb-6 text-ink-muted">
        {`${stories.length} stories from Keith Cobb's memoir, interviews, and Beyond collection`}
      </p>

      <div className="mb-6 space-y-3">
        <input
          type="search"
          placeholder="Search stories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="type-ui w-full rounded-lg border border-[var(--color-border)] bg-warm-white px-3 py-2 text-ink placeholder:text-ink-ghost"
        />
        <div className="flex gap-2 overflow-x-auto pb-1">
          {SOURCE_FILTERS.map((sf) => (
            <button
              key={sf.value}
              type="button"
              onClick={() => setSelectedSource(sf.value)}
              className={`type-meta shrink-0 rounded-full px-3 py-1 transition-colors ${
                selectedSource === sf.value
                  ? "bg-ocean text-warm-white"
                  : "bg-warm-white text-ink-muted ring-1 ring-[var(--color-border)] hover:text-ink"
              }`}
            >
              {sf.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {LIFE_STAGES.map((stage) => (
            <button
              key={stage}
              type="button"
              onClick={() => setSelectedStage(stage)}
              className={`type-meta shrink-0 rounded-full px-3 py-1 transition-colors ${
                selectedStage === stage
                  ? "bg-clay text-warm-white"
                  : "bg-warm-white text-ink-muted ring-1 ring-[var(--color-border)] hover:text-ink"
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
              type="button"
              onClick={() => setSelectedTheme(theme)}
              className={`type-meta shrink-0 rounded-full px-3 py-1 transition-colors ${
                selectedTheme === theme
                  ? "bg-burgundy text-warm-white"
                  : "bg-warm-white text-ink-muted ring-1 ring-[var(--color-border)] hover:text-ink"
              }`}
            >
              {theme}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-ink-ghost">
            No stories match your filters.
          </p>
        )}
        {filtered.map((story) => {
          const era = lifeStageToEraAccent(story.lifeStage);
          return (
            <Reveal key={story.storyId}>
              <Link
                href={`/stories/${story.storyId}`}
                className="group block rounded-xl border border-[var(--color-border)] bg-warm-white p-4 transition-[transform,box-shadow,border-color] duration-[var(--duration-slow)] ease-[var(--ease-out-soft)] hover:-translate-y-0.5 hover:border-clay-border hover:shadow-[0_12px_40px_rgba(44,28,16,0.08)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-[family-name:var(--font-playfair)] text-base font-semibold text-ink transition-colors group-hover:text-burgundy">
                      {story.title}
                    </h2>
                    <p className="mt-1 line-clamp-2 font-[family-name:var(--font-lora)] text-sm leading-relaxed text-ink-muted">
                      {story.summary}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <SourceBadge source={story.source} />
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${era.badgeClass}`}
                      >
                        {story.lifeStage}
                      </span>
                      {story.themes.slice(0, 3).map((theme) => {
                        const isLeadership = theme
                          .toLowerCase()
                          .includes("leadership");
                        return (
                          <span
                            key={theme}
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              isLeadership
                                ? "bg-ocean-pale text-ocean"
                                : "bg-green-pale text-green"
                            }`}
                          >
                            {theme}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  {readSet.has(story.storyId) && <ReadBadgeAgeAware />}
                </div>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}
