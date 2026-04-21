/**
 * Stable heading ids for in-page navigation (chapter scenes, markdown TOC).
 */

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Scene blocks use `###` under `## Full Text`. */
export function extractSceneSectionsFromChapterBody(fullText: string): {
  id: string;
  label: string;
}[] {
  const block = fullText.match(/## Full Text\s*\n\n([\s\S]*)/)?.[1];
  if (!block) return [];
  const beforeNextMajor = block.split(/\n## /)[0] ?? block;
  const sections: { id: string; label: string }[] = [];
  for (const line of beforeNextMajor.split("\n")) {
    const m = line.match(/^###\s+(.+)/);
    if (!m) continue;
    const label = m[1].trim();
    if (!label) continue;
    const slug = slugifyHeading(label);
    if (!slug) continue;
    sections.push({ id: `scene-${slug}`, label });
  }
  return sections;
}
