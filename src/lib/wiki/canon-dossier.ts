/**
 * Parser for the machine-written `<!-- canon:dossier ... --> ... <!-- canon:end -->`
 * block emitted by `scripts/seed-canon-entities.ts`.
 *
 * Every canon-seeded wiki noun (characters, artifacts, locations, factions, rules)
 * carries a bounded dossier with aliases, a narrative paragraph, related slugs,
 * and canon source citations. The reader surfaces are responsible for rendering
 * this block — without it, only the title shows on a detail page.
 */

export interface CanonDossierSource {
  sourceDoc: string;
  sourceAnchor: string;
}

export type CanonDossierKind =
  | "characters"
  | "artifacts"
  | "locations"
  | "factions"
  | "rules"
  | (string & {});

export interface CanonDossier {
  slug: string;
  kind: CanonDossierKind;
  subkind: string | null;
  parentSlug: string | null;
  generated: string | null;
  mentions: number | null;
  aliases: string[];
  primaryProse: string;
  related: string[];
  sources: CanonDossierSource[];
}

const BLOCK_RE =
  /<!--\s*canon:dossier\s+([^>]*?)-->\s*\n?([\s\S]*?)<!--\s*canon:end\s*-->/m;

const ATTR_RE = /(\w+)="([^"]*)"/g;

function parseAttrs(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of raw.matchAll(ATTR_RE)) out[m[1]!] = m[2]!;
  return out;
}

function parseAliases(block: string): string[] {
  const m = block.match(/\*\*Aliases:\*\*\s*(.+)/);
  if (!m) return [];
  return m[1]!
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseParent(block: string): string | null {
  const m = block.match(/\*\*Parent:\*\*\s*\[\[([a-z0-9-]+)\]\]/i);
  return m ? m[1]!.toLowerCase() : null;
}

function extractH3Section(block: string, heading: string): string {
  const esc = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`###\\s+${esc}\\s*\\n([\\s\\S]*?)(?=\\n###\\s+|$)`);
  const m = block.match(re);
  return m ? m[1]!.trim() : "";
}

function parseRelated(block: string): string[] {
  const body = extractH3Section(block, "Related");
  if (!body) return [];
  const seen = new Set<string>();
  for (const m of body.matchAll(/\[\[([a-z0-9-]+)\]\]/gi)) {
    seen.add(m[1]!.toLowerCase());
  }
  return [...seen];
}

function parseSources(block: string): CanonDossierSource[] {
  const body = extractH3Section(block, "Canon sources");
  if (!body) return [];
  const out: CanonDossierSource[] = [];
  for (const line of body.split("\n")) {
    const m = line.match(/^-\s*\*\*(.+?)\*\*\s*›\s*(.+)$/);
    if (m) out.push({ sourceDoc: m[1]!.trim(), sourceAnchor: m[2]!.trim() });
  }
  return out;
}

function parsePrimaryProse(block: string): string {
  const lines = block.split("\n");
  const out: string[] = [];
  let inH3 = false;
  for (const line of lines) {
    if (/^###\s+/.test(line)) {
      inH3 = true;
      continue;
    }
    if (inH3) continue;
    if (/^##\s+Canon Dossier\s*$/.test(line)) continue;
    if (/^\*\*(Aliases|Parent):\*\*/.test(line)) continue;
    if (line.trim() === "") {
      if (out.length > 0 && out[out.length - 1] !== "") out.push("");
      continue;
    }
    out.push(line);
  }
  return out.join("\n").trim();
}

/** Returns the parsed canon-dossier block, or `null` if the markdown has none. */
export function parseCanonDossier(content: string): CanonDossier | null {
  if (!content) return null;
  const m = content.match(BLOCK_RE);
  if (!m) return null;
  const attrs = parseAttrs(m[1]!);
  const block = m[2] ?? "";

  const mentionsRaw = attrs.mentions;
  const mentionsN = mentionsRaw ? Number(mentionsRaw) : NaN;

  return {
    slug: (attrs.slug ?? "").toLowerCase(),
    kind: attrs.kind ?? "",
    subkind: attrs.subkind && attrs.subkind.length > 0 ? attrs.subkind : null,
    parentSlug:
      (attrs.parent && attrs.parent.length > 0
        ? attrs.parent.toLowerCase()
        : null) ?? parseParent(block),
    generated: attrs.generated && attrs.generated.length > 0 ? attrs.generated : null,
    mentions: Number.isFinite(mentionsN) ? mentionsN : null,
    aliases: parseAliases(block),
    primaryProse: parsePrimaryProse(block),
    related: parseRelated(block),
    sources: parseSources(block),
  };
}

/** Convert `vault-builders` → `Vault Builders` (capitalized per token). */
export function prettifySlug(slug: string): string {
  return slug
    .split("-")
    .map((part) =>
      part.length === 0 ? part : part[0]!.toUpperCase() + part.slice(1),
    )
    .join(" ");
}
