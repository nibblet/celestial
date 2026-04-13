import Link from "next/link";
import { getTimeline, getStoryById } from "@/lib/wiki/parser";

export default function TimelinePage() {
  const events = getTimeline();

  // Group by decade
  const decades: Record<string, typeof events> = {};
  for (const evt of events) {
    const decade = `${Math.floor(evt.year / 10) * 10}s`;
    if (!decades[decade]) decades[decade] = [];
    decades[decade].push(evt);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
      <h1 className="text-2xl md:text-3xl font-serif font-bold text-stone-800 mb-2">
        Life Timeline
      </h1>
      <p className="text-stone-500 text-sm mb-6">
        {events.length} events spanning Keith Cobb&apos;s life and career
      </p>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-4 top-0 bottom-0 w-px bg-stone-200" />

        {Object.entries(decades)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([decade, decadeEvents]) => (
            <div key={decade} className="mb-8">
              <h2 className="text-lg font-serif font-bold text-stone-800 ml-10 mb-3">
                {decade}
              </h2>
              <div className="space-y-4">
                {decadeEvents
                  .sort((a, b) => a.year - b.year)
                  .map((evt, i) => {
                    const story = getStoryById(evt.storyRef);
                    return (
                      <div key={i} className="relative flex items-start gap-4 ml-0">
                        {/* Dot */}
                        <div className="flex-shrink-0 w-8 flex justify-center pt-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-600 ring-2 ring-white" />
                        </div>
                        {/* Content */}
                        <div className="flex-1 bg-white border border-stone-200 rounded-lg p-3 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs font-bold text-amber-700">
                              {evt.year}
                            </span>
                            <span className="text-sm text-stone-800">
                              {evt.event}
                            </span>
                          </div>
                          {(evt.organization || evt.location) && (
                            <p className="text-xs text-stone-400 mt-0.5">
                              {[evt.organization, evt.location]
                                .filter(Boolean)
                                .join(" — ")}
                            </p>
                          )}
                          {story && (
                            <Link
                              href={`/stories/${evt.storyRef}`}
                              className="text-xs text-amber-700 hover:underline mt-1 inline-block"
                            >
                              Read: {story.title}
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
