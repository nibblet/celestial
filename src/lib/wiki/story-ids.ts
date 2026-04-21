/**
 * Canonical story/chapter reference pattern for wiki markdown.
 * Matches legacy memoir/interview IDs and fiction chapter IDs (CH01…).
 */
export const WIKI_STORY_ID_PATTERN = "(?:P\\d+|IV)_S\\d+|CH\\d{2,4}";

/** Use in RegExp constructors — source fragment only. */
export const WIKI_STORY_ID_SOURCE = WIKI_STORY_ID_PATTERN;

export function chapterNumberFromStoryId(storyId: string): number | null {
  const match = storyId.match(/^CH(\d{2,4})$/i);
  return match ? parseInt(match[1]!, 10) : null;
}

export function chapterSortKey(storyId: string): string {
  const chapterNum = chapterNumberFromStoryId(storyId);
  if (chapterNum !== null) return `1_${String(chapterNum).padStart(4, "0")}`;

  const memoir = storyId.match(/^P(\d+)_S(\d+)$/i);
  if (memoir) {
    return `2_${String(parseInt(memoir[1]!, 10)).padStart(3, "0")}_${String(parseInt(memoir[2]!, 10)).padStart(4, "0")}`;
  }

  const interview = storyId.match(/^IV_S(\d+)$/i);
  if (interview) {
    return `3_${String(parseInt(interview[1]!, 10)).padStart(4, "0")}`;
  }

  return `9_${storyId}`;
}
