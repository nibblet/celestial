/**
 * Visual spec — structured canon visual descriptors authored as JSON files
 * under content/wiki/specs/{entity-slug}/.
 *
 * Specs are intentionally schema-less below the top level (each layer is a
 * free-form record) so authors can describe whatever the entity needs
 * without the parser fighting them. The synthesizer reads the composed
 * spec and transcribes field values verbatim into the prompt — no
 * paraphrase, no defaults override.
 *
 * Layered composition (later layers override / extend earlier):
 *   1. master.json                           — entity-wide rules
 *   2. views/{viewName}.json                 — per-view (three_quarter, top, side, front, orthogonal, ventral)
 *   3. states/{stateName}.json               — per-state (dormant, active, alignment, harmonic_jump, glyphic, wake)
 *   4. features/*.json                       — feature scopes that always inject for the entity
 *
 * `avoid` arrays at any layer are appended to the merged result; they are
 * never replaced. This keeps preset-derived negatives compounded with
 * spec-derived ones.
 */

export type SpecLayer = Record<string, unknown>;

export type ComposedSpec = {
  /** Original entity slug. */
  entitySlug: string;
  /** Source path of each layer that contributed, for tracing. */
  layers: { name: string; path: string }[];
  /** Merged top-level fields, later layers winning. */
  merged: SpecLayer;
  /** Concatenated avoid arrays from every layer that supplied one. */
  avoid: string[];
  /** Stable hash over the composed spec — used in seed_hash so cache
   *  invalidates when the spec changes. */
  hash: string;
};

export type SpecCompositionRequest = {
  entitySlug: string;
  /** Optional view name; defaults to 'three_quarter' when not specified. */
  view?: string;
  /** Optional state name; no default — omitted when not provided. */
  state?: string;
};
