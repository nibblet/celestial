import { StoryMarkdown } from "@/components/story/StoryMarkdown";
import type { CharacterDossier } from "@/lib/wiki/entity-dossier";

export function EntityDossier({ dossier }: { dossier: CharacterDossier }) {
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
    </section>
  );
}
