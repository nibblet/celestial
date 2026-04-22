import type { PersonTier, WikiPerson } from "@/lib/wiki/parser";

/** Order for sections on `/characters` and for picking one bucket when someone has several tiers. */
export const PEOPLE_INDEX_SECTION_ORDER: PersonTier[] = ["A", "C", "B", "D"];

/** Short label — tooltips, chips, compact UI (matches inventory meanings). */
export const TIER_SHORT_LABEL: Record<PersonTier, string> = {
  A: "Lead / POV",
  B: "Recurring",
  C: "Named",
  D: "Historical / offscreen",
};

/** Section headings and plain-language blurbs for the people index. */
export const PEOPLE_INDEX_SECTIONS: Record<
  PersonTier,
  { heading: string; blurb: string }
> = {
  A: {
    heading: "Leads and point-of-view characters",
    blurb:
      "Characters who carry a viewpoint or drive the central decisions of the book.",
  },
  B: {
    heading: "Recurring crew and principals",
    blurb:
      "Named characters who appear across multiple chapters and shape key scenes.",
  },
  C: {
    heading: "Named supporting cast",
    blurb:
      "Characters who appear on the page but sit outside the core ensemble.",
  },
  D: {
    heading: "Historical, offscreen, and background",
    blurb:
      "Ancestors, Earth-side figures, and roles that exist in the canon without onscreen presence.",
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
