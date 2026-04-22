/**
 * Extract the hand-authored markdown body from a wiki entity file,
 * stripping managed blocks (canon dossier, ai dossier, lore metadata) and
 * sections already rendered as structured UI (Appearances, Related, Note,
 * Lore metadata, Canon Dossier heading, etc.).
 *
 * The result is safe to render with `StoryMarkdown` below the structured
 * dossier cards so hand-authored ## sub-sections (e.g. "Exterior Form",
 * "Interior Architecture", "Manifestation") appear on the web.
 */

// H2 headings that are rendered by dedicated UI components and must be
// stripped from the authored body so they don't render twice.
const SUPPRESSED_H2_HEADINGS: readonly string[] = [
  "Canon Dossier",
  "Dossier",
  "Appearances",
  "Additional appearances",
  "Related",
  "Lore metadata",
  "Note",
];

function stripHtmlComment(content: string, startMarker: RegExp, endMarker: RegExp): string {
  let out = content;
  while (true) {
    const start = out.match(startMarker);
    if (!start || start.index === undefined) break;
    const tail = out.slice(start.index);
    const end = tail.match(endMarker);
    if (!end || end.index === undefined) break;
    const endAbs = start.index + end.index + end[0].length;
    out = out.slice(0, start.index) + out.slice(endAbs);
  }
  return out;
}

function stripSection(content: string, heading: string): string {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Match `## Heading` through to (exclusive) the next `## ` / `# ` or EOF.
  const re = new RegExp(
    `(^|\\n)##\\s+${escaped}\\s*\\n[\\s\\S]*?(?=(\\n#{1,2}\\s+|$))`,
    "i",
  );
  return content.replace(re, "$1");
}

export function extractAuthoredBody(raw: string): string {
  if (!raw) return "";
  let out = raw;

  out = stripHtmlComment(out, /<!--\s*canon:dossier\b/, /<!--\s*canon:end\s*-->/);
  out = stripHtmlComment(out, /<!--\s*ai-dossier:[a-z-]+\b/i, /<!--\s*ai-dossier:end\s*-->/i);
  out = stripHtmlComment(out, /<!--\s*ai-draft:start\b/, /<!--\s*ai-draft:end\s*-->/);

  out = out.replace(/^#\s+.+\n?/m, "");
  out = out.replace(/^\*\*Slug:\*\*.*\n?/m, "");
  out = out.replace(/^Inventory entry.*\n?/gm, "");
  out = out.replace(/^reviewed:\s*(true|false)\s*\n?/gm, "");

  for (const h of SUPPRESSED_H2_HEADINGS) {
    out = stripSection(out, h);
  }

  // Remove any remaining standalone HTML comments (e.g. `<!-- generated:ingest -->`)
  // so they don't leave an empty `<section>` on the page.
  out = out.replace(/<!--[\s\S]*?-->/g, "");

  out = out.replace(/\n{3,}/g, "\n\n").trim();

  // If what's left has no actual text (only whitespace/separators), treat as empty.
  if (!/[A-Za-z0-9]/.test(out)) return "";
  return out;
}

/**
 * Convert `[[slug]]` wikilinks in an authored body to plain markdown links.
 * Uses the provided resolver so the UI gets real anchors instead of rendering
 * `[[thane-meric]]` as literal brackets.
 */
export function renderWikilinks(
  body: string,
  resolve: (slug: string) => { href: string; label: string } | null,
): string {
  return body.replace(/\[\[([a-z0-9][a-z0-9-]*)\]\]/gi, (match, slug: string) => {
    const r = resolve(slug.toLowerCase());
    if (!r) return match;
    return `[${r.label}](${r.href})`;
  });
}
