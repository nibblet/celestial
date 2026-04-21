import type { WikiPerson } from "@/lib/wiki/parser";

/**
 * Inject first-occurrence markdown links for known people into story prose.
 *
 * Conservative by design: only exact full-name (case-sensitive) matches, only
 * the first occurrence per person per story, and we skip lines that look like
 * code fences, images, or already-linked content. Pass only the people already
 * known to appear in this story (via getPeopleByStoryId) so we don't introduce
 * false positives.
 */
export function addPeopleLinks(text: string, people: WikiPerson[]): string {
  if (!text || people.length === 0) return text;

  const byLongest = [...people].sort((a, b) => b.name.length - a.name.length);
  const linked = new Set<string>();
  const lines = text.split("\n");
  let inFence = false;

  const out = lines.map((line) => {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      return line;
    }
    if (inFence) return line;
    // Skip image lines, raw wiki links, and headings' whole-line matches.
    if (/^\s*!\[/.test(line)) return line;

    let working = line;
    for (const p of byLongest) {
      if (linked.has(p.slug)) continue;
      // Word-boundary, not already inside a markdown link target/label.
      const escaped = p.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`(?<![\\[\\(\\w])${escaped}(?![\\w\\]\\)])`);
      const match = re.exec(working);
      if (!match) continue;
      const idx = match.index;
      working =
        working.slice(0, idx) +
        `[${p.name}](/characters/${p.slug})` +
        working.slice(idx + p.name.length);
      linked.add(p.slug);
    }
    return working;
  });

  return out.join("\n");
}
