import { book } from "@/config/book";
import Link from "next/link";
import { HomeHero } from "@/components/home/HomeHero";
import { Reveal } from "@/components/ui/Reveal";

export type HomeReadingState = {
  state: "new" | "reading" | "finished";
  nextHref: string;
  nextTitle: string | null;
  finishedCount: number;
};

type HomePageClientProps = {
  /** Last finished chapter and its recap; null for new or finished readers. */
  leftOff: { title: string; recap: string | null } | null;
  signedIn: boolean;
  chapterCount: number;
  reading: HomeReadingState;
};

export function HomePageClient({
  leftOff,
  signedIn,
  chapterCount,
  reading,
}: HomePageClientProps) {
  const primaryLabel =
    reading.state === "new"
      ? "Start reading"
      : reading.state === "reading"
      ? "Continue reading"
      : "Browse the chapters";

  const cards = [
    {
      href: "/stories",
      title: "Read",
      description:
        reading.state === "reading"
          ? `You've finished ${reading.finishedCount} of ${chapterCount} chapters. Pick up where you left off.`
          : `${chapterCount} chapters. Chapter 1 is open to everyone.`,
    },
    {
      href: "/codex",
      title: "Explore the world",
      description:
        "Characters, factions, places and mission logs — each page shows only what you've read so far.",
    },
    {
      href: "/ask",
      title: "Ask the companion",
      description: `Ask anything about ${book.shortName}. Answers stop at your bookmark, so nothing ahead is spoiled.`,
    },
  ];

  return (
    <div className="pb-12">
      <HomeHero
        primaryHref={reading.nextHref}
        primaryLabel={primaryLabel}
        primaryDetail={reading.state === "finished" ? null : reading.nextTitle}
        showSignIn={!signedIn}
      />

      <div className="mx-auto max-w-content px-[var(--page-padding-x)] py-12 md:py-16">
        {leftOff && (
          <section
            aria-labelledby="left-off-heading"
            className="sci-panel mb-12 p-6"
          >
            <p id="left-off-heading" className="type-meta mb-2 text-ink-ghost">
              Where you left off
            </p>
            <h2 className="type-story-title mb-2 text-xl">
              You finished {leftOff.title}
            </h2>
            {leftOff.recap && (
              <p className="mb-4 font-[family-name:var(--font-lora)] text-base leading-relaxed text-ink-muted">
                {leftOff.recap}
              </p>
            )}
            <Link
              href={reading.nextHref}
              className="inline-flex min-h-[44px] items-center rounded-lg bg-clay px-4 text-sm font-medium text-warm-white no-underline transition-colors hover:bg-clay-mid"
            >
              {reading.nextTitle
                ? `Continue with ${reading.nextTitle}`
                : "Continue reading"}
            </Link>
          </section>
        )}

        <Reveal className="mb-10 text-center">
          <h2 className="type-page-title mb-3 text-balance">
            A companion that keeps your place
          </h2>
          <p className="type-ui mx-auto max-w-lg text-ink-muted">
            {`Read ${book.title} here, or alongside your own copy.`} Tell the
            companion which chapter you&apos;re on and everything else — the
            cast, the world, the answers — stays behind your bookmark.
          </p>
        </Reveal>

        <div className="grid gap-4 md:grid-cols-3">
          {cards.map((card) => (
            <Reveal key={card.href}>
              <Link
                href={card.href}
                className="sci-panel sci-card-link group block h-full p-6"
              >
                <h3 className="type-story-title mb-2 transition-colors group-hover:text-burgundy">
                  {card.title}
                </h3>
                <p className="font-[family-name:var(--font-lora)] text-sm leading-relaxed text-ink-muted">
                  {card.description}
                </p>
              </Link>
            </Reveal>
          ))}
        </div>

        {!signedIn && (
          <p className="type-ui mt-8 text-center text-ink-muted">
            Explore and Ask need a free account, so the companion can remember
            your place.{" "}
            <Link
              href="/signup"
              className="text-burgundy underline underline-offset-2"
            >
              Create one
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
