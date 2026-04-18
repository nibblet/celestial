import Link from "next/link";

function IconBookOpen({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.051.18-3 .512v15.343c.923-.402 1.923-.652 3-.652 1.517 0 2.93.463 4.125 1.24m-6-3.75A8.967 8.967 0 0 1 18 3.75c1.052 0 2.051.18 3 .512v15.343c-.923-.402-1.923-.652-3-.652-1.517 0-2.93.463-4.125 1.24m-6-3.75"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconStepPath({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle cx="6" cy="6" r="2" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="6" cy="18" r="2" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="18" cy="12" r="2" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M7.5 7.5 7.5 16.5M7.5 18l10-4.5M18 10.5V7.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type JourneyCTAButtonsProps = {
  slug: string;
  hasNarrated: boolean;
  hasGuided: boolean;
};

export function JourneyCTAButtons({
  slug,
  hasNarrated,
  hasGuided,
}: JourneyCTAButtonsProps) {
  const guidedIsSecondary = hasNarrated && hasGuided;

  /** Solid primary — soft elevation reads more current than flat fills. */
  const primaryCta =
    "type-ui inline-flex min-h-[48px] min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-clay px-4 py-2.5 text-center text-sm font-semibold tracking-tight text-warm-white shadow-[0_1px_3px_rgba(44,28,16,0.18)] transition-[box-shadow,filter] duration-200 hover:shadow-[0_6px_20px_rgba(181,69,27,0.35)] hover:brightness-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2 focus-visible:ring-offset-warm-white active:brightness-[0.97]";

  /** Neutral secondary — outline + surface; avoids competing with a second orange block. */
  const secondaryCta =
    "type-ui inline-flex min-h-[48px] min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-warm-white-2 px-4 py-2.5 text-center text-sm font-semibold tracking-tight text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] transition-[border-color,background-color,box-shadow,color] duration-200 hover:border-clay-border hover:bg-clay-light hover:shadow-[0_2px_10px_rgba(44,28,16,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-clay-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-warm-white active:bg-warm-white-2 [&_svg]:text-clay";

  return (
    <div className="mt-4 flex w-full flex-row gap-3">
      {hasNarrated && (
        <Link href={`/journeys/${slug}/narrated`} className={primaryCta}>
          <IconBookOpen className="h-4 w-4 shrink-0 opacity-95" />
          Read Narrative
        </Link>
      )}
      {hasGuided && (
        <Link
          href={`/journeys/${slug}`}
          className={
            guidedIsSecondary ? secondaryCta : primaryCta
          }
        >
          <IconStepPath className="h-4 w-4 shrink-0 opacity-90" />
          Browse Chapters
        </Link>
      )}
    </div>
  );
}
