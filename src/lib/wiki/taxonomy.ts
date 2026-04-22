/**
 * Celestial metadata contract (Phase 0) + legacy compatibility (Phase 1).
 * Legacy story source labels stay in wiki files until full ingest;
 * UI and prompts prefer `sourceType` + `contentType`.
 */

/** Mirrors `StorySource` in parser/static-data — duplicated here to avoid circular imports. */
export type LegacyStorySource = "memoir" | "interview" | "family";

export type ContentTypeV1 =
  | "chapter"
  | "mission_log"
  | "timeline_event"
  | "foundational_lore"
  | "ai_continuation"
  | "user_created";

export type SourceTypeV1 =
  | "book_i_chapter"
  | "book_i_mission_log"
  | "foundational_dossier"
  | "series_bible"
  | "world_snapshot"
  | "technical_brief"
  | "parable_catalog"
  | "style_guide"
  | "canon_inventory"
  | "ai_generated"
  | "user_submitted"
  | "legacy_import";

export type CanonStatusV1 = "canon" | "adjacent" | "experimental";

export type VisibilityPolicyV1 =
  | "progressive"
  | "always_visible"
  | "profile_override_only"
  | "admin_only";

/** Maps chapter number → primary thematic tag (replaces placeholder “Fiction Narrative”). */
const CHAPTER_THEME_BY_NUM: Record<number, string> = {
  1: "Resonance",
  2: "Silence & Signal",
  3: "Memory",
  4: "Activation",
  5: "Intent",
  6: "Alignment",
  7: "Harmonics",
  8: "Witness",
  9: "Legacy",
  10: "Convergence",
  11: "Threshold",
  12: "Covenant",
  13: "Containment",
  14: "Oracle",
  15: "Sacrifice",
  16: "Earth Echo",
  17: "Ascent",
};

export function chapterNumberFromChId(storyId: string): number | null {
  const m = storyId.trim().match(/^CH(\d{2,4})$/i);
  if (!m) return null;
  return parseInt(m[1], 10);
}

export function normalizeChapterThemes(
  storyId: string,
  themes: string[]
): string[] {
  const ch = chapterNumberFromChId(storyId);
  const lead =
    ch !== null ? CHAPTER_THEME_BY_NUM[ch] ?? "Resonance" : "Resonance";
  const withoutPlaceholder = themes.filter(
    (t) => t.trim().toLowerCase() !== "fiction narrative"
  );
  if (withoutPlaceholder.length === 0) return [lead];
  const merged = [lead, ...withoutPlaceholder.filter((t) => t !== lead)];
  return Array.from(new Set(merged));
}

export function enrichLegacyStorySource(
  storyId: string,
  source: LegacyStorySource
): {
  contentType: ContentTypeV1;
  sourceType: SourceTypeV1;
  canonStatus: CanonStatusV1;
  visibilityPolicy: VisibilityPolicyV1;
} {
  if (/^CH\d/i.test(storyId)) {
    return {
      contentType: "chapter",
      sourceType: "book_i_chapter",
      canonStatus: "canon",
      visibilityPolicy: "progressive",
    };
  }
  if (source === "memoir" || source === "interview") {
    return {
      contentType: "chapter",
      sourceType: "legacy_import",
      canonStatus: "adjacent",
      visibilityPolicy: "progressive",
    };
  }
  return {
    contentType: "chapter",
    sourceType: "legacy_import",
    canonStatus: "adjacent",
    visibilityPolicy: "progressive",
  };
}

export type TimelineSourceLegacy = "memoir" | "public_record" | "interview";

export function timelineLegacyToSourceType(
  source: TimelineSourceLegacy
): SourceTypeV1 {
  switch (source) {
    case "memoir":
      return "book_i_chapter";
    case "public_record":
      return "world_snapshot";
    case "interview":
      return "legacy_import";
    default:
      return "book_i_chapter";
  }
}
