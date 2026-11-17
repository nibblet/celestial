/**
 * Helpers that turn a file's long wiki text into the short page readers see:
 * a lede, and relationships as one line each. Pure, so they are easy to test.
 */

export interface Relationship {
  name: string;
  /** One line on what the relationship is, chapter references removed. */
  line: string;
  /** Chapter numbers the line draws on. */
  chapters: number[];
}

/** Parses `- **Name** — line (CH01, CH12).` rows from a dossier section. */
export function parseRelationships(markdown: string | undefined | null): Relationship[] {
  if (!markdown) return [];
  const out: Relationship[] = [];
  for (const raw of markdown.split("\n")) {
    const m = raw.match(/^\s*[-*]\s+\*\*(.+?)\*\*\s*[—–:-]\s*(.+)$/);
    if (!m) continue;
    const chapters = [...m[2]!.matchAll(/CH(\d{1,3})/gi)].map((c) => Number(c[1]));
    const line = m[2]!
      .replace(/\s*\((?:\s*CH\d{1,3}\s*,?)+\)\s*\.?\s*$/i, "")
      .trim()
      .replace(/([^.!?])$/, "$1.");
    out.push({ name: m[1]!.trim(), line, chapters });
  }
  return out;
}

/**
 * Splits prose into a short lede and the remainder. The lede is whole
 * sentences from the first paragraph, up to about `max` characters.
 */
export function splitLede(
  text: string | undefined | null,
  max = 300
): { lede: string; rest: string } {
  const clean = (text ?? "").trim();
  if (!clean) return { lede: "", rest: "" };
  const paragraphs = clean.split(/\n{2,}/).map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);
  const first = paragraphs[0]!;
  const sentences = first.match(/[^.!?]+[.!?]+(?:["'”’)]+)?|[^.!?]+$/g) ?? [first];
  let lede = "";
  let used = 0;
  for (const sentence of sentences) {
    const next = (lede + sentence).trim();
    if (lede && next.length > max) break;
    lede = `${lede}${sentence}`;
    used += 1;
  }
  const restOfFirst = sentences.slice(used).join("").trim();
  const rest = [restOfFirst, ...paragraphs.slice(1)].filter(Boolean).join("\n\n");
  return { lede: lede.trim(), rest };
}

/** The name readers use in a question: "Galen" for the person "Galen Voss". */
export function shortName(name: string, isPerson = false): string {
  const base = name.split(":")[0]!.trim();
  if (!isPerson) return base;
  const words = base.split(/\s+/);
  return words.length === 2 && words.every((w) => /^[A-Z][a-z]+$/.test(w))
    ? words[0]!
    : base;
}
