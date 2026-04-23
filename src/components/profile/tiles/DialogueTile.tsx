import Link from "next/link";
import { book } from "@/config/book";
import { GhostTile } from "./GhostTile";
import type { GalleryDialogueItem } from "@/lib/analytics/profile-gallery-data";

type Props = {
  recent: GalleryDialogueItem[];
  askedCount: number;
  answeredCount: number;
  className?: string;
};

export function DialogueTile({
  recent,
  askedCount,
  answeredCount,
  className = "",
}: Props) {
  if (askedCount === 0 || recent.length === 0) {
    return (
      <GhostTile
        label={`Questions about ${book.shortName}`}
        body={`Questions you ask about ${book.title} will live here.`}
        className={className}
      />
    );
  }

  return (
    <section
      className={`sci-panel p-5 ${className}`}
    >
      <div className="flex items-center justify-between">
        <h3 className="type-era-label text-[rgba(242,238,228,0.58)]">
          {`Your questions · ${book.title}`}
        </h3>
        <Link
          href="/profile/questions"
          className="type-era-label text-[rgba(242,238,228,0.5)] hover:text-[#f2eee4]"
        >
          {askedCount} asked · {answeredCount} answered →
        </Link>
      </div>
      <ul className="mt-4 space-y-3">
        {recent.map((item) => (
          <li
            key={item.id}
            className="border-b border-[rgba(242,238,228,0.08)] pb-3 last:border-b-0 last:pb-0"
          >
            <p className="font-[family-name:var(--font-inter)] text-sm italic text-[rgba(242,238,228,0.92)]">
              &ldquo;{item.question}&rdquo;
            </p>
            <p className="mt-1 font-[family-name:var(--font-inter)] text-xs">
              {item.answered && item.answerText ? (
                <span className="text-[#7fe7e1]">
                  {book.author}: &ldquo;{item.answerText}&rdquo;
                </span>
              ) : (
                <span className="text-[rgba(242,238,228,0.5)]">
                  Waiting for a story-based answer…
                </span>
              )}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
