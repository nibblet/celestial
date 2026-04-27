import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAiCall } from "@/lib/ai/ledger";
import { renderCorpusContextForPrompt } from "./corpus-context";
import { fetchIdentityContinuity, renderIdentityContinuityForPrompt } from "./continuity";
import { getStylePreset } from "./style-presets";
import { continuityHashFor, seedHashFor } from "./hash";
import type {
  StylePresetKey,
  VisualAspect,
  VisualCorpusContext,
  VisualIntent,
  VisualPrompt,
  VisualTarget,
} from "./types";

/**
 * Bump when the system prompt below changes. Combined with corpusVersion in
 * seedHashFor() so cached prompts auto-invalidate on prompt edits.
 */
const SYNTH_PROMPT_VERSION = "v4";
const SYNTH_MODEL = "claude-sonnet-4-20250514";

const SYSTEM_PROMPT = `You are a Visual Director for the Celestial corpus.

Your job: read the wiki passages and emit a structured visual prompt for a
downstream image or video model. Anchor visual choices in the corpus, but
TRANSLATE narrative concepts into concrete, render-able imagery. Image
models cannot render "consciousness", "presence", "awareness", or "non-
physical" — they render light, geometry, materials, and bodies.

CRITICAL — banned in subject/setting/lighting/raw fields:
- Abstract psychological language: "consciousness", "presence", "awareness",
  "essence", "non-physical", "intelligence behind the X".
- Hedging that suppresses contrast: "subtle", "barely perceptible", "gentle",
  "quiet", "restrained" — these tell the model to render NOTHING.
- "Sterile", "clean", "smooth", "minimalist" unless the corpus explicitly
  demands it. Cinema is lived-in: wear, patina, grime, asymmetry.

REQUIRED — every prompt must include:
- Specific architectural / material detail: octagonal cross-section, ribbed
  bulkheads, brushed aluminum panels with screw heads, recessed light
  channels, exposed conduit, riveted seams, steam grates, etc.
- Specific light sources by type and color temperature: "warm 2700K
  tungsten practicals embedded in handrails, cool 5600K key from
  overhead skylight, hard shadow falloff."
- Lens + framing specifics: "shot on 50mm anamorphic, eye-level, deep focus
  with foreground railing in silhouette."
- Strong chiaroscuro by default — name the dark areas as well as the lit.

If the subject is non-humanoid or environmental (an AI, a place, a ship's
spirit), treat THE SETTING as the protagonist: load it with cinematic
character — mood lights, weathered metal, atmospheric haze, signage decals,
practical lights you can name. The corpus identity goes in the
identity_anchors and negative arrays; the raw prompt describes what's
literally in frame.

Where the corpus specifies what the subject IS NOT (e.g. "non-humanoid",
"no human face", "no hologram UI"), put those in identity_anchors AND in
negative — never describe the absence in subject/setting prose.

COMPOSITION RULES BY INTENT:

- establishing_shot: the SCENE is the protagonist, not the character.
  - If a character is named, frame them FROM BEHIND or OVER-THE-SHOULDER,
    small in frame (occupying 15-30% of vertical), as a scale anchor for
    the setting. Never staged-profile, never centered hero pose.
  - The setting must be loaded with multiple narrative elements: vehicles,
    structures, activity, atmospheric depth, signs of work or habitation.
    A single object in an empty plane is a failure.
  - Use long-lens compression to layer foreground / midground / distant
    horizon. Atmospheric haze in the distance.
  - Decorative foreground frames (geodesic structures, archways) should
    only appear if the corpus calls for them — never as default ornament.

- portrait: tight on the subject. 50-85mm, eye-level or slight low,
  shallow DoF, motivated key + fill. Setting reads as bokeh.

- scene_moment: medium framing on a specific action. The character is
  doing something concrete from the corpus, captured mid-gesture.

- motion_loop: short cinematic clip (8-12s). Motion direction goes in
  camera_motion + subject_motion. Lead the raw with "8-10 second clip,
  24fps, …".

Output STRICT JSON with this shape and no prose around it:
{
  "subject": "<2-4 sentences. Name what is literally IN the frame. For environmental/non-physical subjects, describe the setting AS the protagonist with concrete materials, mechanical detail, signage, wear. Do NOT use the banned abstract words. Do NOT describe the absence of features here — that's what identity_anchors + negative are for.>",
  "identity_anchors": ["<3-8 short tags pulled from canon: era, age, hair, signature objects, NOT-anchors like 'no human face', 'non-humanoid'>"],
  "setting": "<1-2 sentences: where and when, environmental detail from corpus>",
  "mood": "<one phrase>",
  "lighting": "<2-3 sentences. Name specific sources by type and color temperature (e.g. '2700K tungsten practicals', '5600K daylight'). Specify quality (hard / soft), direction, falloff. Name the dark areas explicitly — chiaroscuro is the default, even illumination is the failure mode.>",
  "camera": "<lens (specific mm) + framing + distance + height + perspective — e.g. '50mm anamorphic, medium-wide, eye-level, deep focus with foreground element in silhouette'. Default to long-lens compression for spaces; avoid wide-angle distortion unless intent demands it.>",
  "camera_motion": "<for video intents: how the camera moves, e.g. 'slow push-in from medium-wide to medium-close, slight orbital drift'. Empty string for stills.>",
  "subject_motion": "<for video intents: how the subject and elements move + rhythm. Empty string for stills.>",
  "color_arc": "<For stills: palette in 1 sentence. For video: a short emotional arc, e.g. 'cool blue (observation) → radiant gold (clarity) → faint violet at edges (grief), transitions organic, never abrupt'.>",
  "audio": "<For motion_loop intent only, if relevant: short audio direction. Empty otherwise.>",
  "style_anchors": ["<3-6 short style tags, MUST include the preset anchors provided>"],
  "negative": ["<5-10 short negative tags. Include any 'NOT-anchors' from canon (e.g. 'no human face', 'no hologram UI'). Include the preset negatives.>"],
  "raw": "<A single-string flattened prompt to hand directly to Imagen/Runway. 120-220 words. Structure:
    1. Lead with intent + duration (for video) + subject name and form.
    2. Identity / NOT-anchors block.
    3. Color semantics (or arc, for video).
    4. Motion behavior (only for video intents).
    5. Camera (and camera motion for video).
    6. Lighting.
    7. Tone.
    8. Audio direction (only for motion_loop, if relevant).
    9. End with 'Avoid:' followed by a comma-separated list of every negative tag — Imagen has no negative-prompt parameter, so negatives MUST appear in this string.>"
}

Constraints:
- Do NOT invent named characters, places, or events not in the passages.
- If the passages are sparse, keep the prompt restrained rather than fabricating.
- For motion_loop intent, write the prompt as a short cinematic clip (8-12s, 24fps) with explicit motion direction.
- For portrait / establishing_shot / scene_moment, leave camera_motion / subject_motion / audio as empty strings.
- The 'raw' field is the only thing providers will see — it must be self-contained.`;

export type SynthesizeVisualPromptInput = {
  target: VisualTarget;
  context: VisualCorpusContext;
  stylePreset: StylePresetKey;
  aspect: VisualAspect;
  intent: VisualIntent;
  userId?: string | null;
};

export type SynthesizeVisualPromptResult = {
  promptId: string;
  prompt: VisualPrompt;
  cached: boolean;
};

export async function synthesizeVisualPrompt(
  input: SynthesizeVisualPromptInput,
): Promise<SynthesizeVisualPromptResult> {
  const continuityIdentity = await fetchIdentityContinuity(input.target);
  const seedHash = seedHashFor({
    target: input.target,
    stylePreset: input.stylePreset,
    aspect: input.aspect,
    intent: input.intent,
    corpusVersion: input.context.corpusVersion,
    synthModel: SYNTH_MODEL,
    synthPromptVersion: SYNTH_PROMPT_VERSION,
    continuityHash: continuityHashFor(continuityIdentity),
  });

  const admin = createAdminClient();

  // Cache lookup — same seed_hash, same prompt.
  const { data: existing } = await admin
    .from("cel_visual_prompts")
    .select("id, prompt_json")
    .eq("seed_hash", seedHash)
    .maybeSingle();

  if (existing) {
    return {
      promptId: existing.id as string,
      prompt: existing.prompt_json as VisualPrompt,
      cached: true,
    };
  }

  const preset = getStylePreset(input.stylePreset);
  const corpusBlock = renderCorpusContextForPrompt(input.context);

  const continuityBlock = continuityIdentity
    ? renderIdentityContinuityForPrompt(continuityIdentity)
    : "";

  const userMessage = [
    `Style preset: ${preset.label}`,
    `Brief: ${preset.brief}`,
    `Preset anchors (must appear in style_anchors): ${preset.anchors.join("; ")}`,
    `Preset negatives (include in negative): ${preset.negative.join("; ")}`,
    `Aspect: ${input.aspect}`,
    `Intent: ${input.intent}`,
    input.target.focus ? `Focus: ${input.target.focus}` : "",
    "",
    continuityBlock,
    continuityBlock ? "" : null,
    "Corpus passages:",
    corpusBlock || "(no corpus passages — keep the prompt restrained)",
  ]
    .filter((line): line is string => typeof line === "string" && line !== "")
    .join("\n");

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });
  const startedAt = Date.now();

  const response = await anthropic.messages.create({
    model: SYNTH_MODEL,
    max_tokens: 2048,
    temperature: 0.4,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const latencyMs = Date.now() - startedAt;
  const textBlock = response.content.find((c) => c.type === "text");
  const rawText = textBlock && textBlock.type === "text" ? textBlock.text : "";
  const prompt = parseVisualPromptJson(rawText, {
    aspect: input.aspect,
    intent: input.intent,
    presetAnchors: preset.anchors,
    presetNegative: preset.negative,
  });

  await logAiCall(admin, {
    userId: input.userId ?? null,
    persona: "visual_director",
    contextType: "visuals_prompt",
    contextId: seedHash.slice(0, 12),
    model: SYNTH_MODEL,
    inputTokens: response.usage?.input_tokens ?? null,
    outputTokens: response.usage?.output_tokens ?? null,
    latencyMs,
    status: "ok",
    meta: {
      target_kind: input.target.kind,
      target_id: input.target.id,
      style_preset: input.stylePreset,
    },
  });

  const { data: inserted, error } = await admin
    .from("cel_visual_prompts")
    .insert({
      target_kind: input.target.kind,
      target_id: input.target.id,
      style_preset: input.stylePreset,
      seed_hash: seedHash,
      prompt_json: prompt,
      evidence_refs: input.context.evidence,
      synth_model: SYNTH_MODEL,
      synth_prompt_version: SYNTH_PROMPT_VERSION,
      corpus_version: input.context.corpusVersion,
      created_by: input.userId ?? null,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    // Race: another caller may have inserted the same seed_hash. Re-read.
    const { data: race } = await admin
      .from("cel_visual_prompts")
      .select("id, prompt_json")
      .eq("seed_hash", seedHash)
      .maybeSingle();
    if (race) {
      return {
        promptId: race.id as string,
        prompt: race.prompt_json as VisualPrompt,
        cached: true,
      };
    }
    throw new Error(
      `cel_visual_prompts insert failed: ${error?.message ?? "unknown"}`,
    );
  }

  return { promptId: inserted.id as string, prompt, cached: false };
}

/**
 * Parse the model's JSON output into a VisualPrompt. Strips any leading/
 * trailing prose the model may emit despite the strict-JSON instruction.
 */
function parseVisualPromptJson(
  text: string,
  fallback: {
    aspect: VisualAspect;
    intent: VisualIntent;
    presetAnchors: string[];
    presetNegative: string[];
  },
): VisualPrompt {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Visual director did not return JSON");
  }
  const parsed = JSON.parse(jsonMatch[0]) as Partial<{
    subject: string;
    identity_anchors: string[];
    setting: string;
    mood: string;
    lighting: string;
    camera: string;
    camera_motion: string;
    subject_motion: string;
    color_arc: string;
    audio: string;
    style_anchors: string[];
    negative: string[];
    raw: string;
  }>;

  if (!parsed.subject || !parsed.raw) {
    throw new Error("Visual director output missing required fields");
  }

  return {
    subject: parsed.subject,
    identityAnchors: parsed.identity_anchors ?? [],
    setting: parsed.setting ?? "",
    mood: parsed.mood ?? "",
    lighting: parsed.lighting ?? "",
    camera: parsed.camera ?? "",
    cameraMotion: parsed.camera_motion ?? "",
    subjectMotion: parsed.subject_motion ?? "",
    colorArc: parsed.color_arc ?? "",
    audio: parsed.audio ?? "",
    styleAnchors: parsed.style_anchors ?? fallback.presetAnchors,
    negative: parsed.negative ?? fallback.presetNegative,
    aspect: fallback.aspect,
    intent: fallback.intent,
    raw: parsed.raw,
  };
}
