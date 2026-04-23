import fs from "node:fs";
import path from "node:path";
import { getCanonicalStoryById } from "@/lib/wiki/corpus";
import type { ReaderProgress } from "@/lib/progress/reader-progress";
import { isStoryUnlocked } from "@/lib/progress/reader-progress";
import {
  getChapterTagSlugSet,
  getChapterTags,
} from "@/lib/wiki/chapter-tags";
import type {
  AskVerificationResult,
  AskVerifierStrictness,
  VerificationIssue,
} from "./ask-evidence";

const WIKI_ROOT = path.join(process.cwd(), "content/wiki");

/** Maps first URL segment (after leading slash) to wiki subdirectory. */
/** Paths under `content/wiki/{dir}/{slug}.md`. Omit legacy or non-wiki routes. */
const WIKI_SEGMENT_TO_DIR: Record<string, string> = {
  characters: "characters",
  locations: "locations",
  factions: "factions",
  artifacts: "artifacts",
  vaults: "vaults",
  rules: "rules",
  themes: "themes",
};

export function getAskVerifierStrictnessFromEnv(): AskVerifierStrictness {
  const raw = process.env.ASK_VERIFIER_STRICTNESS?.trim().toLowerCase();
  if (raw === "off" || raw === "warn" || raw === "fail") return raw;
  return "warn";
}

export const ASK_VERIFICATION_FALLBACK_MESSAGE =
  "I couldn’t fully verify citations in that reply against the archive. Try asking again with a narrower question, or browse stories and lore from the catalog links in Sources.";

function wikiMarkdownExists(dir: string, slug: string): boolean {
  const fp = path.join(WIKI_ROOT, dir, `${slug}.md`);
  return fs.existsSync(fp);
}

function looksLikeFactualLookup(question: string): boolean {
  const t = question.trim().toLowerCase();
  if (t.length < 3) return false;
  if (
    /^(who|what|when|where|which|how many|how much|list|name every|name all)\b/i.test(
      t,
    )
  ) {
    return true;
  }
  return /\?$/.test(t) && t.length < 200;
}

async function resolveStorySegment(segment: string) {
  const decoded = decodeURIComponent(segment);
  let story = await getCanonicalStoryById(decoded);
  if (story) return story;
  const chapterPrefix = decoded.match(/^(CH\d{2,4})/i)?.[1];
  if (chapterPrefix) {
    story = await getCanonicalStoryById(chapterPrefix);
    if (story) return story;
  }
  return null;
}

/**
 * Stage 2 verifier: validates in-answer links against the corpus, applies
 * spoiler gates for chapter links, and emits light heuristics (missing links).
 *
 * Controlled by `ASK_VERIFIER_STRICTNESS`: off | warn (default) | fail.
 */
export async function verifyAskAnswer(input: {
  userQuestion: string;
  assistantText: string;
  linksInAnswer: Array<{ href: string; text: string }>;
  readerProgress?: ReaderProgress | null;
  /**
   * When the Ask turn is scoped to a chapter (the reader is viewing that
   * story), the verifier cross-checks wiki links in the answer against the
   * chapter's curated tag list. Entities not tagged for this chapter emit
   * `off_chapter_entity_link` at warn severity — they may be legitimate
   * cross-references, but deserve a reviewer flag.
   */
  storySlug?: string | null;
}): Promise<AskVerificationResult> {
  const strictness = getAskVerifierStrictnessFromEnv();
  const ranAt = new Date().toISOString();

  if (strictness === "off") {
    return {
      ranAt,
      strictness,
      issues: [],
      shouldBlock: false,
    };
  }

  const issues: VerificationIssue[] = [];
  const progress = input.readerProgress ?? null;

  // Load chapter tags once per turn. `chapterTagRecord` is null when the
  // reader is not on a chapter page or when no tags exist for the chapter;
  // in either case, the off-chapter check becomes a no-op.
  const chapterTagRecord = input.storySlug
    ? getChapterTags(input.storySlug)
    : null;
  const allowedChapterEntities: Set<string> | null = chapterTagRecord
    ? getChapterTagSlugSet(chapterTagRecord.chapterId)
    : null;

  for (const link of input.linksInAnswer) {
    let pathname = link.href;
    try {
      pathname = decodeURIComponent(pathname);
    } catch {
      /* keep raw */
    }
    if (!pathname.startsWith("/")) continue;

    const segments = pathname.split("/").filter(Boolean);
    const top = segments[0];

    if (
      top === "api" ||
      top === "_next" ||
      top === "admin" ||
      top === "login" ||
      top === "signup"
    ) {
      continue;
    }

    if (top === "stories" && segments[1]) {
      const story = await resolveStorySegment(segments[1]);
      if (!story) {
        issues.push({
          code: "unknown_story_link",
          severity: "error",
          message: `Story path not found in corpus: ${link.href}`,
          href: link.href,
        });
      } else if (progress && !isStoryUnlocked(story.storyId, progress)) {
        issues.push({
          code: "spoiler_story_link",
          severity: "error",
          message: `Linked story may be ahead of this reader’s progress: ${story.storyId}`,
          href: link.href,
        });
      }
      continue;
    }

    const wikiDir = top ? WIKI_SEGMENT_TO_DIR[top] : undefined;
    if (wikiDir && segments[1]) {
      const slug = segments[1];
      if (segments.length > 2) {
        continue;
      }
      if (!wikiMarkdownExists(wikiDir, slug)) {
        issues.push({
          code: "unknown_wiki_link",
          severity: "error",
          message: `Wiki page not found for ${link.href}`,
          href: link.href,
        });
        continue;
      }

      // Off-chapter entity warning: the link points at a valid wiki page, but
      // this chapter's curated tag list didn't include it. The chapter tagger
      // is high-precision, so an off-list citation is usually either a
      // legitimate cross-chapter reference or a hallucinated relevance claim.
      // We warn (never error) so authors can eyeball Ask's answers.
      if (allowedChapterEntities && chapterTagRecord) {
        const key = `${wikiDir}:${slug}`;
        if (!allowedChapterEntities.has(key)) {
          issues.push({
            code: "off_chapter_entity_link",
            severity: "warn",
            message: `Answer cites ${link.href} but ${chapterTagRecord.chapterId} wasn't tagged with that entity.`,
            href: link.href,
          });
        }
      }
    }
  }

  if (
    looksLikeFactualLookup(input.userQuestion) &&
    input.linksInAnswer.length === 0 &&
    input.assistantText.trim().length > 120
  ) {
    issues.push({
      code: "missing_citations",
      severity: "warn",
      message:
        "Answer has no archive links; factual questions should cite stories or lore pages where possible.",
    });
  }

  const hasError = issues.some((i) => i.severity === "error");
  const shouldBlock = strictness === "fail" && hasError;

  return {
    ranAt,
    strictness,
    issues,
    shouldBlock,
  };
}
