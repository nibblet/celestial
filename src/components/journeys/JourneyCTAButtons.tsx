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

  return (
    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
      {hasNarrated && (
        <Link
          href={`/journeys/${slug}/narrated`}
          className="type-ui inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-clay px-4 py-2.5 text-center text-sm font-medium !text-[rgb(215,130,66)] transition-colors hover:bg-clay-mid"
        >
          <IconBookOpen className="h-5 w-5 shrink-0 opacity-95" />
          Read the narrative
        </Link>
      )}
      {hasGuided && (
        <Link
          href={`/journeys/${slug}`}
          className={`type-ui inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-center text-sm font-medium transition-colors ${
            guidedIsSecondary
              ? "border border-[var(--color-border)] bg-warm-white-2 text-ink hover:border-clay-border"
              : "bg-clay text-warm-white hover:bg-clay-mid"
          }`}
        >
          <IconStepPath className="h-5 w-5 shrink-0 opacity-90" />
          Read the stories
        </Link>
      )}
    </div>
  );
}
