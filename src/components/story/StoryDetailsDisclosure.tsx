import Link from "next/link";
import type { StorySource } from "@/lib/wiki/parser";
import type { SourceTypeV1 } from "@/lib/wiki/taxonomy";
import { SourceBadge } from "@/components/ui/SourceBadge";
import { ThemePillLink } from "@/components/themes/ThemePillLink";
import type {
  ChapterTagRecord,
  ChapterTagKind,
  ChapterTagRef,
  CharacterPresence,
} from "@/lib/wiki/chapter-tags";
import { routeForKind } from "@/lib/wiki/chapter-tags";

interface StoryDetailsDisclosureProps {
  source: StorySource;
  sourceType: SourceTypeV1;
  lifeStage: string;
  themes: string[];
  /** Curated chapter tag record from content/raw/chapter_tags.json; pass null for non-chapters. */
  chapterTags?: ChapterTagRecord | null;
}

const PRESENCE_ORDER: Record<CharacterPresence, number> = {
  lead: 0,
  supporting: 1,
  mentioned: 2,
};

function titleCase(slug: string): string {
  return slug
    .split("-")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ""))
    .join(" ");
}

export function StoryDetailsDisclosure({
  source,
  sourceType,
  lifeStage,
  themes,
  chapterTags,
}: StoryDetailsDisclosureProps) {
  // Prefer the chapter tagger's themes when present — they're grounded in the
  // chapter body and more specific than the legacy story frontmatter themes.
  const displayThemes =
    chapterTags?.themes && chapterTags.themes.length > 0
      ? chapterTags.themes
      : themes;

  const hasTags =
    Boolean(chapterTags) &&
    (chapterTags!.summary.trim().length > 0 ||
      chapterTags!.characters.length > 0 ||
      chapterTags!.rules.length > 0 ||
      chapterTags!.locations.length > 0 ||
      chapterTags!.vaults.length > 0 ||
      chapterTags!.artifacts.length > 0 ||
      chapterTags!.factions.length > 0);

  const hasAnyMeta =
    Boolean(lifeStage || displayThemes.length > 0) ||
    sourceType !== "book_i_chapter" ||
    hasTags;
  if (!hasAnyMeta) return null;

  return (
    <details className="group mb-5 border-t border-[var(--color-divider)] pt-3 [&>summary]:list-none">
      <summary className="type-ui flex cursor-pointer select-none items-center gap-1.5 text-ink-ghost transition-colors hover:text-ink [&::-webkit-details-marker]:hidden">
        <span>Details</span>
        <span
          aria-hidden="true"
          className="inline-block transition-transform group-open:rotate-180"
        >
          &#9662;
        </span>
      </summary>

      <div className="mt-3 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <SourceBadge sourceType={sourceType} legacySource={source} />
          {lifeStage && (
            <span className="type-meta text-ink-ghost">{lifeStage}</span>
          )}
        </div>

        {chapterTags && chapterTags.summary && (
          <p className="font-[family-name:var(--font-lora)] text-sm italic leading-relaxed text-ink-muted">
            {chapterTags.summary}
          </p>
        )}

        {displayThemes.length > 0 && (
          <div>
            <p className="type-meta mb-2 text-ink-ghost">Themes</p>
            <div className="flex flex-wrap gap-2">
              {displayThemes.map((theme) => (
                <ThemePillLink
                  key={theme}
                  href={`/themes/${theme.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {theme}
                </ThemePillLink>
              ))}
            </div>
          </div>
        )}

        {chapterTags && (
          <ChapterTagSections chapterTags={chapterTags} />
        )}
      </div>
    </details>
  );
}

function ChapterTagSections({
  chapterTags,
}: {
  chapterTags: ChapterTagRecord;
}) {
  const sections: Array<{
    label: string;
    kind: ChapterTagKind;
    items: ChapterTagRef[];
  }> = [
    {
      label: "Characters",
      kind: "characters",
      items: [...chapterTags.characters].sort(
        (a, b) => PRESENCE_ORDER[a.presence] - PRESENCE_ORDER[b.presence],
      ),
    },
    { label: "Rules & parables", kind: "rules", items: chapterTags.rules },
    { label: "Locations", kind: "locations", items: chapterTags.locations },
    { label: "Vaults", kind: "vaults", items: chapterTags.vaults },
    { label: "Artifacts", kind: "artifacts", items: chapterTags.artifacts },
    { label: "Factions", kind: "factions", items: chapterTags.factions },
  ];

  return (
    <div className="space-y-3 border-t border-[var(--color-divider)] pt-3">
      {sections
        .filter((s) => s.items.length > 0)
        .map((section) => (
          <TagSection
            key={section.kind}
            label={section.label}
            kind={section.kind}
            items={section.items}
          />
        ))}
    </div>
  );
}

function TagSection({
  label,
  kind,
  items,
}: {
  label: string;
  kind: ChapterTagKind;
  items: ChapterTagRef[];
}) {
  const route = routeForKind(kind);
  return (
    <div>
      <p className="type-meta mb-2 text-ink-ghost">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <EntityPill
            key={`${kind}:${item.slug}`}
            href={`/${route}/${item.slug}`}
            label={titleCase(item.slug)}
            title={item.justification}
            trailing={
              kind === "characters" && "presence" in item
                ? (item as ChapterTagRef & { presence: CharacterPresence })
                    .presence
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}

function EntityPill({
  href,
  label,
  title,
  trailing,
}: {
  href: string;
  label: string;
  title: string;
  trailing?: CharacterPresence;
}) {
  return (
    <Link
      href={href}
      title={title}
      className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-warm-white px-2.5 py-0.5 text-xs text-ink-muted transition-colors hover:border-ocean/50 hover:bg-ocean-pale/30 hover:text-ink"
    >
      <span>{label}</span>
      {trailing && trailing !== "supporting" && (
        <span
          className={
            trailing === "lead"
              ? "rounded-full bg-clay/15 px-1.5 text-[10px] uppercase tracking-wide text-clay"
              : "text-[10px] uppercase tracking-wide text-ink-ghost"
          }
        >
          {trailing === "lead" ? "lead" : "mentioned"}
        </span>
      )}
    </Link>
  );
}
