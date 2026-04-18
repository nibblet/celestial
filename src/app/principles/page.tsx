import Link from "next/link";
import { PrincipleFormationTimeline } from "@/components/viz/PrincipleFormationTimeline";
import { buildEraPrincipleMatrix } from "@/lib/wiki/graph";
import { getAllCanonicalPrinciples } from "@/lib/wiki/parser";

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

function IconAsk({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function PrinciplesPage() {
  const principles = getAllCanonicalPrinciples();
  const formation = buildEraPrincipleMatrix();
  const primaryCta =
    "type-ui inline-flex min-h-[48px] min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-clay px-4 py-2.5 text-center text-sm font-semibold tracking-tight text-warm-white shadow-[0_1px_3px_rgba(44,28,16,0.18)] transition-[box-shadow,filter] duration-200 hover:shadow-[0_6px_20px_rgba(181,69,27,0.35)] hover:brightness-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2 focus-visible:ring-offset-warm-white active:brightness-[0.97]";
  const secondaryCta =
    "type-ui inline-flex min-h-[48px] min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-warm-white-2 px-4 py-2.5 text-center text-sm font-semibold tracking-tight text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] transition-[border-color,background-color,box-shadow,color] duration-200 hover:border-clay-border hover:bg-clay-light hover:shadow-[0_2px_10px_rgba(44,28,16,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-clay-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-warm-white active:bg-warm-white-2 [&_svg]:text-clay";

  return (
    <div className="mx-auto max-w-wide px-[var(--page-padding-x)] py-6 md:py-10">
      <div className="mx-auto max-w-content">
        <h1 className="type-page-title mb-2">Keith&apos;s Principles</h1>
        <p className="type-ui mb-4 max-w-2xl text-ink-muted">
          These are recurring principles shown through Keith&apos;s stories. Each
          one is supported by moments, choices, and lessons that appear across
          many parts of his life.
        </p>
      </div>

      <PrincipleFormationTimeline data={formation} />

      <div className="mx-auto max-w-content">
        <div className="grid gap-4 lg:grid-cols-2">
          {principles.map((principle) => (
            <article
              key={principle.id}
              className="flex flex-col rounded-2xl border border-[var(--color-border)] bg-warm-white p-5"
            >
              <h2 className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-burgundy">
                <Link
                  href={`/principles/${principle.slug}`}
                  className="hover:text-clay"
                >
                  {principle.title}
                </Link>
              </h2>

              <p className="mt-3 font-[family-name:var(--font-lora)] text-sm leading-relaxed text-ink-muted">
                {principle.thesis}
              </p>

              <p className="mt-4 type-meta text-ink-ghost">
                {principle.stories.length} supporting{" "}
                {principle.stories.length === 1 ? "story" : "stories"}
              </p>

              <div className="mt-5 flex w-full flex-row gap-3">
                <Link
                  href={`/principles/${principle.slug}`}
                  className={primaryCta}
                >
                  <IconBookOpen className="h-4 w-4 shrink-0 opacity-95" />
                  Read Narrative
                </Link>
                <Link
                  href={`/ask?prompt=${encodeURIComponent(principle.askPrompt)}`}
                  className={secondaryCta}
                >
                  <IconAsk className="h-4 w-4 shrink-0 opacity-90" />
                  Ask About This
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
