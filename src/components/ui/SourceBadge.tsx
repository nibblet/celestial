import type { LegacyStorySource, SourceTypeV1 } from "@/lib/wiki/taxonomy";

export function SourceBadge({
  sourceType,
  legacySource = "family",
  className = "",
  variant = "default",
}: {
  sourceType?: SourceTypeV1;
  legacySource?: LegacyStorySource;
  className?: string;
  /** Library list shows a compact “Book I” chip for canon chapters; chapter detail omits it. */
  variant?: "default" | "library";
}) {
  const resolved: SourceTypeV1 =
    sourceType ??
    (legacySource === "memoir" || legacySource === "interview"
      ? "legacy_import"
      : "book_i_chapter");

  if (resolved === "book_i_chapter") {
    if (variant !== "library") return null;
    return (
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-medium bg-warm-white text-ink ring-1 ring-[var(--color-border)] ${className}`}
      >
        Book I
      </span>
    );
  }

  if (legacySource === "interview") {
    return (
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-medium bg-ocean-pale text-ocean ${className}`}
      >
        Interview
      </span>
    );
  }
  if (legacySource === "memoir") {
    return (
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-medium bg-burgundy-light text-burgundy ${className}`}
      >
        Legacy memoir
      </span>
    );
  }

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-medium bg-green-pale text-green ${className}`}
    >
      Supplemental
    </span>
  );
}
