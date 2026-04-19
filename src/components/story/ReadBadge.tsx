interface ReadBadgeProps {
  /** Defaults to "Read"; use {@link ReadBadgeAgeAware} for age-mode-aware labeling. */
  label?: string;
  className?: string;
}

/** Small label for stories the signed-in user has already opened (tracked via ReadTracker). */
export function ReadBadge({ label = "Read", className }: ReadBadgeProps) {
  return (
    <span
      className={`type-meta inline-flex shrink-0 items-center rounded-full border border-[color-mix(in_srgb,var(--color-gold)_35%,transparent)] bg-gold-pale px-2.5 py-1 text-xs font-medium text-gold ${className ?? ""}`}
    >
      {label}
    </span>
  );
}
