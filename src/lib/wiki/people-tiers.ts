import type { PersonTier, WikiPerson } from "@/lib/wiki/parser";

/** Order for sections on `/characters` and for picking one bucket when someone has several tiers. */
export const PEOPLE_INDEX_SECTION_ORDER: PersonTier[] = ["A", "C", "B", "D"];

/** Short label — tooltips, chips, compact UI (matches inventory meanings). */
export const TIER_SHORT_LABEL: Record<PersonTier, string> = {
  A: "Dedicated story",
  B: "Recurring in memoir",
  C: "Curated",
  D: "Across memoir & interviews",
};

/** Section headings and plain-language blurbs for the people index. */
export const PEOPLE_INDEX_SECTIONS: Record<
  PersonTier,
  { heading: string; blurb: string }
> = {
  A: {
    heading: "Stories centered on them",
    blurb:
      "A memoir chapter is mainly about this person—not only a passing mention.",
  },
  C: {
    heading: "Named on purpose",
    blurb:
      "Added deliberately to this index so they are easy to find alongside names spotted automatically from the text.",
  },
  B: {
    heading: "Keep coming up in the memoir",
    blurb:
      "Their name turns up again and again across different stories.",
  },
  D: {
    heading: "In the memoir and the interviews",
    blurb:
      "Shows up meaningfully in both the written memoir material and the spoken interviews.",
  },
};

export const PEOPLE_INDEX_FALLBACK = {
  heading: "Also listed here",
  blurb:
    "Everyone in this index has a page; if someone is not tagged into one of the groups above, they still appear below.",
} as const;

/** First matching tier from `PEOPLE_INDEX_SECTION_ORDER`, else any tier on file, else null. */
export function primaryTierForPeopleIndex(person: WikiPerson): PersonTier | null {
  for (const t of PEOPLE_INDEX_SECTION_ORDER) {
    if (person.tiers.includes(t)) return t;
  }
  if (person.tiers.length > 0) {
    return [...person.tiers].sort()[0]!;
  }
  return null;
}
