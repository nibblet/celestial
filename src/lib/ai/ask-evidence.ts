import type { PersonaPromptArgs } from "./perspectives";
import type { PersonaRoute } from "./router";

/** Bumped when the JSON shape changes in a breaking way for clients. */
export const ASK_EVIDENCE_SCHEMA_VERSION = 1;

/** Reader-facing Ask depth (Stage 3); distinct from classifier simple/deep. */
export type AskReaderMode = "deep" | "fast";

export type AskEvidenceSourceKind =
  | "wiki_summaries"
  | "story_catalog"
  | "world_rules"
  | "chapter_scenes"
  | "open_threads"
  | "journey_beats"
  | "reader_progress_gate"
  | "character_canon"
  | "character_arc_ledgers";

export type AskEvidenceSource = {
  kind: AskEvidenceSourceKind;
  label: string;
  /** Slug or id useful for debugging / future deep links */
  ref?: string;
};

/**
 * Persisted on assistant rows and sent in the Ask SSE terminal event.
 * v1 combines (a) context layers actually present in the system prompt and
 * (b) markdown links extracted from the final answer.
 */
export type AskVerifierStrictness = "off" | "warn" | "fail";

export type VerificationIssueCode =
  | "unknown_story_link"
  | "unknown_wiki_link"
  | "spoiler_story_link"
  | "missing_citations"
  | "off_chapter_entity_link";

export type VerificationIssue = {
  code: VerificationIssueCode;
  severity: "warn" | "error";
  message: string;
  href?: string;
};

export type AskVerificationResult = {
  ranAt: string;
  strictness: AskVerifierStrictness;
  issues: VerificationIssue[];
  /** True when strictness is fail and an error-level issue fired. */
  shouldBlock: boolean;
};

export type AskMessageEvidence = {
  schemaVersion: typeof ASK_EVIDENCE_SCHEMA_VERSION;
  /** Router path classification (distinct from future Fast/Deep user mode). */
  modeUsed: "simple" | "deep";
  /** ENABLE_DEEP_ASK was true for this turn (multi-persona path allowed). */
  deepAskOperational: boolean;
  route: {
    depth: "simple" | "deep";
    reason: string;
    personas: string[];
  };
  contextSources: AskEvidenceSource[];
  linksInAnswer: Array<{ href: string; text: string }>;
  verification?: AskVerificationResult;
  /** Model output was replaced by a safe fallback (strict verifier). */
  responseSuperseded?: boolean;
  /** UI / API: reader asked for multi-path-capable vs single-pass Fast. */
  askModeRequested?: AskReaderMode;
  /** What actually ran: multi-persona+synth vs Finder-only. */
  askModeApplied?: AskReaderMode;
  /** Why requested vs applied may differ (ops flag, classifier, Fast toggle). */
  askModeNote?: string;
};

/**
 * Extracts in-app markdown links `[label](href)` where href is a relative path.
 */
export function parseMarkdownInternalLinks(
  markdown: string,
): Array<{ href: string; text: string }> {
  const out: Array<{ href: string; text: string }> = [];
  const re = /\[([^\]]*)\]\(([^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(markdown)) !== null) {
    const text = m[1].trim();
    let href = m[2].trim();
    const hashIdx = href.indexOf("#");
    if (hashIdx >= 0) href = href.slice(0, hashIdx);
    if (href.startsWith("/") && !href.startsWith("//")) {
      out.push({ href, text: text.length > 0 ? text : href });
    }
  }
  const seen = new Set<string>();
  return out.filter((l) => {
    const key = `${l.href}|${l.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildAskMessageEvidence(
  args: PersonaPromptArgs,
  route: PersonaRoute,
  fullText: string,
  opts: {
    deepAskOperational: boolean;
    askModeRequested?: AskReaderMode;
    askModeApplied?: AskReaderMode;
    askModeNote?: string;
  },
): AskMessageEvidence {
  const sources: AskEvidenceSource[] = [];

  if (args.wikiSummaries && args.wikiSummaries.length > 0) {
    sources.push({
      kind: "wiki_summaries",
      label: "Wiki index & summaries",
    });
  }
  if (args.storyCatalog && args.storyCatalog.length > 0) {
    sources.push({
      kind: "story_catalog",
      label: "Story catalog (progress-scoped when reader progress exists)",
    });
  }
  if (args.storySlug) {
    sources.push({
      kind: "chapter_scenes",
      label: "Chapter scenes & story context",
      ref: args.storySlug,
    });
  }
  if (args.openThreads && args.openThreads.length > 0) {
    sources.push({
      kind: "open_threads",
      label: `Open narrative threads (${args.openThreads.length})`,
    });
  }
  if (args.beats && args.beats.length > 0) {
    sources.push({
      kind: "journey_beats",
      label: `Journey beats (${args.beats.length})`,
      ref: args.journeySlug,
    });
  }
  if (args.readerProgress) {
    sources.push({
      kind: "reader_progress_gate",
      label: "Reader progress (spoiler-aware scope)",
    });
  }
  if (args.rulesContextIncluded) {
    sources.push({
      kind: "world_rules",
      label: "World rules (content/wiki/rules)",
    });
  }
  if (args.characterCanonContextIncluded) {
    sources.push({
      kind: "character_canon",
      label: "Character canon (content/wiki/characters)",
    });
  }
  if (args.characterArcContextIncluded) {
    sources.push({
      kind: "character_arc_ledgers",
      label: "Character arc ledgers (derived_inference)",
      ref: "content/wiki/arcs/characters",
    });
  }

  return {
    schemaVersion: ASK_EVIDENCE_SCHEMA_VERSION,
    modeUsed: route.depth,
    deepAskOperational: opts.deepAskOperational,
    route: {
      depth: route.depth,
      reason: route.reason,
      personas: [...route.personas],
    },
    contextSources: sources,
    linksInAnswer: parseMarkdownInternalLinks(fullText),
    askModeRequested: opts.askModeRequested,
    askModeApplied: opts.askModeApplied,
    askModeNote: opts.askModeNote,
  };
}
