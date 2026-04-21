/** Config-driven noun entity (wiki person / fiction character share `WikiPerson`). */
export type NounEntityTypeConfig = {
  id:
    | "legacy_people"
    | "fiction_characters"
    | "fiction_artifacts"
    | "fiction_locations"
    | "fiction_factions";
  /** `content/wiki/<wikiSubdir>/*.md` */
  wikiSubdir: string;
  memoirSectionHeading: string;
  interviewSectionHeading: string;
  noteSectionHeading: string;
  relationsSectionHeading?: string;
};

/** Theme markdown (concept shape) — headings are stable but listed here for clarity. */
export type ThemeConceptConfig = {
  wikiSubdir: "themes";
  storiesHeading: string;
  principlesHeading: string;
  quotesHeading: string;
};

export type RuleConceptConfig = {
  id: "fiction_rules";
  wikiSubdir: "rules";
  thesisHeading: string;
  examplesHeading: string;
  exceptionsHeading: string;
  relatedRulesHeading: string;
  noteSectionHeading: string;
  relationsSectionHeading?: string;
};
