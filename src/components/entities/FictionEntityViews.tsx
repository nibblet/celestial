import Link from "next/link";
import type {
  WikiFictionNounEntity,
  WikiRuleConcept,
} from "@/lib/wiki/parser";
import { prettifySlug } from "@/lib/wiki/canon-dossier";
import { resolveWikiSlug } from "@/lib/wiki/slug-resolver";
import { listEntityVisuals } from "@/lib/visuals/list-entity-assets";
import { EntityVisualsGallery } from "@/components/visuals/EntityVisualsGallery";
import { getAuthenticatedProfileContext } from "@/lib/auth/profile-context";
import { CodexLocked, getCodexLock } from "@/components/entities/CodexGate";
import type { CodexKind } from "@/lib/wiki/codex";
import { ChapterRecord } from "@/components/archive/ChapterRecord";
import {
  AskAboutFile,
  AuthorProvenance,
  FileLede,
  LinkedFiles,
} from "@/components/archive/FileSections";
import { linkedFiles } from "@/lib/archive/file-page";
import { shortName, splitLede } from "@/lib/archive/file-summary";
import { getChapterRecord } from "@/lib/archive/record";
import {
  getLastChapterNumber,
  getReaderProgress,
  isStoryUnlocked,
} from "@/lib/progress/reader-progress";

const ENTITY_TYPE_TO_CODEX_KIND: Record<string, CodexKind> = {
  fiction_characters: "characters",
  fiction_artifacts: "artifacts",
  fiction_locations: "locations",
  fiction_factions: "factions",
  fiction_vaults: "vaults",
};

function renderRefCount(entity: WikiFictionNounEntity): string {
  const refs = entity.memoirStoryIds.length + entity.interviewStoryIds.length;
  if (refs > 0) return `${refs} ${refs === 1 ? "ref" : "refs"}`;
  const mentions = entity.canonDossier?.mentions ?? 0;
  if (mentions > 0) {
    return `${mentions} ${mentions === 1 ? "mention" : "mentions"}`;
  }
  return "0 refs";
}

/** Locations index grouped by lore `Superset:` (hub within superset — decision 3A). */
export function LocationsHubPage({
  entities,
}: {
  entities: WikiFictionNounEntity[];
}) {
  const buckets = new Map<string, WikiFictionNounEntity[]>();
  for (const e of entities) {
    const sup = e.lore?.superset;
    const key = sup ? `${sup.type}:${sup.slug}` : "_root";
    const list = buckets.get(key) ?? [];
    list.push(e);
    buckets.set(key, list);
  }
  for (const list of buckets.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }
  const rankKey = (key: string): number => {
    if (key === "_root") return 100;
    if (key === "artifact:valkyrie-1") return 10;
    if (key.startsWith("location:")) return 1;
    return 50;
  };
  const orderedKeys = [...buckets.keys()].sort((a, b) => {
    const ra = rankKey(a);
    const rb = rankKey(b);
    if (ra !== rb) return ra - rb;
    return a.localeCompare(b);
  });

  return (
    <div className="mx-auto max-w-wide px-[var(--page-padding-x)] py-6 md:py-10">
      <div className="mx-auto max-w-content">
        <h1 className="type-page-title mb-2">Locations</h1>
        <p className="type-ui mb-3 text-ink-muted">
          Places that carry strategic, emotional, and historical weight — grouped by
          parent region or structure when a superset is set in lore metadata.
        </p>
        <p className="type-meta mb-10 text-ink-ghost">{entities.length} entries</p>
        <div className="space-y-12">
          {orderedKeys.map((key) => {
            const group = buckets.get(key)!;
            const [typePart, slugPart] = key === "_root" ? ["", ""] : key.split(":") as [string, string];
            const title =
              key === "_root"
                ? "Places (top-level)"
                : typePart === "artifact" && slugPart === "valkyrie-1"
                  ? "Aboard Valkyrie-1"
                  : resolveWikiSlug(slugPart)?.label ?? prettifySlug(slugPart);
            return (
              <section key={key} aria-labelledby={`loc-hub-${key.replace(":", "-")}`}>
                <h2
                  id={`loc-hub-${key.replace(":", "-")}`}
                  className="type-meta mb-4 border-b border-[var(--color-border)] pb-2 text-ink"
                >
                  {title}
                </h2>
                <ul className="grid list-none gap-2 sm:grid-cols-2">
                  {group.map((entity) => (
                    <li key={entity.slug}>
                      <Link
                        href={`/locations/${entity.slug}`}
                        className="sci-panel sci-card-link group flex items-baseline justify-between gap-3 px-3 py-2"
                      >
                        <span className="font-[family-name:var(--font-playfair)] text-base text-ink transition-colors group-hover:text-burgundy">
                          {entity.name}
                        </span>
                        <span className="type-meta shrink-0 normal-case tracking-normal text-ink-ghost">
                          {renderRefCount(entity)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function FictionEntityIndexPage({
  title,
  description,
  basePath,
  entities,
}: {
  title: string;
  description: string;
  basePath: string;
  entities: WikiFictionNounEntity[];
}) {
  return (
    <div className="mx-auto max-w-wide px-[var(--page-padding-x)] py-6 md:py-10">
      <div className="mx-auto max-w-content">
        <h1 className="type-page-title mb-2">{title}</h1>
        <p className="type-ui mb-3 text-ink-muted">{description}</p>
        <p className="type-meta mb-8 text-ink-ghost">{entities.length} entries</p>
        <ul className="grid list-none gap-2 sm:grid-cols-2">
          {entities.map((entity) => (
            <li key={entity.slug}>
              <Link
                href={`${basePath}/${entity.slug}`}
                className="sci-panel sci-card-link group flex items-baseline justify-between gap-3 px-3 py-2"
              >
                <span className="font-[family-name:var(--font-playfair)] text-base text-ink transition-colors group-hover:text-burgundy">
                  {entity.name}
                </span>
                <span className="type-meta shrink-0 normal-case tracking-normal text-ink-ghost">
                  {renderRefCount(entity)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export async function FictionEntityDetailPage({
  entity,
  basePath,
}: {
  entity: WikiFictionNounEntity;
  /** Kept for callers; the Codex bar above the page is the way back. */
  heading?: string;
  basePath: string;
}) {
  const lock = await getCodexLock(
    ENTITY_TYPE_TO_CODEX_KIND[entity.entityType] ?? "characters",
    entity.slug
  );
  if (lock) return <CodexLocked progress={lock} />;

  const supersetResolved = entity.lore?.superset
    ? resolveWikiSlug(entity.lore.superset.slug)
    : null;
  const visuals = await listEntityVisuals(entity.slug);
  const { isAuthorSpecialAccess } = await getAuthenticatedProfileContext();
  const progress = await getReaderProgress();
  const bookFinished =
    progress.showAllContent ||
    progress.currentChapterNumber >= getLastChapterNumber();
  const codexKind = ENTITY_TYPE_TO_CODEX_KIND[entity.entityType] ?? "characters";

  // The dossier prose covers the whole book, so it waits for the end.
  const { lede, rest } = bookFinished
    ? splitLede(entity.canonDossier?.primaryProse || entity.dossier?.profile)
    : { lede: "", rest: "" };
  const record = getChapterRecord(codexKind, entity.slug, progress);
  const files = linkedFiles(
    entity.canonDossier,
    entity.relations.flatMap((rel) => [rel.sourceSlug, rel.targetSlug]),
    progress,
    [`${basePath}/${entity.slug}`]
  );
  const name = shortName(entity.name);
  const questions = bookFinished
    ? [`Why does ${name} matter to the story?`, `What happens at or around ${name}?`]
    : record.length > 0
    ? [`What do we know about ${name} so far?`]
    : [];
  // Untagged files have no chapter record; fall back to where they appear.
  const appearsIn =
    record.length === 0
      ? [...entity.memoirStoryIds, ...entity.interviewStoryIds].filter((id) =>
          isStoryUnlocked(id, progress)
        )
      : [];

  return (
    <div className="mx-auto max-w-content px-[var(--page-padding-x)] py-6 md:py-10">
      <h1 className="type-page-title">{entity.name}</h1>
      {entity.entityType === "fiction_locations" && supersetResolved ? (
        <p className="mb-6 mt-1 text-sm text-ink-muted">
          Within{" "}
          <Link href={supersetResolved.href} className="text-ocean no-underline">
            {supersetResolved.label}
          </Link>
        </p>
      ) : (
        <div className="mb-6" />
      )}
      <EntityVisualsGallery
        visuals={visuals}
        entityName={entity.name}
        canEdit={isAuthorSpecialAccess}
      />
      <FileLede lede={lede} more={[rest]} />
      <ChapterRecord entries={record} partial={!bookFinished} />
      {appearsIn.length > 0 ? (
        <LinkedFiles
          files={appearsIn.map((id) => ({ href: `/stories/${id}`, label: id }))}
        />
      ) : null}
      <LinkedFiles files={files} />
      <AskAboutFile questions={questions} />
      {isAuthorSpecialAccess && (
        <AuthorProvenance
          dossier={entity.canonDossier}
          lore={entity.lore}
          note={entity.note}
        />
      )}
    </div>
  );
}

function ruleSubkind(rule: WikiRuleConcept): string | null {
  return (
    rule.canonDossier?.subkind ?? rule.lore?.subkind ?? null
  )?.toLowerCase() ?? null;
}

const STATUS_CHIP_LABELS: Record<string, string> = {
  fully_manifested: "Fully manifested",
  soft: "Soft",
  fragment: "Fragment",
  foreshadowed: "Foreshadowed",
  cataloged: "Cataloged",
};

function RuleRow({ rule }: { rule: WikiRuleConcept }) {
  const status = rule.lore?.status;
  return (
    <li>
      <Link
        href={`/rules/${rule.slug}`}
        className="sci-panel sci-card-link group flex items-baseline justify-between gap-3 px-3 py-2"
      >
        <span className="font-[family-name:var(--font-playfair)] text-base text-ink transition-colors group-hover:text-burgundy">
          {rule.title}
        </span>
        {status && (
          <span className="type-meta shrink-0 normal-case tracking-normal text-ink-ghost">
            {STATUS_CHIP_LABELS[status] ?? status}
          </span>
        )}
      </Link>
    </li>
  );
}

export function RuleIndexPage({
  rules,
}: {
  rules: WikiRuleConcept[];
}) {
  const parables = rules.filter((r) => ruleSubkind(r) === "parable");
  const coreRules = rules.filter((r) => ruleSubkind(r) !== "parable");

  return (
    <div className="mx-auto max-w-wide px-[var(--page-padding-x)] py-6 md:py-10">
      <div className="mx-auto max-w-content">
        <h1 className="type-page-title mb-2">Rules</h1>
        <p className="type-ui mb-3 text-ink-muted">
          Physical, systems, and cosmology rules — and the Parables of Resonance
          that carry their moral weight.
        </p>
        <p className="type-meta mb-8 text-ink-ghost">{rules.length} entries</p>

        <section aria-labelledby="rules-core" className="mb-12">
          <h2
            id="rules-core"
            className="type-meta mb-4 border-b border-[var(--color-border)] pb-2 text-ink"
          >
            Rules ({coreRules.length})
          </h2>
          <ul className="grid list-none gap-2 sm:grid-cols-2">
            {coreRules.map((rule) => (
              <RuleRow key={rule.slug} rule={rule} />
            ))}
          </ul>
        </section>

        {parables.length > 0 && (
          <section aria-labelledby="rules-parables">
            <h2
              id="rules-parables"
              className="type-meta mb-2 border-b border-[var(--color-border)] pb-2 text-ink"
            >
              Parables of Resonance ({parables.length})
            </h2>
            <p className="type-ui mb-4 text-ink-muted">
              Symbolic vision-events — a subset of Rules. Each parable carries a
              manifestation status on the Parable Catalog.
            </p>
            <ul className="grid list-none gap-2 sm:grid-cols-2">
              {parables.map((rule) => (
                <RuleRow key={rule.slug} rule={rule} />
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

export function RuleDetailPage({ rule }: { rule: WikiRuleConcept }) {
  return (
    <div className="mx-auto max-w-content px-[var(--page-padding-x)] py-6 md:py-10">
      <h1 className="type-page-title mb-2">{rule.title}</h1>
      {rule.lore?.status && (
        <p className="type-ui mb-4 text-ink-muted">
          <span className="text-ink-ghost">Status: </span>
          {STATUS_CHIP_LABELS[rule.lore.status] ?? rule.lore.status}
        </p>
      )}
      {(() => {
        const { lede, rest } = splitLede(
          rule.thesis || rule.canonDossier?.primaryProse
        );
        return <FileLede lede={lede} more={[rest, ...rule.examples]} />;
      })()}
      <AskAboutFile
        questions={[
          `How does ${shortName(rule.title)} work?`,
          `Where does ${shortName(rule.title)} show up in the story?`,
        ]}
      />
    </div>
  );
}
