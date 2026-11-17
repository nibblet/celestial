import Link from "next/link";
import type { CanonDossier } from "@/lib/wiki/canon-dossier";
import type { WikiEntityLoreMetadata } from "@/lib/wiki/lore-provenance";
import type { Relationship } from "@/lib/archive/file-summary";

const HEADING =
  "mb-3 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-ink-ghost";
const SERIF = "font-[family-name:var(--font-lora)]";
const DISCLOSURE =
  "inline-flex min-h-11 cursor-pointer select-none items-center text-sm text-ocean";

/** The short summary at the top of a file, with the remainder behind "More". */
export function FileLede({ lede, more }: { lede: string; more?: string[] }) {
  const extra = (more ?? []).map((p) => p.trim()).filter(Boolean);
  if (!lede && extra.length === 0) return null;
  return (
    <section aria-label="Summary" className="mb-8">
      {lede ? (
        <p className={`${SERIF} text-[1.0625rem] leading-relaxed text-ink`}>{lede}</p>
      ) : null}
      {extra.length > 0 ? (
        <details>
          <summary className={DISCLOSURE}>More</summary>
          <div className={`${SERIF} space-y-3 pb-2 text-[0.9375rem] leading-relaxed text-ink-muted`}>
            {extra.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}

export type RelationshipRow = Relationship & { href: string | null };

function RelationshipItem({ row }: { row: RelationshipRow }) {
  const body = (
    <>
      <span className="block font-[family-name:var(--font-playfair)] text-[1.0625rem] text-burgundy">
        {row.name}
      </span>
      {row.line ? (
        <span className={`${SERIF} mt-0.5 block text-[0.9375rem] leading-relaxed text-ink-muted`}>
          {row.line}
        </span>
      ) : null}
    </>
  );
  return (
    <li className="border-b border-[var(--color-border)] last:border-b-0">
      {row.href ? (
        <Link href={row.href} className="block py-3 no-underline hover:bg-warm-white">
          {body}
        </Link>
      ) : (
        <div className="py-3">{body}</div>
      )}
    </li>
  );
}

/** The people who matter to this one, a line each. The first few show at once. */
export function FileRelationships({
  rows,
  initial = 4,
}: {
  rows: RelationshipRow[];
  initial?: number;
}) {
  if (rows.length === 0) return null;
  const first = rows.slice(0, initial);
  const rest = rows.slice(initial);
  return (
    <section aria-label="Relationships" className="mb-8">
      <h2 className={HEADING}>Relationships</h2>
      <ul className="list-none">
        {first.map((row) => (
          <RelationshipItem key={row.name} row={row} />
        ))}
      </ul>
      {rest.length > 0 ? (
        <details>
          <summary className={DISCLOSURE}>{rest.length} more</summary>
          <ul className="list-none">
            {rest.map((row) => (
              <RelationshipItem key={row.name} row={row} />
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

/** Other files this one connects to, as chips. */
export function LinkedFiles({ files }: { files: { href: string; label: string }[] }) {
  if (files.length === 0) return null;
  return (
    <section aria-label="Linked files" className="mb-8">
      <h2 className={HEADING}>Linked files</h2>
      <ul className="flex list-none flex-wrap gap-2">
        {files.map((file) => (
          <li key={file.href}>
            <Link
              href={file.href}
              className="inline-flex min-h-9 items-center rounded-full border border-[var(--color-border)] bg-warm-white px-3 text-[0.8125rem] text-ink no-underline hover:border-ocean"
            >
              {file.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Everything else about a file is a question away. */
export function AskAboutFile({ questions }: { questions: string[] }) {
  if (questions.length === 0) return null;
  return (
    <section aria-label="Ask the archive" className="mb-8">
      <h2 className={HEADING}>Ask the archive</h2>
      <ul className="list-none space-y-2">
        {questions.map((question) => (
          <li key={question}>
            <Link
              href={`/ask?prompt=${encodeURIComponent(question)}`}
              className="flex min-h-12 items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-warm-white px-4 py-2 text-sm text-ink no-underline hover:border-ocean"
            >
              <span>{question}</span>
              <span aria-hidden className="text-ocean">
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Where a file's text came from. Shown to the author only. */
export function AuthorProvenance({
  dossier,
  lore,
  note,
}: {
  dossier?: CanonDossier | null;
  lore?: WikiEntityLoreMetadata | null;
  note?: string | null;
}) {
  const sources = dossier?.sources ?? [];
  if (sources.length === 0 && !lore && !note) return null;
  return (
    <details className="mb-8 rounded-lg border border-dashed border-[var(--color-border)] px-4 text-sm text-ink-muted">
      <summary className={`${DISCLOSURE} text-ink-muted`}>
        Author view · sources and provenance
      </summary>
      <div className="space-y-3 pb-4">
        {note ? <p>{note}</p> : null}
        {lore ? (
          <p>
            {lore.provenance.sourceDocument} · {lore.canonStatus}
            {lore.chapterRefs.length > 0 ? ` · ${lore.chapterRefs.join(", ")}` : ""}
          </p>
        ) : null}
        {sources.length > 0 ? (
          <ul className="list-disc space-y-1 pl-5">
            {sources.map((s, i) => (
              <li key={`${s.sourceDoc}-${s.sourceAnchor}-${i}`}>
                {s.sourceDoc} › {s.sourceAnchor}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </details>
  );
}
