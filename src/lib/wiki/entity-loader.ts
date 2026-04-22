/**
 * Config-driven loaders for wiki "noun" entities (people, characters) and theme concepts.
 */

import type {
  WikiEntityRelation,
  WikiFictionNounEntity,
  WikiPerson,
  PersonTier,
  AiDraftStatus,
  WikiRuleConcept,
  WikiTheme,
} from "./parser";
import { extractSection, extractSectionBlock } from "./markdown-sections";
import { chapterSortKey, WIKI_STORY_ID_PATTERN } from "./story-ids";
import type {
  NounEntityTypeConfig,
  RuleConceptConfig,
  ThemeConceptConfig,
} from "./entity-types";
import { WIKI_THEME_CONCEPT } from "@/config/wiki-entities";
import type { WikiEntityKind, WikiEntityLoreMetadata } from "./lore-provenance";
import { parseWikiEntityLoreSection } from "./lore-provenance";
import type { CharacterDossier } from "./entity-dossier";
import { parseCharacterDossierSection } from "./entity-dossier";
import { parseCanonDossier } from "./canon-dossier";

function extractStoryRefsFromBlock(block: string): string[] {
  const re = new RegExp(`\\((${WIKI_STORY_ID_PATTERN})\\)`, "g");
  return [...block.matchAll(re)].map((m) => m[1]!);
}

function parseEntityRelations(block: string): WikiEntityRelation[] {
  const rows = block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const out: WikiEntityRelation[] = [];
  for (const row of rows) {
    const match = row.match(
      /-?\s*\[\[([a-z]+):([a-z0-9-]+)\]\]\s+([a-z0-9-]+)\s+\[\[([a-z]+):([a-z0-9-]+)\]\]/i
    );
    if (!match) continue;
    out.push({
      sourceType: match[1]!.toLowerCase(),
      sourceSlug: match[2]!,
      predicate: match[3]!,
      targetType: match[4]!.toLowerCase(),
      targetSlug: match[5]!,
    });
  }
  return out;
}

function nounConfigToWikiKind(config: NounEntityTypeConfig): WikiEntityKind {
  switch (config.id) {
    case "fiction_characters":
    case "legacy_people":
      return "character";
    case "fiction_artifacts":
      return "artifact";
    case "fiction_locations":
      return "location";
    case "fiction_factions":
      return "faction";
    case "fiction_vaults":
      return "vault";
    default:
      return "character";
  }
}

/** Union chapter/memoir ids from Appearances + lore `Chapter refs:` (deduped, sorted). */
function mergeWikiStoryIdLists(...groups: string[][]): string[] {
  const set = new Set<string>();
  for (const g of groups) {
    for (const id of g) {
      const t = id?.trim();
      if (t) set.add(t);
    }
  }
  return [...set].sort((a, b) =>
    chapterSortKey(a).localeCompare(chapterSortKey(b)),
  );
}

function extractAiDraft(content: string): {
  aiDraft: string;
  aiDraftGeneratedAt: string;
  aiDraftStatus: AiDraftStatus;
} {
  const aiDraftMatch = content.match(
    /<!-- ai-draft:start(?:\s+generated="([^"]*)")?(?:\s+reviewed="(true|false)")? -->\n([\s\S]*?)\n<!-- ai-draft:end -->/
  );
  const aiDraft = aiDraftMatch?.[3]?.trim() || "";
  const aiDraftGeneratedAt = aiDraftMatch?.[1] || "";
  const aiDraftStatus: AiDraftStatus = aiDraftMatch
    ? aiDraftMatch[2] === "true"
      ? "reviewed"
      : "draft"
    : "none";
  return { aiDraft, aiDraftGeneratedAt, aiDraftStatus };
}

export function parseWikiFictionNounMarkdown(
  content: string,
  config: NounEntityTypeConfig & {
    id:
      | "fiction_characters"
      | "fiction_artifacts"
      | "fiction_locations"
      | "fiction_factions"
      | "fiction_vaults";
  },
  filename: string
): WikiFictionNounEntity | null {
  const common = parseNounCommon(content, config, filename);
  if (!common) return null;
  return {
    kind: "fiction_noun",
    entityType: config.id,
    ...common,
  };
}

function parseNounCommon(
  content: string,
  config: NounEntityTypeConfig,
  filename: string
): Omit<WikiFictionNounEntity, "kind" | "entityType"> | null {
  if (!content) return null;
  const nameMatch = content.match(/^# (.+)/m);
  const slugMatch = content.match(/\*\*Slug:\*\*\s*(.+)/);
  const tiersMatch = content.match(
    /Inventory entry\s*\(tiers:\s*([A-D,\s]+)\)/,
  );
  const slug = slugMatch?.[1]?.trim() || filename.replace(/\.md$/, "");
  const tiers = (tiersMatch?.[1] || "")
    .split(",")
    .map((t) => t.trim())
    .filter((t): t is PersonTier => /^[A-D]$/.test(t));
  const appearancesBlock = extractSectionBlock(content, config.memoirSectionHeading);
  const additionalBlock = extractSectionBlock(content, config.interviewSectionHeading);
  const noteBlock = extractSectionBlock(content, config.noteSectionHeading);
  const relationBlock = config.relationsSectionHeading
    ? extractSectionBlock(content, config.relationsSectionHeading)
    : "";
  const { aiDraft, aiDraftGeneratedAt, aiDraftStatus } = extractAiDraft(content);

  const kind = nounConfigToWikiKind(config);
  const lore: WikiEntityLoreMetadata | undefined = parseWikiEntityLoreSection(
    content,
    { wikiEntityKind: kind }
  );
  const dossier: CharacterDossier | undefined =
    kind === "character"
      ? parseCharacterDossierSection(content).dossier
      : undefined;
  const canonDossier = parseCanonDossier(content) ?? undefined;

  const memoirFromSections = extractStoryRefsFromBlock(appearancesBlock);
  const interviewFromSections = extractStoryRefsFromBlock(additionalBlock);
  const memoirStoryIds = mergeWikiStoryIdLists(
    memoirFromSections,
    lore?.chapterRefs ?? [],
  );
  const interviewStoryIds = mergeWikiStoryIdLists(interviewFromSections);

  return {
    slug,
    name: nameMatch?.[1]?.trim() || slug,
    tiers,
    memoirStoryIds,
    interviewStoryIds,
    note: noteBlock.trim(),
    body: content,
    aiDraft,
    aiDraftStatus,
    aiDraftGeneratedAt,
    relations: parseEntityRelations(relationBlock),
    lore,
    dossier,
    canonDossier,
  };
}

export function parseWikiNounMarkdown(
  content: string,
  config: NounEntityTypeConfig,
  filename: string
): WikiPerson | null {
  const base = parseNounCommon(content, config, filename);
  if (!base) return null;

  return {
    slug: base.slug,
    name: base.name,
    tiers: base.tiers,
    memoirStoryIds: base.memoirStoryIds,
    interviewStoryIds: base.interviewStoryIds,
    note: base.note,
    body: base.body,
    aiDraft: base.aiDraft,
    aiDraftStatus: base.aiDraftStatus,
    aiDraftGeneratedAt: base.aiDraftGeneratedAt,
    wikiSource:
      config.id === "fiction_characters" ? "characters" : "people",
    lore: base.lore,
    dossier: base.dossier,
    canonDossier: base.canonDossier,
  };
}

export function parseWikiRuleConceptMarkdown(
  content: string,
  config: RuleConceptConfig,
  filename: string
): WikiRuleConcept | null {
  if (!content) return null;
  const slugMatch = content.match(/\*\*Slug:\*\*\s*(.+)/);
  const titleMatch = content.match(/^# (.+)/m);
  const slug = slugMatch?.[1]?.trim() || filename.replace(/\.md$/, "");
  const thesisBlock = extractSectionBlock(content, config.thesisHeading);
  const examples = extractSection(content, config.examplesHeading);
  const exceptions = extractSection(content, config.exceptionsHeading);
  const relatedRules = extractSection(content, config.relatedRulesHeading).map((line) =>
    line.replace(/^-+\s*/, "").trim()
  );
  const note = extractSectionBlock(content, config.noteSectionHeading);
  const relationBlock = config.relationsSectionHeading
    ? extractSectionBlock(content, config.relationsSectionHeading)
    : "";

  const lore = parseWikiEntityLoreSection(content, { wikiEntityKind: "rule" });
  const canonDossier = parseCanonDossier(content) ?? undefined;

  return {
    kind: "rule_concept",
    slug,
    title: titleMatch?.[1]?.trim() || slug,
    thesis: thesisBlock.trim(),
    examples,
    exceptions,
    relatedRules,
    note: note.trim(),
    body: content,
    relations: parseEntityRelations(relationBlock),
    lore,
    canonDossier,
  };
}

/** Parse `content/wiki/themes/*.md` into `WikiTheme`. */
export function parseWikiThemeMarkdown(
  content: string,
  filename: string,
  concept: ThemeConceptConfig = WIKI_THEME_CONCEPT
): WikiTheme | null {
  if (!content) return null;

  const titleMatch = content.match(/^# (.+)/m);
  const countMatch = content.match(/\*\*(\d+) stories\*\*/);

  const slug = filename.replace(/\.md$/, "");
  const name = titleMatch?.[1] || slug;

  const idCapture = WIKI_STORY_ID_PATTERN;

  const storiesRaw = extractSection(content, concept.storiesHeading);
  const stories = storiesRaw
    .map((line) => {
      const idMatch = line.match(
        new RegExp(
          `\\[\\[(${idCapture})\\]\\]\\s*(.+?)(?:\\s*—\\s*(.+))?$`
        )
      );
      return {
        storyId: idMatch?.[1] || "",
        title: idMatch?.[2] || "",
        summary: idMatch?.[3] || "",
      };
    })
    .filter((s) => s.storyId);

  const principlesRaw = extractSection(content, concept.principlesHeading);
  const principles = principlesRaw.map((line) => {
    const match = line.match(
      new RegExp(`(.+?)\\s*_\\((${idCapture})\\)_`)
    );
    return { text: match?.[1]?.trim() || line, storyId: match?.[2] || "" };
  });

  const quotesRaw = extractSection(content, concept.quotesHeading);
  const quotes = quotesRaw.map((line) => {
    const match = line.match(/"(.+?)"\s*—\s*_(.+?)_/);
    return { text: match?.[1] || line, title: match?.[2] || "" };
  });

  return {
    slug,
    name,
    storyCount: parseInt(countMatch?.[1] || "0") || stories.length,
    principles,
    storyIds: stories.map((s) => s.storyId),
    stories,
    quotes,
  };
}
