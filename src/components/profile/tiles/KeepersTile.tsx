import Link from "next/link";
import { GhostTile } from "./GhostTile";

type Props = {
  top: { storyId: string; storyTitle: string; favoritedAt: string }[];
  totalCount: number;
  className?: string;
};

function formatSavedAt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function KeepersTile({ top, totalCount, className = "" }: Props) {
  if (totalCount === 0) {
    return (
      <GhostTile
        label="Keepers"
        body="Stories you favorite will live here."
        className={className}
      />
    );
  }

  return (
    <section
      className={`rounded-[20px] border border-[rgba(240,232,213,0.14)] bg-[rgba(240,232,213,0.03)] p-5 ${className}`}
    >
      <div className="flex items-center justify-between">
        <h3 className="type-era-label text-[rgba(240,232,213,0.58)]">Keepers</h3>
        <Link
          href="/profile/favorites"
          className="type-era-label text-[rgba(240,232,213,0.5)] hover:text-[#f0e8d5]"
        >
          {totalCount} →
        </Link>
      </div>
      <ul className="mt-4 space-y-3">
        {top.map((f) => (
          <li key={f.storyId}>
            <Link
              href={`/stories/${f.storyId}`}
              className="font-[family-name:var(--font-playfair)] text-base text-[#f0e8d5] hover:underline"
            >
              {f.storyTitle}
            </Link>
            <p className="mt-1 font-[family-name:var(--font-inter)] text-xs text-[rgba(240,232,213,0.5)]">
              Saved {formatSavedAt(f.favoritedAt)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
