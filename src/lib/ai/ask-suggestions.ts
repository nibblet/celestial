import { getChapterTags } from "@/lib/wiki/chapter-tags";
import { resolveWikiSlug } from "@/lib/wiki/slug-resolver";

function label(slug: string): string {
  return (
    resolveWikiSlug(slug)?.label ??
    slug
      .split("-")
      .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : ""))
      .join(" ")
  );
}

/**
 * Starter questions drawn from the last chapter the reader finished, so the
 * suggestions are about this book and never reach past the bookmark.
 */
export function buildAskSuggestions(
  finishedThrough: number,
  chapterTitle: string | null,
  bookTitle: string,
  /** Finished readers get whole-book questions, not "so far" ones. */
  wholeBook = false
): string[] {
  if (wholeBook) {
    const tags = getChapterTags(`CH${String(finishedThrough).padStart(2, "0")}`);
    const out = [`What does the ending of ${bookTitle} leave unresolved?`];
    const lead = tags?.characters.find((c) => c.presence === "lead");
    if (lead) out.push(`How does ${label(lead.slug)} change over the book?`);
    if (tags?.rules[0]) out.push(`How does ${label(tags.rules[0].slug)} work?`);
    out.push("What do the vaults want from the crew?");
    return out;
  }
  if (finishedThrough <= 0) {
    return [
      `What is ${bookTitle} about, without spoilers?`,
      "What should I know before I start chapter 1?",
    ];
  }
  const tags = getChapterTags(`CH${String(finishedThrough).padStart(2, "0")}`);
  const out: string[] = [];
  if (chapterTitle) out.push(`Recap “${chapterTitle}” for me.`);
  if (tags) {
    const leads = tags.characters
      .filter((c) => c.presence === "lead")
      .concat(tags.characters.filter((c) => c.presence !== "lead"))
      .slice(0, 2);
    for (const c of leads) {
      out.push(`What do we know about ${label(c.slug)} so far?`);
    }
    if (tags.locations[0]) out.push(`What is ${label(tags.locations[0].slug)}?`);
    if (tags.rules[0]) {
      out.push(`How does ${label(tags.rules[0].slug)} work, as far as we know?`);
    }
  }
  out.push("What questions has the story left open so far?");
  return out.slice(0, 5);
}
