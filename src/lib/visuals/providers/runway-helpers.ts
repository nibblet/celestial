/**
 * Pure helpers for the Runway provider (no `server-only`, unit-tested).
 */

export const RUNWAY_DEFAULT_VIDEO_MODEL = "gen4.5";

/** Models offered in the console. gen4_turbo is cheaper/faster, gen4.5 is
 *  Runway's best image-to-video model (per docs.dev.runwayml.com, 2026). */
export const RUNWAY_VIDEO_MODELS = [
  "gen4.5",
  "gen4_turbo",
  "klingO3_standard",
  "klingO3_pro",
  // Other labs' models served through Runway's API (same key, same endpoint).
  "veo3.1",
  "seedance2_5",
  "kling_4",
] as const;

/**
 * What each model's image_to_video request accepts (Runway OpenAPI spec,
 * 2026-11). Used to shape the request body and the console's controls.
 */
export type RunwayModelCaps = {
  /** promptText cap (chars, with headroom). */
  maxPrompt: number;
  /** promptImage may be [{first},{last}]. */
  endFrame: boolean;
  /** Extra reference images (faces, wardrobe), excluding keyframes. */
  maxReferences: number;
  /** Request takes `audio` (we always send false). */
  audioField: boolean;
  seed: boolean;
  /** Request takes `negativePrompt`. */
  negativePrompt: boolean;
};

export function runwayModelCaps(model: string): RunwayModelCaps {
  if (isKlingO3(model)) {
    return { maxPrompt: KLING_MAX_PROMPT_CHARS, endFrame: true, maxReferences: KLING_MAX_REFERENCES, audioField: true, seed: false, negativePrompt: false };
  }
  if (model === "veo3.1") {
    return { maxPrompt: 990, endFrame: true, maxReferences: 0, audioField: true, seed: true, negativePrompt: true };
  }
  if (model === "seedance2_5") {
    return { maxPrompt: KLING_MAX_PROMPT_CHARS, endFrame: true, maxReferences: 0, audioField: true, seed: true, negativePrompt: false };
  }
  if (model === "kling_4") {
    // Up to 10 images in total, keyframes included.
    return { maxPrompt: KLING_MAX_PROMPT_CHARS, endFrame: true, maxReferences: 8, audioField: false, seed: false, negativePrompt: false };
  }
  return { maxPrompt: RUNWAY_MAX_PROMPT_CHARS, endFrame: false, maxReferences: 0, audioField: false, seed: true, negativePrompt: false };
}

/** Default negative prompt for models that take one (Veo). */
export const REALISM_NEGATIVE_PROMPT =
  "CGI, 3D render, video game, cartoon, illustration, plastic skin, waxy faces, oversaturated colors, glowing outlines, lens flares, morphing faces, extra people, text, watermark";

/**
 * Kling O3 on Runway's API accepts reference images alongside the start
 * frame (up to 7 images in total) and names them in the prompt as
 * <<<image_1>>>, <<<image_2>>>… in request order: the first frame, then
 * the references. Per dev.runwayml.com/learn/kling-o3-api (2026-11).
 *
 * EXPERIMENTAL: in the first test (2026-11-14, Standard, trench shot) the
 * revealed face did not match the attached portrait and the suit drifted.
 * Prefer cutting to a close-up whose start frame already shows the face.
 */
export function isKlingO3(model: string): boolean {
  return model.startsWith("klingO3");
}

/** Start frame + references must total 7 or fewer. */
export const KLING_MAX_REFERENCES = 6;

/** Kling O3 accepts a longer promptText (2–2,500 chars). */
export const KLING_MAX_PROMPT_CHARS = 2400;

/**
 * Output ratio per model. Gen-4 takes our aspect sizes directly; Kling O3
 * only takes landscape, portrait or square at a fixed size per tier.
 */
export function runwayRatioFor(model: string, aspect: string): string {
  const portrait = aspect === "9:16" || aspect === "4:5" || aspect === "2:3";
  if (model === "veo3.1") return portrait ? "1080:1920" : "1920:1080";
  if (model === "kling_4") return "auto_1080p"; // follows the start frame's framing
  if (model === "seedance2_5") {
    switch (aspect) {
      case "9:16":
        return "1080:1920";
      case "1:1":
        return "1440:1440";
      case "4:5":
      case "2:3":
        return "1248:1664";
      case "3:2":
        return "1664:1248";
      default:
        return "1920:1080";
    }
  }
  if (isKlingO3(model)) {
    const pro = model.includes("pro");
    const land = pro ? "1920:1080" : "1280:720";
    const port = pro ? "1080:1920" : "720:1280";
    const square = pro ? "1440:1440" : "960:960";
    if (aspect === "16:9" || aspect === "3:2") return land;
    if (aspect === "9:16" || aspect === "2:3") return port;
    return square; // 1:1 and 4:5
  }
  switch (aspect) {
    case "16:9":
      return "1280:720";
    case "9:16":
      return "720:1280";
    case "1:1":
      return "960:960";
    case "4:5":
      return "832:1104";
    case "3:2":
      return "1104:832";
    case "2:3":
      return "832:1104";
    default:
      return "1280:720";
  }
}

/**
 * Opening lines for a Kling O3 prompt that tell the model what each
 * attached image is, using its <<<image_N>>> tokens.
 */
export function klingReferencePreamble(labels: string[], hasEndFrame = false): string {
  const lines = ["<<<image_1>>> is the start frame; continue it exactly."];
  if (hasEndFrame) {
    lines.push("<<<image_2>>> is the end frame; the clip must arrive exactly at it.");
  }
  const offset = hasEndFrame ? 3 : 2;
  labels.forEach((label, i) => {
    lines.push(
      `<<<image_${i + offset}>>> is ${label}: if this person's face becomes visible, it must be this face.`,
    );
  });
  return lines.join(" ");
}

/**
 * End frames (promptImage position "last") are documented for Kling O3 on
 * Runway's API. Gen-4.5 rejects a promptImage array (400, "expected
 * string", 2026-11-15), and Gen-4 Turbo takes a first frame only.
 */
export function supportsEndFrame(model: string): boolean {
  return runwayModelCaps(model).endFrame;
}

/** Runway caps an encoded data URI at 5MB. */
export const RUNWAY_MAX_DATA_URI_BYTES = 5 * 1024 * 1024;

/** promptText cap is 1000 chars; leave a little headroom. */
export const RUNWAY_MAX_PROMPT_CHARS = 990;

/**
 * Snap a requested duration to what the model accepts.
 * gen4_turbo: 5 or 10 seconds. gen4.5: 2–10 seconds (whole seconds).
 */
export function runwayDurationFor(model: string, requested: number): number {
  const n = Number.isFinite(requested) ? Math.round(requested) : 5;
  if (model.startsWith("gen4_turbo")) return n >= 8 ? 10 : 5;
  // Runway: "1080p resolution only supports 8 second videos" (2026-11-17).
  if (model === "veo3.1") return 8;
  if (model === "seedance2_5") return Math.min(30, Math.max(4, n));
  if (model === "kling_4") return Math.min(30, Math.max(3, n));
  if (isKlingO3(model)) return Math.min(15, Math.max(3, n));
  return Math.min(10, Math.max(2, n));
}

/**
 * Appended to every Runway prompt. Learned from the first Galen test
 * (2026-11-14): Gen-4.5 opened his mouth despite "no speech" and turned a
 * "faint" background drift into a strong purple-to-teal swing.
 */
export const RUNWAY_RESTRAINT_SUFFIX =
  "Keep every face and identity exactly as in the start frame. Camera makes only the move described: no orbiting or swinging around the subjects, and people keep facing the way they face in the start frame unless told to turn, so no new faces are revealed. Suits, helmets, hair and costumes stay exactly as in the start frame. Mouths stay closed; no speaking. Light stays steady: no sun flares, blooms or color swings. Small, restrained movement.";

/** Operator/synthesized motion text plus the restraint suffix, within the cap. */
export function withRestraint(motion: string, maxChars: number = RUNWAY_MAX_PROMPT_CHARS): string {
  const base = motion.replace(/\s+/g, " ").trim();
  const room = maxChars - RUNWAY_RESTRAINT_SUFFIX.length - 1;
  const head = base.length <= room ? base : clampTo(base, room);
  return head ? `${head} ${RUNWAY_RESTRAINT_SUFFIX}` : RUNWAY_RESTRAINT_SUFFIX;
}

function clampTo(text: string, max: number): string {
  const cut = text.slice(0, max);
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("; "));
  return stop > max / 3 ? cut.slice(0, stop + 1) : cut;
}

/**
 * Trim free text to Runway's promptText limit, cutting at the last
 * sentence boundary when one is reasonably close to the cap.
 */
export function clampRunwayPrompt(
  text: string,
  maxChars: number = RUNWAY_MAX_PROMPT_CHARS,
): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxChars) return clean;
  const cut = clean.slice(0, maxChars);
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("; "));
  return stop > 200 ? cut.slice(0, stop + 1) : cut;
}

/** Build a data URI and enforce Runway's encoded-size limit. */
export function toDataUri(bytes: Uint8Array, contentType: string): string {
  const uri = `data:${contentType};base64,${Buffer.from(bytes).toString("base64")}`;
  if (uri.length > RUNWAY_MAX_DATA_URI_BYTES) {
    throw new Error(
      `Start frame is too large for Runway as a data URI (${(uri.length / 1048576).toFixed(1)}MB encoded, limit 5MB). Use a smaller PNG/JPG.`,
    );
  }
  return uri;
}
