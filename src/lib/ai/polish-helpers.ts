/**
 * Pure helpers for the Beyond "AI polish" feature. Kept separate from the
 * route handler so they're testable without the Anthropic SDK.
 */

export interface PolishRequestBody {
  title: string;
  body: string;
  life_stage?: string | null;
  year_start?: number | null;
  year_end?: number | null;
  themes?: string[] | null;
  principles?: string[] | null;
  quotes?: string[] | null;
}

export interface PolishSuggestion {
  title?: string;
  body?: string;
  life_stage?: string | null;
  year_start?: number | null;
  year_end?: number | null;
  themes?: string[];
  principles?: string[];
  quotes?: string[];
  rationale?: string;
}

export function buildUserPrompt(input: PolishRequestBody): string {
  return [
    "Current draft:",
    "",
    `TITLE: ${input.title || "(empty)"}`,
    `LIFE_STAGE: ${input.life_stage || "(empty)"}`,
    `YEAR_START: ${input.year_start ?? "(empty)"}`,
    `YEAR_END: ${input.year_end ?? "(empty)"}`,
    `THEMES: ${(input.themes ?? []).join(", ") || "(empty)"}`,
    `PRINCIPLES: ${(input.principles ?? []).join(", ") || "(empty)"}`,
    `QUOTES: ${(input.quotes ?? []).join(" | ") || "(empty)"}`,
    "",
    "BODY (may contain HTML from a rich text editor — preserve tags when returning body):",
    input.body || "(empty)",
  ].join("\n");
}

/**
 * Extract a JSON object from a raw model response. Tolerates:
 *  - surrounding markdown code fences
 *  - leading/trailing prose
 *  - stray whitespace
 * Returns null when no parseable object is found.
 */
export function extractJSON(text: string): PolishSuggestion | null {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
  try {
    return JSON.parse(cleaned) as PolishSuggestion;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as PolishSuggestion;
    } catch {
      return null;
    }
  }
}
