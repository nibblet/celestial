/**
 * Classifies a user question as "simple" or "deep" to determine
 * whether it benefits from multi-perspective treatment.
 *
 * INVERTED LOGIC: defaults to "deep" (multi-perspective).
 * Only clearly factual/list/lookup questions route to "simple".
 *
 * Simple: factual dates, lists, short lookups -> single Sonnet call
 * Deep: everything else -> two perspectives + synthesizer
 */

/** Patterns that indicate a simple factual or catalog question */
const SIMPLE_PATTERNS = [
  // Factual date/time lookups
  /\bwhen\s+did\b/i,
  /\bwhat\s+year\b/i,
  /\bhow\s+old\b/i,
  /\bwhat\s+date\b/i,
  /\bwhat\s+age\b/i,

  // List / catalog queries
  /\blist\s+(the|all|every)\b/i,
  /\bwhich\s+stories\b/i,
  /\bwhat\s+stories\b/i,
  /\bhow\s+many\s+stories\b/i,
  /\bhow\s+many\s+themes\b/i,

  // Short factual "who/what is" (only simple when question is brief)
  // Handled separately below via length check
];

/** Short factual starters — only treated as simple when the question is < 40 chars */
const SHORT_FACTUAL_PATTERNS = [
  /^who\s+(is|was)\b/i,
  /^what\s+(is|was)\s+(the|a|an)\b/i,
  /^where\s+(did|was|is)\b/i,
];

export type QuestionDepth = "simple" | "deep";

export function classifyQuestion(
  message: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _history?: { role: string; content: string }[]
): QuestionDepth {
  const trimmed = message.trim();

  // Very short questions are almost always simple lookups
  if (trimmed.length < 20) {
    return "simple";
  }

  // Check explicit simple patterns
  for (const pattern of SIMPLE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return "simple";
    }
  }

  // Short factual starters only count as simple for brief questions
  if (trimmed.length < 40) {
    for (const pattern of SHORT_FACTUAL_PATTERNS) {
      if (pattern.test(trimmed)) {
        return "simple";
      }
    }
  }

  // Default: use the deep multi-perspective path
  return "deep";
}
