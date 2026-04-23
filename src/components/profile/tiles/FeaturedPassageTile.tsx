import Link from "next/link";
import { GhostTile } from "./GhostTile";

type Props = {
  passage: {
    text: string;
    storyId: string;
    storyTitle: string;
    savedAt: string;
  } | null;
  totalCount: number;
  className?: string;
};

function formatSavedAt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function FeaturedPassageTile({ passage, totalCount, className = "" }: Props) {
  if (!passage) {
    return (
      <GhostTile
        label="A passage you kept"
        body="The passages you save will appear here."
        className={className}
      />
    );
  }

  return (
    <section
      className={`sci-panel p-5 md:p-6 ${className}`}
    >
      <div className="flex items-center justify-between">
        <h3 className="type-era-label text-[rgba(242,238,228,0.58)]">
          A passage you kept
        </h3>
        <Link
          href="/profile/highlights"
          className="type-era-label text-[rgba(242,238,228,0.5)] hover:text-[#f2eee4]"
        >
          {totalCount} saved →
        </Link>
      </div>
      <blockquote className="mt-4 border-l-2 border-[rgba(127,231,225,0.5)] pl-4 font-[family-name:var(--font-lora)] text-base italic leading-relaxed text-[#f2eee4] md:text-lg">
        &ldquo;{passage.text}&rdquo;
      </blockquote>
      <p className="mt-3 font-[family-name:var(--font-inter)] text-xs text-[rgba(242,238,228,0.5)]">
        From{" "}
        <Link
          href={`/stories/${passage.storyId}`}
          className="text-[#7fe7e1] hover:underline"
        >
          {passage.storyTitle}
        </Link>{" "}
        · saved {formatSavedAt(passage.savedAt)}
      </p>
    </section>
  );
}
