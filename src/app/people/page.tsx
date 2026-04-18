import Link from "next/link";
import {
  getAllPeople,
  type PersonTier,
  type WikiPerson,
} from "@/lib/wiki/parser";
import {
  PEOPLE_INDEX_FALLBACK,
  PEOPLE_INDEX_SECTION_ORDER,
  PEOPLE_INDEX_SECTIONS,
  primaryTierForPeopleIndex,
} from "@/lib/wiki/people-tiers";

function storyCount(p: WikiPerson): number {
  return p.memoirStoryIds.length + p.interviewStoryIds.length;
}

export default function PeoplePage() {
  const people = getAllPeople();

  type BucketKey = PersonTier | "fallback";
  const buckets = new Map<BucketKey, WikiPerson[]>();

  for (const p of people) {
    const tier = primaryTierForPeopleIndex(p);
    const key: BucketKey = tier ?? "fallback";
    const list = buckets.get(key) ?? [];
    list.push(p);
    buckets.set(key, list);
  }

  for (const list of buckets.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }

  return (
    <div className="mx-auto max-w-wide px-[var(--page-padding-x)] py-6 md:py-10">
      <div className="mx-auto max-w-content">
        <h1 className="type-page-title mb-2">People</h1>
        <p className="type-ui mb-6 text-ink-muted">
          The family, friends, mentors, and colleagues who appear across
          Keith&apos;s memoir and the interviews. They are grouped by how they
          show up in the material—then click any name to see every story they
          appear in.
        </p>

        <p className="type-meta mb-8 text-ink-ghost">
          {people.length} people
        </p>

        <div className="space-y-10">
          {PEOPLE_INDEX_SECTION_ORDER.map((tier) => {
            const group = buckets.get(tier);
            if (!group?.length) return null;
            const { heading, blurb } = PEOPLE_INDEX_SECTIONS[tier];
            return (
              <section key={tier} aria-labelledby={`people-tier-${tier}`}>
                <h2
                  id={`people-tier-${tier}`}
                  className="font-[family-name:var(--font-playfair)] text-xl font-semibold tracking-tight text-ink md:text-2xl"
                >
                  {heading}
                </h2>
                <p className="type-ui mb-4 mt-2 max-w-2xl text-ink-muted">
                  {blurb}
                </p>
                <PeopleNameGrid people={group} />
              </section>
            );
          })}

          <FallbackPeopleSection group={buckets.get("fallback")} />
        </div>
      </div>
    </div>
  );
}

function FallbackPeopleSection({
  group,
}: {
  group: WikiPerson[] | undefined;
}) {
  if (!group?.length) return null;
  return (
    <section aria-labelledby="people-tier-fallback">
      <h2
        id="people-tier-fallback"
        className="font-[family-name:var(--font-playfair)] text-xl font-semibold tracking-tight text-ink md:text-2xl"
      >
        {PEOPLE_INDEX_FALLBACK.heading}
      </h2>
      <p className="type-ui mb-4 mt-2 max-w-2xl text-ink-muted">
        {PEOPLE_INDEX_FALLBACK.blurb}
      </p>
      <PeopleNameGrid people={group} />
    </section>
  );
}

function PeopleNameGrid({ people }: { people: WikiPerson[] }) {
  return (
    <ul className="grid list-none gap-2 sm:grid-cols-2">
      {people.map((p) => (
        <li key={p.slug}>
          <Link
            href={`/people/${p.slug}`}
            className="group flex items-baseline justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-warm-white px-3 py-2 transition-[border-color,box-shadow] hover:border-clay-border hover:shadow-[0_4px_12px_rgba(44,28,16,0.06)]"
          >
            <span className="font-[family-name:var(--font-playfair)] text-base text-ink transition-colors group-hover:text-burgundy">
              {p.name}
            </span>
            <span className="type-meta shrink-0 normal-case tracking-normal text-ink-ghost">
              {storyCount(p)} {storyCount(p) === 1 ? "story" : "stories"}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
