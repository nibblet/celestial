import type { CanonDossier } from "@/lib/wiki/canon-dossier";
import { findCodexEntry, isCodexEntryVisible, type CodexKind } from "@/lib/wiki/codex";
import { resolveWikiSlug } from "@/lib/wiki/slug-resolver";
import type { ReaderProgress } from "@/lib/progress/reader-progress";
import { parseRelationships } from "@/lib/archive/file-summary";
import type { RelationshipRow } from "@/components/archive/FileSections";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function canSee(kind: CodexKind, slug: string, progress: ReaderProgress): boolean {
  if (progress.showAllContent) return true;
  const entry = findCodexEntry(kind, slug);
  return entry ? isCodexEntryVisible(entry, progress) : false;
}

/**
 * Relationship rows for a character file. A mid-book reader sees only the
 * people already met, by name: the one-line descriptions span the whole book.
 */
export function relationshipRows(
  markdown: string | undefined | null,
  progress: ReaderProgress,
  wholeBook: boolean
): RelationshipRow[] {
  const rows: RelationshipRow[] = [];
  for (const rel of parseRelationships(markdown)) {
    const target = resolveWikiSlug(slugify(rel.name));
    if (!wholeBook) {
      const met =
        rel.chapters.some((n) => n <= progress.currentChapterNumber) &&
        (!target || canSee(target.kind, target.slug, progress));
      if (!met) continue;
    }
    rows.push({
      ...rel,
      line: wholeBook ? rel.line : "",
      href: target?.href ?? null,
    });
  }
  return rows;
}

/** Files this one points at, minus any the reader has not reached yet. */
export function linkedFiles(
  dossier: CanonDossier | null | undefined,
  extraSlugs: string[],
  progress: ReaderProgress,
  exclude: Array<string | null> = [],
  max = 8
): { href: string; label: string }[] {
  const skip = new Set(exclude.filter(Boolean) as string[]);
  const seen = new Set<string>();
  const out: { href: string; label: string }[] = [];
  for (const slug of [...(dossier?.related ?? []), ...extraSlugs]) {
    const target = resolveWikiSlug(slug);
    if (!target || seen.has(target.href) || skip.has(target.href)) continue;
    if (!canSee(target.kind, target.slug, progress)) continue;
    seen.add(target.href);
    out.push({ href: target.href, label: target.label.split(":")[0]!.trim() });
    if (out.length >= max) break;
  }
  return out;
}
