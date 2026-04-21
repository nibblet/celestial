"use client";

import Link from "next/link";
import type { WikiFictionNounEntity, WikiRuleConcept } from "@/lib/wiki/parser";
import { EntityLoreCard } from "@/components/entities/EntityLoreCard";

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
                  {entity.memoirStoryIds.length + entity.interviewStoryIds.length} refs
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
  return (
    <div className="mx-auto max-w-content px-[var(--page-padding-x)] py-6 md:py-10">
      <Link
        href={basePath}
        className="type-ui mb-4 inline-block text-ink-ghost no-underline transition-colors hover:text-ocean"
      >
        &larr; All {heading.toLowerCase()}
      </Link>
      <h1 className="type-page-title mb-2">{entity.name}</h1>
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
          <ul className="list-disc pl-5 text-sm text-ink">
            {entity.relations.map((rel, idx) => (
              <li key={`${rel.sourceSlug}-${rel.predicate}-${idx}`}>
                {rel.sourceType}:{rel.sourceSlug} {rel.predicate} {rel.targetType}:
                {rel.targetSlug}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export function RuleIndexPage({
  rules,
}: {
  rules: WikiRuleConcept[];
}) {
  return (
    <div className="mx-auto max-w-wide px-[var(--page-padding-x)] py-6 md:py-10">
      <div className="mx-auto max-w-content">
        <h1 className="type-page-title mb-2">Rules</h1>
        <p className="type-ui mb-3 text-ink-muted">
          Physical, systems, and cosmology rules inferred from chapter evidence.
        </p>
        <p className="type-meta mb-8 text-ink-ghost">{rules.length} entries</p>
        <ul className="grid list-none gap-2 sm:grid-cols-2">
          {rules.map((rule) => (
            <li key={rule.slug}>
              <Link
                href={`/rules/${rule.slug}`}
                className="group block rounded-lg border border-[var(--color-border)] bg-warm-white px-3 py-2 transition-[border-color,box-shadow] hover:border-clay-border hover:shadow-[0_4px_12px_rgba(44,28,16,0.06)]"
              >
                <span className="font-[family-name:var(--font-playfair)] text-base text-ink transition-colors group-hover:text-burgundy">
                  {rule.title}
                </span>
              </Link>
            </li>
          ))}
        </ul>
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
      <h1 className="type-page-title mb-4">{rule.title}</h1>
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
