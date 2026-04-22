/**
 * Continuity diff module.
 *
 * Compares two snapshots of the canon (entities + chapter themes) and
 * surfaces typed contradictions. The CLI in scripts/review-ingestion.ts
 * builds fresh snapshots after each ingest and persists one at
 * content/raw/.continuity/last-snapshot.json for the next run to diff
 * against.
 *
 * Four contradiction variants are recognised:
 *
 *   alias_moved             — a string that used to be an alias of A is
 *                             now an alias of B. Almost always a bug in
 *                             either the old pass or the new one; gates
 *                             CI in the CLI.
 *   entity_vanished         — an entity we saw last time is gone. Either
 *                             a legitimate rename (then an alias_moved
 *                             should also fire) or an ingestion regression.
 *   relation_flipped        — a structural relation changed. In this
 *                             prototype we watch `kind` (characters ↔
 *                             artifacts ↔ locations etc.) and `parentSlug`.
 *                             `predicate` names which relation moved.
 *   chapter_theme_changed   — the `**Themes:**` line on a chapter wiki
 *                             file reordered or changed.
 *
 * Snapshots are pure data — no Supabase access, no fs access. Makes this
 * trivial to unit-test and cheap to run from any script.
 */

// ── Snapshot types ─────────────────────────────────────────────────

export type EntitySnapshot = {
  canonicalSlug: string;
  kind: string;
  parentSlug: string | null;
  aliases: string[];
  /** Distinct source documents the entity was last observed in. Tracked
   *  mostly for the human-readable review report; not used in diffing. */
  lastSeenIn: string[];
};

export type ChapterSnapshot = {
  themes: string[];
};

export type CanonSnapshot = {
  schemaVersion: 1;
  generatedAt: string;
  entities: Record<string, EntitySnapshot>;
  chapters: Record<string, ChapterSnapshot>;
};

// ── Contradiction types ────────────────────────────────────────────

export type Contradiction =
  | {
      kind: "alias_moved";
      alias: string;
      fromSlug: string;
      toSlug: string;
    }
  | {
      kind: "entity_vanished";
      slug: string;
    }
  | {
      kind: "relation_flipped";
      subject: string;
      predicate: "kind" | "parentSlug";
      before: string;
      after: string;
    }
  | {
      kind: "chapter_theme_changed";
      storyId: string;
      before: string[];
      after: string[];
    };

// ── Diff ───────────────────────────────────────────────────────────

function buildAliasIndex(
  entities: Record<string, EntitySnapshot>,
): Map<string, string> {
  // alias (lowercased) → canonicalSlug. Lower-cased to catch casing-only
  // shifts ("Rigel Ascendant" vs "rigel ascendant") as the same alias.
  const map = new Map<string, string>();
  for (const [slug, entity] of Object.entries(entities)) {
    for (const alias of entity.aliases) {
      const key = alias.trim().toLowerCase();
      if (!key) continue;
      // Collisions within a single snapshot are possible (two entities
      // claiming the same alias) — that's a local contradiction we don't
      // flag here because the diff's contract is *change*. The first
      // writer wins; ingestion should already be surfacing this.
      if (!map.has(key)) map.set(key, slug);
    }
  }
  return map;
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Returns every contradiction introduced between `previous` and `current`.
 * `previous = null` means first run — returns [].
 *
 * Output ordering is stable: variant order above, then subject slug A→Z.
 */
export function diffCanonSnapshots(
  previous: CanonSnapshot | null,
  current: CanonSnapshot,
): Contradiction[] {
  if (!previous) return [];

  const out: Contradiction[] = [];

  // ── alias_moved ─────────────────────────────────────────────────
  const prevAliases = buildAliasIndex(previous.entities);
  const currAliases = buildAliasIndex(current.entities);
  const aliasMoved: Contradiction[] = [];
  for (const [alias, prevSlug] of prevAliases.entries()) {
    const currSlug = currAliases.get(alias);
    if (currSlug && currSlug !== prevSlug) {
      aliasMoved.push({
        kind: "alias_moved",
        alias,
        fromSlug: prevSlug,
        toSlug: currSlug,
      });
    }
  }
  aliasMoved.sort((a, b) =>
    a.kind === "alias_moved" && b.kind === "alias_moved"
      ? a.alias.localeCompare(b.alias)
      : 0,
  );
  out.push(...aliasMoved);

  // ── entity_vanished ─────────────────────────────────────────────
  const vanished: Contradiction[] = [];
  for (const slug of Object.keys(previous.entities)) {
    if (!current.entities[slug]) {
      vanished.push({ kind: "entity_vanished", slug });
    }
  }
  vanished.sort((a, b) =>
    a.kind === "entity_vanished" && b.kind === "entity_vanished"
      ? a.slug.localeCompare(b.slug)
      : 0,
  );
  out.push(...vanished);

  // ── relation_flipped (kind, parentSlug) ─────────────────────────
  const relationFlipped: Contradiction[] = [];
  for (const [slug, prevEntity] of Object.entries(previous.entities)) {
    const currEntity = current.entities[slug];
    if (!currEntity) continue; // covered by entity_vanished
    if (prevEntity.kind !== currEntity.kind) {
      relationFlipped.push({
        kind: "relation_flipped",
        subject: slug,
        predicate: "kind",
        before: prevEntity.kind,
        after: currEntity.kind,
      });
    }
    const prevParent = prevEntity.parentSlug ?? "";
    const currParent = currEntity.parentSlug ?? "";
    if (prevParent !== currParent) {
      relationFlipped.push({
        kind: "relation_flipped",
        subject: slug,
        predicate: "parentSlug",
        before: prevParent,
        after: currParent,
      });
    }
  }
  relationFlipped.sort((a, b) =>
    a.kind === "relation_flipped" && b.kind === "relation_flipped"
      ? a.subject.localeCompare(b.subject) ||
        a.predicate.localeCompare(b.predicate)
      : 0,
  );
  out.push(...relationFlipped);

  // ── chapter_theme_changed ───────────────────────────────────────
  const themeChanged: Contradiction[] = [];
  for (const [storyId, prevChapter] of Object.entries(previous.chapters)) {
    const currChapter = current.chapters[storyId];
    if (!currChapter) continue; // chapters vanishing isn't in the typed union
    if (!arraysEqual(prevChapter.themes, currChapter.themes)) {
      themeChanged.push({
        kind: "chapter_theme_changed",
        storyId,
        before: prevChapter.themes,
        after: currChapter.themes,
      });
    }
  }
  themeChanged.sort((a, b) =>
    a.kind === "chapter_theme_changed" && b.kind === "chapter_theme_changed"
      ? a.storyId.localeCompare(b.storyId)
      : 0,
  );
  out.push(...themeChanged);

  return out;
}

// ── CI gate helper ─────────────────────────────────────────────────

/**
 * Contradictions that should fail CI. Plan calls out alias_moved and
 * relation_flipped as the two that break AI consumers (the corpus
 * answers a query with now-wrong identity). Theme drift and entity
 * vanishing are advisory — surfaced in the report but don't block.
 */
export function isBlocking(c: Contradiction): boolean {
  return c.kind === "alias_moved" || c.kind === "relation_flipped";
}
