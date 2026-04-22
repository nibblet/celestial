/**
 * Filesystem-backed resolver that maps a bare wiki slug
 * (e.g. `valkyrie-1`, `alara`) to the route + display name of the
 * entity it belongs to. Used by the CanonDossierCard to turn
 * `[[slug]]` references into real links without requiring the caller
 * to know whether the slug lives under characters, locations, etc.
 *
 * Safe to import from Server Components only (uses `fs`).
 */

import * as fs from "fs";
import * as path from "path";
import { prettifySlug } from "@/lib/wiki/canon-dossier";

export type ResolvedWikiKind =
  | "characters"
  | "artifacts"
  | "vaults"
  | "locations"
  | "factions"
  | "rules";

export interface ResolvedWikiSlug {
  slug: string;
  kind: ResolvedWikiKind;
  href: string;
  label: string;
}

const WIKI_DIR = path.join(process.cwd(), "content/wiki");

const KIND_TO_BASE_PATH: Record<ResolvedWikiKind, string> = {
  characters: "/characters",
  artifacts: "/artifacts",
  vaults: "/vaults",
  locations: "/locations",
  factions: "/factions",
  rules: "/rules",
};

/**
 * Kinds are probed in this order. If the same slug exists in multiple
 * subdirs (which shouldn't happen under the canon seeder), the first
 * match wins — characters take priority because they are the most
 * commonly linked targets in canon-dossier related blocks.
 */
const PROBE_ORDER: ResolvedWikiKind[] = [
  "characters",
  "artifacts",
  "vaults",
  "locations",
  "factions",
  "rules",
];

function readH1(filePath: string): string | null {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const m = raw.match(/^#\s+(.+)$/m);
    return m ? m[1]!.trim() : null;
  } catch {
    return null;
  }
}

/**
 * Canonical redirects for slugs that were merged/renamed after the seed pass.
 * When an old link such as `[[martian-resonance-vault]]` is encountered, the
 * resolver transparently lands on the canonical page.
 */
const SLUG_ALIASES: Record<string, string> = {
  "martian-resonance-vault": "vault-002",
};

export function resolveWikiSlug(slug: string): ResolvedWikiSlug | null {
  const raw = slug.trim().toLowerCase();
  if (!raw) return null;
  const normalized = SLUG_ALIASES[raw] ?? raw;
  for (const kind of PROBE_ORDER) {
    const filePath = path.join(WIKI_DIR, kind, `${normalized}.md`);
    if (fs.existsSync(filePath)) {
      const label = readH1(filePath) ?? prettifySlug(normalized);
      return {
        slug: normalized,
        kind,
        href: `${KIND_TO_BASE_PATH[kind]}/${normalized}`,
        label,
      };
    }
  }
  return null;
}

/**
 * Convenience: resolve many slugs at once and drop any that
 * could not be resolved. Preserves input order and dedupes.
 */
export function resolveWikiSlugs(slugs: readonly string[]): ResolvedWikiSlug[] {
  const seen = new Set<string>();
  const out: ResolvedWikiSlug[] = [];
  for (const slug of slugs) {
    const resolved = resolveWikiSlug(slug);
    if (resolved && !seen.has(resolved.slug)) {
      seen.add(resolved.slug);
      out.push(resolved);
    }
  }
  return out;
}
