/**
 * Pure helpers for the Runway provider (no `server-only`, unit-tested).
 */

export const RUNWAY_DEFAULT_VIDEO_MODEL = "gen4.5";

/** Models offered in the console. gen4_turbo is cheaper/faster, gen4.5 is
 *  Runway's best image-to-video model (per docs.dev.runwayml.com, 2026). */
export const RUNWAY_VIDEO_MODELS = ["gen4.5", "gen4_turbo"] as const;

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
  return Math.min(10, Math.max(2, n));
}

/**
 * Appended to every Runway prompt. Learned from the first Galen test
 * (2026-11-14): Gen-4.5 opened his mouth despite "no speech" and turned a
 * "faint" background drift into a strong purple-to-teal swing.
 */
export const RUNWAY_RESTRAINT_SUFFIX =
  "Keep the face and identity exactly as in the start frame. Mouth stays closed and relaxed; no speaking or mouthing words. Background light stays dim and steady with only slow, subtle shimmer; no flares or color swings. Small, restrained movement.";

/** Operator/synthesized motion text plus the restraint suffix, within the cap. */
export function withRestraint(motion: string): string {
  const base = motion.replace(/\s+/g, " ").trim();
  const room = RUNWAY_MAX_PROMPT_CHARS - RUNWAY_RESTRAINT_SUFFIX.length - 1;
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
export function clampRunwayPrompt(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= RUNWAY_MAX_PROMPT_CHARS) return clean;
  const cut = clean.slice(0, RUNWAY_MAX_PROMPT_CHARS);
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
