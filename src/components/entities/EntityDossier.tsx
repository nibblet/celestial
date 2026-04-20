import { StoryMarkdown } from "@/components/story/StoryMarkdown";
import type {
  CharacterDossier,
  CharacterDossierDerivedField,
} from "@/lib/wiki/entity-dossier";
import { DERIVED_FIELD_HEADINGS } from "@/lib/wiki/entity-dossier";

const DERIVED_ORDER: readonly CharacterDossierDerivedField[] = [
  "relationships",
  "moments",
  "voice",
  "timeline",
];

export function EntityDossier({ dossier }: { dossier: CharacterDossier }) {
  const hasAnyDerived = DERIVED_ORDER.some((f) => dossier[f]);

  return (
    <section
      aria-labelledby="entity-dossier-heading"
      className="mb-6 rounded-xl border border-clay-border bg-warm-white px-4 py-3"
    >
      <h2 id="entity-dossier-heading" className="type-meta mb-3 text-ink">
        Dossier
      </h2>

      <div className="space-y-4">
        {dossier.role && (
          <div>
            <h3 className="type-meta mb-1 text-ink-ghost">Role</h3>
            <p className="text-ink">{dossier.role}</p>
          </div>
        )}

        {dossier.profile && (
          <div>
            <h3 className="type-meta mb-1 text-ink-ghost">Profile</h3>
            <div className="prose prose-story max-w-none">
              <StoryMarkdown content={dossier.profile} />
            </div>
          </div>
        )}

        {dossier.arc && (
          <div>
            <h3 className="type-meta mb-1 text-ink-ghost">Character Arc</h3>
            <div className="prose prose-story max-w-none">
              <StoryMarkdown content={dossier.arc} />
            </div>
          </div>
        )}
      </div>

      {hasAnyDerived && (
        <>
          <hr className="my-4 border-clay-border" />
          <div className="space-y-4">
            {DERIVED_ORDER.map((field) => {
              const body = dossier[field];
              if (!body) return null;
              const meta = dossier.enrichment?.[field];
              const reviewed = meta?.reviewed ?? false;
              return (
                <div key={field}>
                  <div className="mb-1 flex items-baseline gap-2">
                    <h3 className="type-meta text-ink-ghost">
                      {DERIVED_FIELD_HEADINGS[field]}
                    </h3>
                    <span
                      className="type-meta text-[0.65rem] uppercase tracking-wide text-ink-ghost/70"
                      title={
                        meta
                          ? `AI-drafted ${meta.generated} (${meta.model})`
                          : "AI-drafted"
                      }
                    >
                      {reviewed ? "· reviewed" : "· draft"}
                    </span>
                  </div>
                  <div className="prose prose-story max-w-none">
                    <StoryMarkdown content={body} />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
