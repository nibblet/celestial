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
      className={`rounded-[20px] border border-[rgba(240,232,213,0.14)] bg-[rgba(240,232,213,0.03)] p-5 md:p-6 ${className}`}
    >
      <div className="flex items-center justify-between">
        <h3 className="type-era-label text-[rgba(240,232,213,0.58)]">
          A passage you kept
        </h3>
        <Link
          href="/profile/highlights"
          className="type-era-label text-[rgba(240,232,213,0.5)] hover:text-[#f0e8d5]"
        >
          {totalCount} saved →
        </Link>
      </div>
      <blockquote className="mt-4 border-l-2 border-[rgba(212,168,67,0.5)] pl-4 font-[family-name:var(--font-lora)] text-base italic leading-relaxed text-[#f0e8d5] md:text-lg">
        &ldquo;{passage.text}&rdquo;
      </blockquote>
      <p className="mt-3 font-[family-name:var(--font-inter)] text-xs text-[rgba(240,232,213,0.5)]">
        From{" "}
        <Link
          href={`/stories/${passage.storyId}`}
          className="text-[#d4a843] hover:underline"
        >
          {passage.storyTitle}
        </Link>{" "}
        · saved {formatSavedAt(passage.savedAt)}
      </p>
    </section>
  );
}
