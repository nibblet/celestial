/**
 * Reference images declared by visual specs.
 *
 * A spec layer may carry a `reference_images` array. Entries inherit like
 * every other layer (parent → child, master → features → view → state) and
 * are concatenated, never replaced, so `valkyrie-crew` can attach the
 * mission patch to every crew member while each character adds their own
 * identity portrait.
 *
 * `path` is a public URL path (files live under /public, e.g.
 * "/visual-references/project-valkyrie-patch.png") or an absolute URL.
 *
 * Kept free of `server-only` so it can be unit-tested and imported by
 * client components for the shared type.
 */

export type ReferenceImageRole =
  | "identity"
  /** A relative's portrait: borrow family likeness, never copy the face. */
  | "resemblance"
  /** A previous still of this shot: same room, camera and framing; change
   *  only what the Focus asks (keyframe pairs, variations). */
  | "keyframe"
  | "insignia"
  | "wardrobe"
  | "prop"
  | "environment"
  | "style";

export type ReferenceImage = {
  path: string;
  role: ReferenceImageRole;
  label: string;
  /** How a generator should use it, e.g. "match exactly, render as embroidery". */
  instruction?: string;
};

/*
 * Spec-file entries may also carry `"inherit": false`: the reference then
 * applies only when its own entity is the subject, not to children that
 * inherit the layer via parent_entity. Valkyrie-1's hull renders use this
 * so interior specs (command-dome, sensorium…) don't receive exterior shots.
 */

const ROLES: ReadonlySet<string> = new Set([
  "identity",
  "resemblance",
  "keyframe",
  "insignia",
  "wardrobe",
  "prop",
  "environment",
  "style",
]);

/** Display / attachment order: who they are first, then what they wear. */
const ROLE_ORDER: Record<ReferenceImageRole, number> = {
  identity: 0,
  keyframe: 1,
  resemblance: 2,
  insignia: 3,
  wardrobe: 4,
  prop: 5,
  environment: 6,
  style: 7,
};

export const REFERENCE_IMAGES_KEY = "reference_images";

/**
 * Validate and collect reference images from spec layers in inheritance
 * order. Invalid entries are dropped with a warning rather than failing
 * the whole prompt. Duplicates (same path) keep the LAST occurrence so a
 * child layer can override the label or instruction of an inherited one.
 */
export function collectReferenceImages(
  layers: Array<{ name: string; data: Record<string, unknown>; inherited?: boolean }>,
): ReferenceImage[] {
  const byPath = new Map<string, ReferenceImage>();
  for (const layer of layers) {
    const raw = layer.data[REFERENCE_IMAGES_KEY];
    if (raw === undefined) continue;
    if (!Array.isArray(raw)) {
      console.warn(`[visuals/specs] ${layer.name}: reference_images must be an array`);
      continue;
    }
    for (const entry of raw) {
      if (
        layer.inherited &&
        entry &&
        typeof entry === "object" &&
        (entry as Record<string, unknown>).inherit === false
      ) {
        continue;
      }
      const ref = parseReferenceImage(entry);
      if (!ref) {
        console.warn(`[visuals/specs] ${layer.name}: invalid reference_images entry`, entry);
        continue;
      }
      byPath.delete(ref.path); // re-insert so overrides take the later position
      byPath.set(ref.path, ref);
    }
  }
  return Array.from(byPath.values()).sort(
    (a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role],
  );
}

function parseReferenceImage(entry: unknown): ReferenceImage | null {
  if (!entry || typeof entry !== "object") return null;
  const e = entry as Record<string, unknown>;
  if (typeof e.path !== "string" || !e.path.trim()) return null;
  if (typeof e.role !== "string" || !ROLES.has(e.role)) return null;
  if (typeof e.label !== "string" || !e.label.trim()) return null;
  const path = e.path.trim();
  if (!path.startsWith("/") && !/^https?:\/\//.test(path)) return null;
  return {
    path,
    role: e.role as ReferenceImageRole,
    label: e.label.trim(),
    instruction:
      typeof e.instruction === "string" && e.instruction.trim()
        ? e.instruction.trim()
        : undefined,
  };
}

/**
 * Plain-text block appended to the spec prompt so the visual director
 * writes an explicit "match the attached references" line into `raw`.
 */
export function renderReferenceImagesForPrompt(refs: ReferenceImage[]): string {
  if (refs.length === 0) return "";
  const lines = [
    "## reference images (attached to the generation by the operator)",
    "  The raw prompt MUST name each of these and tell the generator how to use it, following its instruction.",
    "  [resemblance] images are relatives: borrow family likeness only, the subject must remain a distinct person.",
    "  [keyframe] images are an earlier still of THIS shot: keep the same room, architecture, camera position, lens and framing exactly; change only what the Focus describes.",
  ];
  refs.forEach((r, i) => {
    lines.push(
      `  ${i + 1}. [${r.role}] ${r.label}${r.instruction ? ` — ${r.instruction}` : ""}`,
    );
  });
  return lines.join("\n");
}

/** OpenAI's image edits endpoint accepts at most 16 input images. */
export const MAX_SHOT_REFERENCES = 16;

/**
 * Merge references for a shot that places cast members into a target.
 * Order: each cast member's identity portrait first (so faces win), then
 * the target's own references, then cast wardrobe/insignia/props.
 * Resemblance references are dropped: in a multi-person shot a relative's
 * portrait is more likely to be mistaken for another cast member.
 * De-duplicated by path (first occurrence wins) and capped at 16.
 */
export function mergeShotReferences(
  targetRefs: ReferenceImage[],
  castRefs: ReferenceImage[][],
): ReferenceImage[] {
  const ordered: ReferenceImage[] = [
    ...castRefs.flatMap((refs) => refs.filter((r) => r.role === "identity")),
    ...targetRefs,
    ...castRefs.flatMap((refs) =>
      refs.filter((r) => r.role !== "identity" && r.role !== "resemblance"),
    ),
  ];
  const seen = new Set<string>();
  const out: ReferenceImage[] = [];
  for (const r of ordered) {
    if (seen.has(r.path)) continue;
    seen.add(r.path);
    out.push(r);
  }
  return out.slice(0, MAX_SHOT_REFERENCES);
}

/** Most operator-added references per prompt ("Use as reference"). */
export const MAX_EXTRA_REFERENCES = 4;

/**
 * Add operator-chosen references (e.g. a still to use as a keyframe) to a
 * spec-derived list. Extras go right after identity portraits so they
 * dominate composition; duplicates by path are dropped; capped at 16.
 */
export function withExtraReferences(
  refs: ReferenceImage[],
  extras: ReferenceImage[],
): ReferenceImage[] {
  const identities = refs.filter((r) => r.role === "identity");
  const rest = refs.filter((r) => r.role !== "identity");
  const seen = new Set<string>();
  const out: ReferenceImage[] = [];
  for (const r of [...identities, ...extras.slice(0, MAX_EXTRA_REFERENCES), ...rest]) {
    if (seen.has(r.path)) continue;
    seen.add(r.path);
    out.push(r);
  }
  return out.slice(0, MAX_SHOT_REFERENCES);
}

/**
 * Validate operator-supplied extra references from a request body:
 * [{path, label?, instruction?}] -> keyframe references. Path checks
 * (allowed hosts / folders) happen where the file is fetched.
 */
export function parseExtraReferences(raw: unknown): ReferenceImage[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) throw new Error("extraReferences must be an array");
  if (raw.length > MAX_EXTRA_REFERENCES) {
    throw new Error(`At most ${MAX_EXTRA_REFERENCES} extra reference images`);
  }
  return raw.map((entry, i) => {
    const e = (entry ?? {}) as Record<string, unknown>;
    const path = typeof e.path === "string" ? e.path.trim() : "";
    if (!path.startsWith("/visual-references/") && !/^https:\/\//.test(path)) {
      throw new Error(`Extra reference ${i + 1} must be an https URL or /visual-references/ path`);
    }
    const label =
      typeof e.label === "string" && e.label.trim()
        ? e.label.trim().slice(0, 80)
        : `Keyframe reference ${i + 1}`;
    const instruction =
      typeof e.instruction === "string" && e.instruction.trim()
        ? e.instruction.trim().slice(0, 300)
        : "same room, architecture, camera position, lens and framing as this image; change only what the Focus describes";
    return { path, role: "keyframe" as const, label, instruction };
  });
}
