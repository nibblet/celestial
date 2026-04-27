import * as crypto from "crypto";

import type { VisualAspect, VisualIntent, VisualTarget, StylePresetKey } from "./types";

/**
 * Deterministic seed hash for the prompt cache.
 *
 * Two requests with the same seed_hash will share a row in
 * cel_visual_prompts and skip re-synthesis. Bump SYNTH_PROMPT_VERSION
 * (in synthesize-prompt.ts) when changing the system prompt to invalidate
 * cached prompts; corpus edits flip via corpusVersion.
 */
export function seedHashFor(input: {
  target: VisualTarget;
  stylePreset: StylePresetKey;
  aspect: VisualAspect;
  intent: VisualIntent;
  corpusVersion: string;
  synthModel: string;
  synthPromptVersion: string;
  /** Hash of any continuity identity fingerprint pulled from a prior
   *  approved asset. Empty string when none exists — flips to a stable
   *  hash once an approved asset is available, automatically invalidating
   *  the prompt cache so the next synthesis picks up the continuity. */
  continuityHash?: string;
}): string {
  const parts = [
    input.target.kind,
    input.target.id ?? "",
    input.target.focus ?? "",
    input.stylePreset,
    input.aspect,
    input.intent,
    input.corpusVersion,
    input.synthModel,
    input.synthPromptVersion,
    input.continuityHash ?? "",
  ];
  return crypto.createHash("sha256").update(parts.join("|")).digest("hex");
}

export function continuityHashFor(identity: object | null): string {
  if (!identity) return "";
  const sorted = JSON.stringify(identity, Object.keys(identity).sort());
  return crypto.createHash("sha256").update(sorted).digest("hex").slice(0, 16);
}

/**
 * Cache key fragment for an asset under a given prompt: same prompt +
 * provider + model + params_hash → same generated asset row.
 */
export function providerParamsHash(params: Record<string, unknown>): string {
  // Stable JSON — sort keys so {a:1,b:2} and {b:2,a:1} hash identically.
  const sorted = Object.keys(params)
    .sort()
    .reduce<Record<string, unknown>>((acc, k) => {
      acc[k] = params[k];
      return acc;
    }, {});
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(sorted))
    .digest("hex");
}
