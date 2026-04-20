/**
 * Phase 5 — parses the `## Dossier` section of a wiki entity file into
 * typed sub-fields. Character kind only for now; artifact/location kinds
 * will add sibling parsers with their own label maps.
 *
 * AI-derived fields (relationships/moments/voice/timeline) are wrapped in
 * HTML markers so re-runs are idempotent:
 *
 *   <!-- ai-dossier:relationships generated="YYYY-MM-DD" reviewed="false" model="..." source-hash="..." -->
 *   ### Key Relationships
 *   ...
 *   <!-- ai-dossier:end -->
 */

/**
 * Dossier-local variant of extractSectionBlock that does NOT terminate on
 * `<!--` so our inline ai-dossier markers remain inside the captured block.
 */
function extractDossierBlock(content: string): string {
  const regex = /## Dossier\n\n([\s\S]*?)(?=\n## |\n---|$)/;
  const match = content.match(regex);
  return match?.[1]?.trim() ?? "";
}

export type CharacterDossierCanonicalField = "role" | "profile" | "arc";
export type CharacterDossierDerivedField =
  | "relationships"
  | "moments"
  | "voice"
  | "timeline";
export type CharacterDossierField =
  | CharacterDossierCanonicalField
  | CharacterDossierDerivedField;

export interface CharacterDossierEnrichmentMeta {
  generated: string;
  reviewed: boolean;
  model: string;
  sourceHash: string;
}

export interface CharacterDossier {
  kind: "character";
  role?: string;
  profile?: string;
  arc?: string;
  relationships?: string;
  moments?: string;
  voice?: string;
  timeline?: string;
  /** Provenance for each AI-derived sub-field. */
  enrichment?: Partial<
    Record<CharacterDossierDerivedField, CharacterDossierEnrichmentMeta>
  >;
  presentFields: CharacterDossierField[];
}

export interface EntityDossierParseResult {
  dossier?: CharacterDossier;
  warnings: string[];
}

const CHARACTER_LABEL_TO_FIELD: Record<string, CharacterDossierField> = {
  role: "role",
  profile: "profile",
  "character arc": "arc",
  arc: "arc",
  "key relationships": "relationships",
  relationships: "relationships",
  "notable moments": "moments",
  moments: "moments",
  "voice & manner": "voice",
  "voice and manner": "voice",
  voice: "voice",
  timeline: "timeline",
};

export const DERIVED_FIELDS: readonly CharacterDossierDerivedField[] = [
  "relationships",
  "moments",
  "voice",
  "timeline",
];

export const DERIVED_FIELD_HEADINGS: Record<
  CharacterDossierDerivedField,
  string
> = {
  relationships: "Key Relationships",
  moments: "Notable Moments",
  voice: "Voice & Manner",
  timeline: "Timeline",
};

const AI_DOSSIER_OPEN_RE =
  /<!--\s*ai-dossier:(relationships|moments|voice|timeline)\b([^>]*?)-->/i;

function parseMarkerAttrs(
  attrsRaw: string
): Omit<CharacterDossierEnrichmentMeta, never> {
  const get = (key: string): string => {
    const m = attrsRaw.match(new RegExp(`${key}\\s*=\\s*"([^"]*)"`, "i"));
    return m ? m[1] : "";
  };
  return {
    generated: get("generated"),
    reviewed: get("reviewed").toLowerCase() === "true",
    model: get("model"),
    sourceHash: get("source-hash") || get("sourceHash"),
  };
}

interface SubSection {
  labelRaw: string;
  body: string;
  /** If this sub-section was wrapped in an ai-dossier marker. */
  marker?: {
    field: CharacterDossierDerivedField;
    meta: CharacterDossierEnrichmentMeta;
  };
}

function splitSubSections(block: string): SubSection[] {
  if (!block.trim()) return [];
  const lines = block.split("\n");
  const sections: SubSection[] = [];
  let current: SubSection | null = null;
  let pendingMarker: SubSection["marker"] | undefined;
  let insideMarker = false;

  for (const line of lines) {
    const openMatch = line.match(AI_DOSSIER_OPEN_RE);
    if (openMatch) {
      pendingMarker = {
        field: openMatch[1].toLowerCase() as CharacterDossierDerivedField,
        meta: parseMarkerAttrs(openMatch[2] ?? ""),
      };
      insideMarker = true;
      continue;
    }
    if (/<!--\s*ai-dossier:end\s*-->/i.test(line)) {
      insideMarker = false;
      pendingMarker = undefined;
      continue;
    }

    const headingMatch = line.match(/^### +(.+?)\s*$/);
    if (headingMatch) {
      if (current) sections.push(current);
      current = {
        labelRaw: headingMatch[1],
        body: "",
        marker: insideMarker ? pendingMarker : undefined,
      };
      continue;
    }

    if (current) {
      current.body += (current.body ? "\n" : "") + line;
    }
  }
  if (current) sections.push(current);

  return sections.map((s) => ({
    labelRaw: s.labelRaw,
    body: s.body.trim(),
    marker: s.marker,
  }));
}

export function parseCharacterDossierSection(
  content: string
): EntityDossierParseResult {
  const block = extractDossierBlock(content);
  if (!block.trim()) return { dossier: undefined, warnings: [] };

  const subs = splitSubSections(block);
  if (subs.length === 0) return { dossier: undefined, warnings: [] };

  const warnings: string[] = [];
  const dossier: CharacterDossier = {
    kind: "character",
    presentFields: [],
  };

  for (const sub of subs) {
    const key = sub.labelRaw.trim().toLowerCase();
    const field = CHARACTER_LABEL_TO_FIELD[key];
    if (!field) {
      warnings.push(`unknown sub-heading: ${key}`);
      continue;
    }
    if (!sub.body) continue;
    dossier[field] = sub.body;
    if (!dossier.presentFields.includes(field)) {
      dossier.presentFields.push(field);
    }
    if (sub.marker && sub.marker.field === field) {
      dossier.enrichment = dossier.enrichment ?? {};
      dossier.enrichment[sub.marker.field] = sub.marker.meta;
    }
  }

  if (dossier.presentFields.length === 0) {
    return { dossier: undefined, warnings };
  }

  return { dossier, warnings };
}
