export type AskIntentKind =
  | "factual"
  | "thematic"
  | "character_arc"
  | "world_rule"
  | "future_speculation"
  | "unknown_gap";

export type AskIntent = {
  kind: AskIntentKind;
  confidence: number;
  reason: string;
};

const FACTUAL_PATTERNS = [
  /\bwhen\b/i,
  /\bwhere\b/i,
  /\bwho\b/i,
  /\bwhich\b/i,
  /\bhow many\b/i,
  /\blist\b/i,
];

const CHARACTER_ARC_PATTERNS = [
  /\bhow\s+(is|does|did)\s+[\w\s'-]+\s+(change|changing|changed)\b/i,
  /\b(character arc|motivation|why did .* behave|why does .* behave)\b/i,
  /\bbecoming\b/i,
];

const FUTURE_PATTERNS = [
  /\bwhat might happen\b/i,
  /\bwhat happens next\b/i,
  /\bwhat could happen\b/i,
  /\bfuture\b/i,
  /\bnext\b/i,
];

const WORLD_RULE_PATTERNS = [
  /\bhow does .* work\b/i,
  /\brule\b/i,
  /\bmechanic\b/i,
  /\bresonance\b/i,
  /\bvault\b/i,
  /\bcoherence\b/i,
  /\bdirective\b/i,
];

const THEMATIC_PATTERNS = [
  /\bwhat does .* mean\b/i,
  /\btheme\b/i,
  /\bwhy does .* matter\b/i,
  /\bpattern\b/i,
  /\bsymbol/i,
];

function hasAny(patterns: RegExp[], value: string): boolean {
  return patterns.some((pattern) => pattern.test(value));
}

export function classifyAskIntent(message: string): AskIntent {
  const text = message.trim();
  const lower = text.toLowerCase();

  if (!text) {
    return {
      kind: "unknown_gap",
      confidence: 0.2,
      reason: "empty question",
    };
  }

  if (hasAny(FUTURE_PATTERNS, lower)) {
    return {
      kind: "future_speculation",
      confidence: 0.78,
      reason: "asks about future or next possibilities",
    };
  }

  if (hasAny(CHARACTER_ARC_PATTERNS, lower)) {
    return {
      kind: "character_arc",
      confidence: 0.82,
      reason: "asks how a character changes or why they behave a certain way",
    };
  }

  if (hasAny(WORLD_RULE_PATTERNS, lower)) {
    return {
      kind: "world_rule",
      confidence: 0.72,
      reason: "asks how a world rule or setting mechanic works",
    };
  }

  if (hasAny(THEMATIC_PATTERNS, lower)) {
    return {
      kind: "thematic",
      confidence: 0.72,
      reason: "asks for meaning, theme, or cross-corpus pattern",
    };
  }

  if (text.length < 80 && hasAny(FACTUAL_PATTERNS, lower)) {
    return {
      kind: "factual",
      confidence: 0.75,
      reason: "short factual lookup question",
    };
  }

  return {
    kind: "thematic",
    confidence: 0.55,
    reason: "defaulting to reflective corpus answer",
  };
}
