import Link from "next/link";
import type { CanonDossier } from "@/lib/wiki/canon-dossier";
import { prettifySlug } from "@/lib/wiki/canon-dossier";
import { resolveWikiSlug, resolveWikiSlugs } from "@/lib/wiki/slug-resolver";

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function CanonDossierCard({ dossier }: { dossier: CanonDossier }) {
  const paragraphs = splitParagraphs(dossier.primaryProse);
  const parent = dossier.parentSlug ? resolveWikiSlug(dossier.parentSlug) : null;
  const related = resolveWikiSlugs(dossier.related);

  return (
    <section className="mb-6" aria-label="Canon dossier">
      {paragraphs.length > 0 && (
        <div className="mb-4 space-y-3 text-ink">
          {paragraphs.map((p, i) => (
            <p key={i} className="type-ui leading-relaxed">
              {p}
            </p>
          ))}
        </div>
      )}

      <dl className="grid gap-3 text-sm text-ink-muted sm:grid-cols-2">
        {dossier.aliases.length > 0 && (
          <div className="sm:col-span-2">
            <dt className="type-meta text-ink-ghost">Also known as</dt>
            <dd className="mt-0.5 text-ink">{dossier.aliases.join(", ")}</dd>
          </div>
        )}
        {parent && (
          <div>
            <dt className="type-meta text-ink-ghost">
              {dossier.kind === "artifacts" ? "Part of" : "Parent"}
            </dt>
            <dd className="mt-0.5 text-ink">
              <Link
                href={parent.href}
                className="no-underline hover:text-ocean"
              >
                {parent.label}
              </Link>
            </dd>
          </div>
        )}
        {!parent && dossier.parentSlug && (
          <div>
            <dt className="type-meta text-ink-ghost">Parent</dt>
            <dd className="mt-0.5 text-ink">
              {prettifySlug(dossier.parentSlug)}
            </dd>
          </div>
        )}
        {dossier.subkind && (
          <div>
            <dt className="type-meta text-ink-ghost">Type</dt>
            <dd className="mt-0.5 text-ink">
              {prettifySlug(dossier.subkind)}
            </dd>
          </div>
        )}
        {typeof dossier.mentions === "number" && dossier.mentions > 0 && (
          <div>
            <dt className="type-meta text-ink-ghost">Canon mentions</dt>
            <dd className="mt-0.5 text-ink">{dossier.mentions}</dd>
          </div>
        )}
      </dl>

      {related.length > 0 && (
        <div className="mt-5">
          <h2 className="type-meta mb-2 text-ink">Related</h2>
          <ul className="flex list-none flex-wrap gap-1.5">
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  href={r.href}
                  className="inline-block rounded-full border border-[var(--color-border)] bg-warm-white px-2.5 py-0.5 text-xs text-ink no-underline transition-colors hover:border-clay-border hover:text-burgundy"
                >
                  {r.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {dossier.sources.length > 0 && (
        <details className="mt-5 text-sm text-ink-muted">
          <summary className="type-meta cursor-pointer text-ink-ghost hover:text-ink">
            Canon sources ({dossier.sources.length})
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {dossier.sources.map((s, i) => (
              <li key={`${s.sourceDoc}-${s.sourceAnchor}-${i}`}>
                <span className="font-medium text-ink">{s.sourceDoc}</span>
                <span className="text-ink-ghost"> › </span>
                <span>{s.sourceAnchor}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
