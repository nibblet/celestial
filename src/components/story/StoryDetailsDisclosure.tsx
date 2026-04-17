import Link from "next/link";
import type { StorySource } from "@/lib/wiki/parser";
import { SourceBadge } from "@/components/ui/SourceBadge";

interface StoryDetailsDisclosureProps {
  source: StorySource;
  lifeStage: string;
  themes: string[];
}

export function StoryDetailsDisclosure({
  source,
  lifeStage,
  themes,
}: StoryDetailsDisclosureProps) {
  const hasAnyMeta = source !== "memoir" || lifeStage || themes.length > 0;
  if (!hasAnyMeta) return null;

  return (
    <details className="group mb-5 border-t border-[var(--color-divider)] pt-3 [&>summary]:list-none">
      <summary className="type-ui flex cursor-pointer select-none items-center gap-1.5 text-ink-ghost transition-colors hover:text-ink [&::-webkit-details-marker]:hidden">
        <span>Details</span>
        <span
          aria-hidden="true"
          className="inline-block transition-transform group-open:rotate-180"
        >
          &#9662;
        </span>
      </summary>

      <div className="mt-3 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <SourceBadge source={source} />
          {lifeStage && (
            <span className="type-meta text-ink-ghost">{lifeStage}</span>
          )}
        </div>

        {themes.length > 0 && (
          <div>
            <p className="type-meta mb-2 text-ink-ghost">Themes</p>
            <div className="flex flex-wrap gap-2">
              {themes.map((theme) => {
                const isLeadership = theme
                  .toLowerCase()
                  .includes("leadership");
                return (
                  <Link
                    key={theme}
                    href={`/themes/${theme.toLowerCase().replace(/\s+/g, "-")}`}
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
                      isLeadership
                        ? "border-ocean/35 text-ocean hover:border-ocean hover:bg-ocean-pale/50"
                        : "border-green/35 text-green hover:border-green hover:bg-green-pale/50"
                    }`}
                  >
                    {theme}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </details>
  );
}
