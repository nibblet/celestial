import { ChapterRecord } from "@/components/archive/ChapterRecord";
import {
  AskAboutFile,
  AuthorProvenance,
  FileLede,
  FileRelationships,
  LinkedFiles,
} from "@/components/archive/FileSections";
import { linkedFiles, relationshipRows } from "@/lib/archive/file-page";
import { shortName, splitLede } from "@/lib/archive/file-summary";
import { getChapterRecord } from "@/lib/archive/record";
import { notFound } from "next/navigation";
import { getPersonBySlug } from "@/lib/wiki/parser";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedProfileContext } from "@/lib/auth/profile-context";
import { PersonEditDrawer } from "@/components/people/PersonEditDrawer";
import { PersonMediaPanel } from "@/components/people/PersonMediaPanel";
import { getReaderProgress } from "@/lib/progress/reader-progress";
import { CodexLocked, getCodexLock } from "@/components/entities/CodexGate";
import { getLastChapterNumber } from "@/lib/progress/reader-progress";
import { listEntityVisuals } from "@/lib/visuals/list-entity-assets";
import { EntityVisualsGallery } from "@/components/visuals/EntityVisualsGallery";

export default async function CharacterDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const person = getPersonBySlug(slug);
  if (!person) notFound();

  const lock = await getCodexLock("characters", slug);
  if (lock) return <CodexLocked progress={lock} />;

  const supabase = await createClient();
  const { data: dbPerson } = await supabase
    .from("sb_people")
    .select("id, slug, display_name, relationship, bio_md, birth_year, death_year, updated_at")
    .eq("slug", slug)
    .maybeSingle();

  const { isAuthorSpecialAccess } = await getAuthenticatedProfileContext();
  const progress = await getReaderProgress();
  const bookFinished =
    progress.showAllContent ||
    progress.currentChapterNumber >= getLastChapterNumber();
  const visuals = await listEntityVisuals(slug);

  const name = dbPerson?.display_name || person.name;
  const first = shortName(name, true);
  const dossier = person.dossier;

  // The summary and relationship lines span the whole book, so a reader who
  // is mid-book gets the role, the people already met and the record so far.
  const { lede, rest } = bookFinished
    ? splitLede(
        dbPerson?.bio_md || dossier?.profile || person.canonDossier?.primaryProse
      )
    : { lede: "", rest: "" };
  const more = bookFinished ? [rest, dossier?.arc ?? "", dossier?.voice ?? ""] : [];
  const relationships = relationshipRows(dossier?.relationships, progress, bookFinished);
  const record = getChapterRecord("characters", slug, progress);
  const files = linkedFiles(
    person.canonDossier,
    [],
    progress,
    [`/characters/${slug}`, ...relationships.map((r) => r.href)]
  );
  const questions = bookFinished
    ? [
        `What are ${first}'s defining moments?`,
        `How does ${first} change over the book?`,
        `How does ${first} speak and carry themselves?`,
      ]
    : record.length > 0
    ? [`What do we know about ${first} so far?`]
    : [];

  return (
    <div className="mx-auto max-w-content px-[var(--page-padding-x)] py-6 md:py-10">
      <div className="flex items-start justify-between gap-4">
        <h1 className="type-page-title">{name}</h1>
        {isAuthorSpecialAccess && dbPerson && (
          <PersonEditDrawer
            person={dbPerson}
            aiDraftFallback={person.aiDraft || undefined}
          />
        )}
      </div>
      {dossier?.role ? (
        <p className="mb-6 mt-1 text-sm text-ink-muted">{dossier.role}</p>
      ) : (
        <div className="mb-6" />
      )}

      <EntityVisualsGallery
        visuals={visuals}
        entityName={name}
        canEdit={isAuthorSpecialAccess}
      />

      <FileLede lede={lede} more={more} />
      <FileRelationships rows={relationships} />
      <ChapterRecord entries={record} partial={!bookFinished} />
      <LinkedFiles files={files} />
      <AskAboutFile questions={questions} />

      {isAuthorSpecialAccess && dbPerson && (
        <div className="mb-6">
          <PersonMediaPanel personId={dbPerson.id} canEdit />
        </div>
      )}
      {isAuthorSpecialAccess && (
        <AuthorProvenance dossier={person.canonDossier} lore={person.lore} />
      )}
    </div>
  );
}
