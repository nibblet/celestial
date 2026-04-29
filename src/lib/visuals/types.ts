/**
 * Shared types for the corpus-to-prompt synthesizer + visual asset pipeline.
 *
 * The flow is target → corpus context → structured prompt → asset.
 * Types here describe the boundary between each step so caches can key on
 * stable values (see `seedHashFor` in ./hash.ts).
 */

import type { AskContextItem } from "@/lib/ai/ask-context";

export type VisualTargetKind = "entity" | "story" | "scene" | "freeform";

export type VisualTarget = {
  kind: VisualTargetKind;
  /** Wiki slug, storyId, or scene slug. Null for freeform. */
  id: string | null;
  /** Optional freeform focus that narrows the prompt — e.g. "early scene
   *  by the river at dusk" or "wide establishing shot of the foundry". */
  focus?: string;
};

export type VisualIntent =
  | "portrait"
  | "establishing_shot"
  | "scene_moment"
  | "motion_loop";

export type VisualAspect = "16:9" | "9:16" | "1:1" | "4:5" | "3:2";

export type StylePresetKey =
  | "valkyrie_shipboard"
  | "vault_threshold"
  | "mars_excavation"
  | "earth_institutional"
  | "giza_archaeological"
  | "noncorporeal_presence"
  | "intimate_crew"
  | "mythic_scale";

export type VisualPrompt = {
  subject: string;
  /** Identity anchors pulled verbatim from canon (era, age, hair, signature
   *  garments, distinguishing features, what the subject explicitly is NOT).
   *  Lists are stable per entity so regenerations stay on-model. */
  identityAnchors: string[];
  setting: string;
  mood: string;
  lighting: string;
  camera: string;
  /** For video intents: how the camera moves (push-in, orbit, static).
   *  Empty string for stills. */
  cameraMotion: string;
  /** For video intents: how the subject and elements move; rhythm cues. */
  subjectMotion: string;
  /** Color semantics. For stills, palette. For video, a short arc
   *  description ("cool blue → radiant gold → faint violet edges"). */
  colorArc: string;
  /** For video intents: short audio direction (tone, texture). Empty for
   *  stills or when audio is not applicable. */
  audio: string;
  styleAnchors: string[];
  negative: string[];
  aspect: VisualAspect;
  intent: VisualIntent;
  /** A flattened single-string version suitable for providers that take a
   *  plain text prompt (Imagen / Runway). Synthesized alongside the fields
   *  above and stored verbatim so we hand the same string to the provider
   *  on every cache hit. */
  raw: string;
};

export type EvidenceRef = {
  kind: AskContextItem["kind"];
  slug?: string;
  storyId?: string;
  title: string;
  score: number;
};

export type VisualCorpusContext = {
  /** The primary entity/story/scene the prompt is anchored on. */
  primary: AskContextItem | null;
  /** Top-k neighbors from the wiki retriever. */
  supporting: AskContextItem[];
  /** Hash of wiki content state — flips when the corpus changes so cached
   *  prompts can be invalidated. See ./corpus-version.ts. */
  corpusVersion: string;
  /** Compact references stored on cel_visual_prompts.evidence_refs. */
  evidence: EvidenceRef[];
};
