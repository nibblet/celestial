/**
 * Phase 5 — parses the `## Dossier` section of a wiki entity file into
 * typed sub-fields. Character kind only for now; artifact/location kinds
 * will add sibling parsers with their own label maps.
 */

import { extractSectionBlock } from "@/lib/wiki/markdown-sections";

export type CharacterDossierField = "role" | "profile" | "arc";

export interface CharacterDossier {
  kind: "character";
  role?: string;
  profile?: string;
  arc?: string;
  /** Sub-fields actually present in source, in file order. */
  presentFields: CharacterDossierField[];
}

export interface EntityDossierParseResult {
  dossier?: CharacterDossier;
  warnings: string[];
}

const WIKI_DOSSIER_HEADING = "Dossier";

const CHARACTER_LABEL_TO_FIELD: Record<string, CharacterDossierField> = {
  role: "role",
  profile: "profile",
  "character arc": "arc",
  arc: "arc",
};

interface SubSection {
  labelRaw: string;
  body: string;
}

function splitSubSections(block: string): SubSection[] {
  if (!block.trim()) return [];
  const lines = block.split("\n");
  const sections: SubSection[] = [];
  let current: SubSection | null = null;

  for (const line of lines) {
    const m = line.match(/^### +(.+?)\s*$/);
    if (m) {
      if (current) sections.push(current);
      current = { labelRaw: m[1], body: "" };
      continue;
    }
    if (current) {
      current.body += (current.body ? "\n" : "") + line;
    }
  }
  if (current) sections.push(current);

  return sections.map((s) => ({ labelRaw: s.labelRaw, body: s.body.trim() }));
}

export function parseCharacterDossierSection(
  content: string
): EntityDossierParseResult {
  const block = extractSectionBlock(content, WIKI_DOSSIER_HEADING);
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
  }

  if (dossier.presentFields.length === 0) {
    return { dossier: undefined, warnings };
  }

  return { dossier, warnings };
}
