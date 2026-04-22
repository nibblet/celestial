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
  | "rule"
  | "vault";

export interface WikiEntityLoreProvenance {
  sourceDocument: string;
  sourcePath?: string;
  extractedAt?: string;
  extractorVersion?: string;
}

/** Parable / rule status chip (see Parable Catalog v2). */
export type WikiEntityStatus =
  | "fully_manifested"
  | "soft"
  | "fragment"
  | "foreshadowed"
  | "cataloged";

export interface WikiEntitySuperset {
  /** `location`, `artifact`, etc. */
  type: string;
  slug: string;
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
  /** Hub grouping: parent place or ship ([[location:mars]], [[artifact:valkyrie-1]]). */
  superset?: WikiEntitySuperset;
  /** Free-form subkind (e.g. parable, concept, site, planet, ship-section). */
  subkind?: string;
  /** Parable/rule manifestation state on the Parable Catalog v2 axis. */
  status?: WikiEntityStatus;
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
  "canon_inventory",
  "ai_generated",
  "user_submitted",
  "legacy_import",
]);

const CANON = new Set<CanonStatusV1>(["canon", "adjacent", "experimental"]);

/** Normalize human-authored canon status labels onto the v1 type. */
function normalizeCanonStatus(raw: string): CanonStatusV1 | undefined {
  const t = raw.toLowerCase().trim();
  if (!t) return undefined;
  if (t === "canonical") return "canon";
  if (CANON.has(t as CanonStatusV1)) return t as CanonStatusV1;
  return undefined;
}

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
  "vault",
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

const SUPERSET_TYPES = new Set([
  "location",
  "artifact",
  "vault",
  "faction",
  "character",
  "rule",
]);

function parseSuperset(raw: string): WikiEntitySuperset | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  const typed = t.match(/\[\[([a-z]+):([a-z0-9-]+)\]\]/i);
  if (typed) {
    const type = typed[1]!.toLowerCase();
    const slug = typed[2]!.toLowerCase();
    if (SUPERSET_TYPES.has(type)) return { type, slug };
    return undefined;
  }
  const bare = t.match(/^([a-z0-9-]+)$/i);
  if (bare) return { type: "location", slug: bare[1]!.toLowerCase() };
  return undefined;
}

const STATUS_VALUES = new Set<WikiEntityStatus>([
  "fully_manifested",
  "soft",
  "fragment",
  "foreshadowed",
  "cataloged",
]);

function parseStatus(raw: string): WikiEntityStatus | undefined {
  const t = raw.toLowerCase().trim().replace(/\s+/g, "_");
  if (!t) return undefined;
  return STATUS_VALUES.has(t as WikiEntityStatus)
    ? (t as WikiEntityStatus)
    : undefined;
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

  const canonParsed = normalizeCanonStatus(metaLine(block, "Canon status"));
  const canonStatus: CanonStatusV1 = canonParsed ?? "adjacent";

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
  const superset = parseSuperset(metaLine(block, "Superset"));
  const subkind = metaLine(block, "Subkind").toLowerCase().trim() || undefined;
  const status = parseStatus(metaLine(block, "Status"));

  return {
    wikiEntityKind,
    sourceType,
    canonStatus,
    visibilityPolicy,
    provenance,
    chapterRefs,
    aliases,
    conflictRef,
    ...(superset ? { superset } : {}),
    ...(subkind ? { subkind } : {}),
    ...(status ? { status } : {}),
  };
}
