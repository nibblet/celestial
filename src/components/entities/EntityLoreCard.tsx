import type { WikiEntityLoreMetadata } from "@/lib/wiki/lore-provenance";

const SOURCE_LABEL: Record<string, string> = {
  foundational_dossier: "Foundational dossier",
  series_bible: "Series bible",
  world_snapshot: "World snapshot",
  technical_brief: "Technical brief",
  parable_catalog: "Parable catalog",
  style_guide: "Style guide",
  book_i_chapter: "Book I chapter",
  book_i_mission_log: "Mission log",
  ai_generated: "AI-generated",
  user_submitted: "User-submitted",
  legacy_import: "Legacy import",
};

export function EntityLoreCard({ lore }: { lore: WikiEntityLoreMetadata }) {
  const srcLabel = SOURCE_LABEL[lore.sourceType] ?? lore.sourceType;

  return (
    <aside className="mb-6 rounded-xl border border-[var(--color-border)] bg-[rgba(62,109,156,0.06)] px-4 py-3">
      <p className="type-meta mb-2 text-ink">Canon &amp; provenance</p>
      <dl className="grid gap-2 text-sm text-ink-muted sm:grid-cols-2">
        <div>
          <dt className="type-meta text-ink-ghost">Source</dt>
          <dd className="mt-0.5 text-ink">{srcLabel}</dd>
        </div>
        <div>
          <dt className="type-meta text-ink-ghost">Canon status</dt>
          <dd className="mt-0.5 capitalize text-ink">{lore.canonStatus}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="type-meta text-ink-ghost">Document</dt>
          <dd className="mt-0.5 text-ink">{lore.provenance.sourceDocument}</dd>
        </div>
        {lore.provenance.sourcePath && (
          <div className="sm:col-span-2">
            <dt className="type-meta text-ink-ghost">Path</dt>
            <dd className="mt-0.5 break-all font-mono text-xs text-ink-muted">
              {lore.provenance.sourcePath}
            </dd>
          </div>
        )}
        {lore.chapterRefs.length > 0 && (
          <div className="sm:col-span-2">
            <dt className="type-meta text-ink-ghost">Chapter refs</dt>
            <dd className="mt-0.5 text-ink">{lore.chapterRefs.join(", ")}</dd>
          </div>
        )}
        {lore.aliases.length > 0 && (
          <div className="sm:col-span-2">
            <dt className="type-meta text-ink-ghost">Aliases</dt>
            <dd className="mt-0.5 text-ink">{lore.aliases.join(", ")}</dd>
          </div>
        )}
        {lore.conflictRef && (
          <div className="sm:col-span-2">
            <dt className="type-meta text-ink-ghost">Conflict register</dt>
            <dd className="mt-0.5 font-mono text-xs text-ink">{lore.conflictRef}</dd>
          </div>
        )}
      </dl>
    </aside>
  );
}
