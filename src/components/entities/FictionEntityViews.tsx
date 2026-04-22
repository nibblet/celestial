import Link from "next/link";
import type {
  WikiEntityRelation,
  WikiFictionNounEntity,
  WikiRuleConcept,
} from "@/lib/wiki/parser";
import { EntityLoreCard } from "@/components/entities/EntityLoreCard";
import { CanonDossierCard } from "@/components/entities/CanonDossierCard";
import { prettifySlug } from "@/lib/wiki/canon-dossier";
import { resolveWikiSlug } from "@/lib/wiki/slug-resolver";
import { extractAuthoredBody, renderWikilinks } from "@/lib/wiki/authored-body";
import { StoryMarkdown } from "@/components/story/StoryMarkdown";

function AuthoredBody({ raw }: { raw: string | undefined | null }) {
  const body = extractAuthoredBody(raw ?? "");
  if (!body) return null;
  const rendered = renderWikilinks(body, resolveWikiSlug);
  return (
    <section className="prose prose-story mb-6 max-w-none" aria-label="Authored detail">
      <StoryMarkdown content={rendered} />
    </section>
  );
}

const ENTITY_LINK_BASE: Record<string, string> = {
  character: "/characters",
  faction: "/factions",
  location: "/locations",
  artifact: "/artifacts",
  rule: "/rules",
  vault: "/vaults",
};

function entityDetailHref(type: string, slug: string): string | null {
  const base = ENTITY_LINK_BASE[type.toLowerCase()];
  return base ? `${base}/${slug}` : null;
}

function resolveLinkLabel(type: string, slug: string): string {
  const r = resolveWikiSlug(slug);
  if (r) return r.label;
  return prettifySlug(slug);
}

function renderRefCount(entity: WikiFictionNounEntity): string {
  const refs = entity.memoirStoryIds.length + entity.interviewStoryIds.length;
  if (refs > 0) return `${refs} ${refs === 1 ? "ref" : "refs"}`;
  const mentions = entity.canonDossier?.mentions ?? 0;
  if (mentions > 0) {
    return `${mentions} ${mentions === 1 ? "mention" : "mentions"}`;
  }
  return "0 refs";
}

function WikiRelationLines({ relations }: { relations: WikiEntityRelation[] }) {
  return (
    <ul className="list-none space-y-2 text-sm text-ink">
      {relations.map((rel, idx) => {
        const srcHref = entityDetailHref(rel.sourceType, rel.sourceSlug);
        const tgtHref = entityDetailHref(rel.targetType, rel.targetSlug);
        return (
          <li key={`${rel.sourceSlug}-${rel.predicate}-${idx}`}>
            {srcHref ? (
              <Link href={srcHref} className="hover:text-ocean">
                {resolveLinkLabel(rel.sourceType, rel.sourceSlug)}
              </Link>
            ) : (
              <span>{rel.sourceType}:{rel.sourceSlug}</span>
            )}
            <span className="text-ink-muted"> {rel.predicate} </span>
            {tgtHref ? (
              <Link href={tgtHref} className="hover:text-ocean">
                {resolveLinkLabel(rel.targetType, rel.targetSlug)}
              </Link>
            ) : (
              <span>{rel.targetType}:{rel.targetSlug}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
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
                        className="group flex items-baseline justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-warm-white px-3 py-2 transition-[border-color,box-shadow] hover:border-clay-border hover:shadow-[0_4px_12px_rgba(44,28,16,0.06)]"
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
                className="group flex items-baseline justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-warm-white px-3 py-2 transition-[border-color,box-shadow] hover:border-clay-border hover:shadow-[0_4px_12px_rgba(44,28,16,0.06)]"
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

export function FictionEntityDetailPage({
  entity,
  heading,
  basePath,
}: {
  entity: WikiFictionNounEntity;
  heading: string;
  basePath: string;
}) {
  const supersetResolved = entity.lore?.superset
    ? resolveWikiSlug(entity.lore.superset.slug)
    : null;

  return (
    <div className="mx-auto max-w-content px-[var(--page-padding-x)] py-6 md:py-10">
      <Link
        href={basePath}
        className="type-ui mb-4 inline-block text-ink-ghost no-underline transition-colors hover:text-ocean"
      >
        &larr; All {heading.toLowerCase()}
      </Link>
      <h1 className="type-page-title mb-2">{entity.name}</h1>
      {entity.entityType === "fiction_locations" && supersetResolved && (
        <p className="type-ui mb-4 text-ink-muted">
          <span className="text-ink-ghost">Within </span>
          <Link href={supersetResolved.href} className="hover:text-ocean">
            {supersetResolved.label}
          </Link>
        </p>
      )}
      {entity.canonDossier && <CanonDossierCard dossier={entity.canonDossier} />}
      <AuthoredBody raw={entity.body} />
      {entity.lore && <EntityLoreCard lore={entity.lore} />}
      {entity.note && <p className="type-ui mb-4 text-ink-muted">{entity.note}</p>}
      {entity.memoirStoryIds.length > 0 && (
        <section className="mb-6">
          <h2 className="type-meta mb-2 text-ink">Appearances</h2>
          <ul className="list-disc pl-5 text-sm text-ink">
            {entity.memoirStoryIds.map((id) => (
              <li key={id}>
                <Link href={`/stories/${id}`} className="hover:text-ocean">
                  {id}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {entity.interviewStoryIds.length > 0 && (
        <section className="mb-6">
          <h2 className="type-meta mb-2 text-ink">Additional appearances</h2>
          <ul className="list-disc pl-5 text-sm text-ink">
            {entity.interviewStoryIds.map((id) => (
              <li key={id}>
                <Link href={`/stories/${id}`} className="hover:text-ocean">
                  {id}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {entity.relations.length > 0 && (
        <section className="mb-6">
          <h2 className="type-meta mb-2 text-ink">Related</h2>
          <WikiRelationLines relations={entity.relations} />
        </section>
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
        className="group flex items-baseline justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-warm-white px-3 py-2 transition-[border-color,box-shadow] hover:border-clay-border hover:shadow-[0_4px_12px_rgba(44,28,16,0.06)]"
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
      <Link
        href="/rules"
        className="type-ui mb-4 inline-block text-ink-ghost no-underline transition-colors hover:text-ocean"
      >
        &larr; All rules
      </Link>
      <h1 className="type-page-title mb-2">{rule.title}</h1>
      {rule.lore?.status && (
        <p className="type-ui mb-4 text-ink-muted">
          <span className="text-ink-ghost">Status: </span>
          {STATUS_CHIP_LABELS[rule.lore.status] ?? rule.lore.status}
        </p>
      )}
      {rule.canonDossier && <CanonDossierCard dossier={rule.canonDossier} />}
      <AuthoredBody raw={rule.body} />
      {rule.lore && <EntityLoreCard lore={rule.lore} />}
      {rule.thesis && <p className="type-ui mb-6 text-ink">{rule.thesis}</p>}
      {rule.examples.length > 0 && (
        <section className="mb-6">
          <h2 className="type-meta mb-2 text-ink">Examples</h2>
          <ul className="list-disc pl-5 text-sm text-ink">
            {rule.examples.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      )}
      {rule.exceptions.length > 0 && (
        <section className="mb-6">
          <h2 className="type-meta mb-2 text-ink">Exceptions</h2>
          <ul className="list-disc pl-5 text-sm text-ink">
            {rule.exceptions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      )}
      {rule.relatedRules.length > 0 && (
        <section className="mb-6">
          <h2 className="type-meta mb-2 text-ink">Related rules</h2>
          <ul className="list-disc pl-5 text-sm text-ink">
            {rule.relatedRules.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
