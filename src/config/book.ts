/**
 * Single source for companion branding and manuscript metadata.
 * Replace placeholders as the fiction project solidifies.
 */

export type NarratorPronoun = "they" | "she" | "he";

export type BookConfig = {
  /** Short internal id (URLs, env prefixes). */
  id: string;
  /** Display title of the novel / experience. */
  title: string;
  subtitle?: string;
  /** Author shown in UI and prompts. */
  author: string;
  tagline: string;
  /** Longer hero / SEO description. */
  description: string;
  narratorPronoun: NarratorPronoun;
  /** Phrase used in AI prompts for “whose stories” (e.g. “the novel’s”, “the chronicle’s”). */
  storiesPossessivePhrase: string;
  /** Plain name for “Ask …” surfaces (e.g. “the book”, “the atlas”). */
  shortName: string;
  voiceGuideRelativePath: string;
  decisionFrameworksRelativePath: string;
  wikiIndexRelativePath: string;
  /** Planned fiction chapter ID prefix pattern (regex fragment), e.g. CH\\d\\d — wire-up in Phase 3. */
  chapterIdPatternNote: string;
  /** Where the authoritative manuscript lives for ingest (human process, not built here). */
  manuscriptSourceOfTruth: string;
  /** When set, this `people` wiki slug is omitted from the social graph unless `includeSubjectEntity` is true. */
  peopleGraphExcludeSlug: string | null;
  /** Chapters anyone can read without an account. */
  freeChapterIds: string[];
  /** Questions a visitor can put to the archive before making an account. */
  guestQuestionLimit: number;
};

export const book: BookConfig = {
  id: "celestial",
  title: "Celestial",
  subtitle: "Interactive Book Companion",
  author: "Paul Cobb",
  tagline: "Ask the archive. Open the files. Go back into the story.",
  description:
    "The companion to the science-fiction novel Celestial: question the mission archive, open the files on its people and places, and read the logs behind the story.",
  narratorPronoun: "they",
  storiesPossessivePhrase: "the novel’s stories",
  shortName: "the book",
  voiceGuideRelativePath: "content/voice.md",
  decisionFrameworksRelativePath: "content/decision-frameworks.md",
  wikiIndexRelativePath: "content/wiki/index.md",
  chapterIdPatternNote:
    "Target scheme: CH01, CH02, … (replace legacy P1_S01-style IDs during ingest).",
  manuscriptSourceOfTruth:
    "TBD — e.g. private Git repo path `content/manuscript/`, or numbered exports from your editor of choice. Must be reproducible for rebuilds.",
  peopleGraphExcludeSlug: null,
  freeChapterIds: ["CH01"],
  guestQuestionLimit: 3,
};
