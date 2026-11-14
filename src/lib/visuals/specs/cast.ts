/**
 * "Characters in shot": the people placed into a location (or any other)
 * target, each with an optional wardrobe state.
 *
 * Kept free of `server-only` so parsing can be unit-tested and the type
 * shared with the admin console.
 */

export type CastMember = {
  /** Spec / wiki slug, e.g. "galen-voss". */
  id: string;
  /** Optional spec state, e.g. "mars_surface". */
  state?: string;
};

export const MAX_CAST = 6;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const STATE = /^[a-z0-9]+(?:[_-][a-z0-9]+)*$/;

/**
 * Parse "galen-voss:mars_surface, aven-voss" (or an array of the same
 * strings / objects) into a de-duplicated cast list. Throws with a
 * readable message on anything malformed so the console can show it.
 */
export function parseCast(input: unknown): CastMember[] {
  if (input === undefined || input === null || input === "") return [];
  const items: unknown[] = Array.isArray(input)
    ? input
    : typeof input === "string"
      ? input.split(/[,\n]/)
      : [input];

  const seen = new Set<string>();
  const out: CastMember[] = [];
  for (const raw of items) {
    let id: string;
    let state: string | undefined;
    if (typeof raw === "string") {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      const [a, b, ...rest] = trimmed.split(":").map((s) => s.trim());
      if (rest.length > 0) throw new Error(`Couldn't read cast entry "${trimmed}"`);
      id = a;
      state = b || undefined;
    } else if (raw && typeof raw === "object") {
      const r = raw as Record<string, unknown>;
      id = typeof r.id === "string" ? r.id.trim() : "";
      state = typeof r.state === "string" && r.state.trim() ? r.state.trim() : undefined;
    } else {
      throw new Error("Cast entries must be text like galen-voss:mars_surface");
    }
    if (!SLUG.test(id)) throw new Error(`"${id}" isn't a character slug (e.g. galen-voss)`);
    if (state && !STATE.test(state)) throw new Error(`"${state}" isn't a valid state name`);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(state ? { id, state } : { id });
  }
  if (out.length > MAX_CAST) {
    throw new Error(`At most ${MAX_CAST} characters per shot`);
  }
  return out;
}

/** Stable string for cache keys: "aven-voss:mars_surface,galen-voss:mars_surface". */
export function castKey(cast: CastMember[]): string {
  return cast
    .map((c) => `${c.id}:${c.state ?? ""}`)
    .sort()
    .join(",");
}
