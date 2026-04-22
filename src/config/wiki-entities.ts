import type {
  NounEntityTypeConfig,
  RuleConceptConfig,
  ThemeConceptConfig,
} from "@/lib/wiki/entity-types";

export const LEGACY_PEOPLE_NOUN: NounEntityTypeConfig = {
  id: "legacy_people",
  wikiSubdir: "people",
  memoirSectionHeading: "Memoir stories",
  interviewSectionHeading: "Interview stories",
  noteSectionHeading: "Note",
};

export const FICTION_CHARACTERS_NOUN: NounEntityTypeConfig = {
  id: "fiction_characters",
  wikiSubdir: "characters",
  memoirSectionHeading: "Appearances",
  interviewSectionHeading: "Additional appearances",
  noteSectionHeading: "Note",
  relationsSectionHeading: "Related",
};

export const FICTION_ARTIFACTS_NOUN: NounEntityTypeConfig = {
  id: "fiction_artifacts",
  wikiSubdir: "artifacts",
  memoirSectionHeading: "Appearances",
  interviewSectionHeading: "Additional appearances",
  noteSectionHeading: "Note",
  relationsSectionHeading: "Related",
};

export const FICTION_LOCATIONS_NOUN: NounEntityTypeConfig = {
  id: "fiction_locations",
  wikiSubdir: "locations",
  memoirSectionHeading: "Appearances",
  interviewSectionHeading: "Additional appearances",
  noteSectionHeading: "Note",
  relationsSectionHeading: "Related",
};

export const FICTION_FACTIONS_NOUN: NounEntityTypeConfig = {
  id: "fiction_factions",
  wikiSubdir: "factions",
  memoirSectionHeading: "Appearances",
  interviewSectionHeading: "Additional appearances",
  noteSectionHeading: "Note",
  relationsSectionHeading: "Related",
};

/** First-class vault pages under `content/wiki/vaults/` (decision 1A). */
export const FICTION_VAULTS_NOUN: NounEntityTypeConfig = {
  id: "fiction_vaults",
  wikiSubdir: "vaults",
  memoirSectionHeading: "Appearances",
  interviewSectionHeading: "Additional appearances",
  noteSectionHeading: "Note",
  relationsSectionHeading: "Related",
};

export const WIKI_THEME_CONCEPT: ThemeConceptConfig = {
  wikiSubdir: "themes",
  storiesHeading: "Stories",
  principlesHeading: "Principles",
  quotesHeading: "Selected Quotes",
};

export const FICTION_RULES_CONCEPT: RuleConceptConfig = {
  id: "fiction_rules",
  wikiSubdir: "rules",
  thesisHeading: "Thesis",
  examplesHeading: "Examples",
  exceptionsHeading: "Exceptions",
  relatedRulesHeading: "Related Rules",
  noteSectionHeading: "Note",
  relationsSectionHeading: "Related",
};
