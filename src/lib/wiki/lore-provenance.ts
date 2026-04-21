/**
 * Phase 5 — Foundational lore metadata embedded in wiki entity pages.
 * Aligns with docs/celestial/phase-0-metadata-contract-and-migration-matrix.md.
 */

import type {
  CanonStatusV1,
  SourceTypeV1,
  VisibilityPolicyV1,
} from "@/lib/wiki/taxonomy";
import { extractSectionBlock } from "@/lib/wiki/markdown-sections";

export const WIKI_LORE_METADATA_HEADING = "Lore metadata";

/** Discriminates entity routes / Explore types (distinct from chapter contentType). */
export type WikiEntityKind =
  | "character"
  | "faction"
  | "location"
  | "artifact"
  | "rule";

export interface WikiEntityLoreProvenance {
  sourceDocument: string;
  sourcePath?: string;
  extractedAt?: string;
  extractorVersion?: string;
}

export interface WikiEntityLoreMetadata {
  wikiEntityKind: WikiEntityKind;
  sourceType: SourceTypeV1;
  canonStatus: CanonStatusV1;
  visibilityPolicy: VisibilityPolicyV1;
  provenance: WikiEntityLoreProvenance;
  chapterRefs: string[];
  aliases: string[];
  conflictRef?: string;
}

const SOURCE_TYPES = new Set<SourceTypeV1>([
  "book_i_chapter",
  "book_i_mission_log",
  "foundational_dossier",
  "series_bible",
  "world_snapshot",
  "technical_brief",
  "parable_catalog",
  "style_guide",
  "ai_generated",
  "user_submitted",
  "legacy_import",
]);

const CANON = new Set<CanonStatusV1>(["canon", "adjacent", "experimental"]);

const VIS = new Set<VisibilityPolicyV1>([
  "progressive",
  "always_visible",
  "profile_override_only",
  "admin_only",
]);

const ENTITY_KINDS = new Set<WikiEntityKind>([
  "character",
  "faction",
  "location",
  "artifact",
  "rule",
]);

function metaLine(block: string, label: string): string {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\*\\*${escaped}:\\*\\*\\s*(.+)`, "im");
  return block.match(re)?.[1]?.trim() ?? "";
}

function splitList(value: string): string[] {
  return value
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeChapterRef(id: string): string {
  const m = id.trim().match(/^CH(\d{2,4})$/i);
  if (!m) return id.trim();
  return `CH${String(parseInt(m[1], 10)).padStart(2, "0")}`;
}

export function parseWikiEntityLoreSection(
  content: string,
  defaults: { wikiEntityKind: WikiEntityKind }
): WikiEntityLoreMetadata | undefined {
  const block = extractSectionBlock(content, WIKI_LORE_METADATA_HEADING);
  if (!block.trim()) return undefined;

  const sourceDocument = metaLine(block, "Source document");
  const sourceTypeRaw = metaLine(block, "Source type").toLowerCase().replace(/\s+/g, "_");

  const sourceType = sourceTypeRaw as SourceTypeV1;
  if (!SOURCE_TYPES.has(sourceType)) return undefined;
  if (!sourceDocument) return undefined;

  const kindRaw = metaLine(block, "Content type").toLowerCase().trim();
  let wikiEntityKind: WikiEntityKind = defaults.wikiEntityKind;
  if (kindRaw && ENTITY_KINDS.has(kindRaw as WikiEntityKind)) {
    wikiEntityKind = kindRaw as WikiEntityKind;
  }

  let canonStatus: CanonStatusV1 = "adjacent";
  const canonRaw = metaLine(block, "Canon status").toLowerCase().trim();
  if (canonRaw && CANON.has(canonRaw as CanonStatusV1)) {
    canonStatus = canonRaw as CanonStatusV1;
  }

  let visibilityPolicy: VisibilityPolicyV1 = "always_visible";
  const visRaw = metaLine(block, "Visibility policy").toLowerCase().trim().replace(/\s+/g, "_");
  if (visRaw && VIS.has(visRaw as VisibilityPolicyV1)) {
    visibilityPolicy = visRaw as VisibilityPolicyV1;
  }

  const provenance: WikiEntityLoreProvenance = {
    sourceDocument,
    sourcePath: metaLine(block, "Source path") || undefined,
    extractedAt: metaLine(block, "Extracted at") || undefined,
    extractorVersion: metaLine(block, "Extractor version") || undefined,
  };

  const chapterRefs = splitList(metaLine(block, "Chapter refs")).map(normalizeChapterRef);
  const aliases = splitList(metaLine(block, "Aliases")).map((a) => a.toLowerCase());
  const conflictRef = metaLine(block, "Conflict ref") || undefined;

  return {
    wikiEntityKind,
    sourceType,
    canonStatus,
    visibilityPolicy,
    provenance,
    chapterRefs,
    aliases,
    conflictRef,
  };
}
