import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { VisualVisionDescription } from "./extract-vision";
import type { VisualTarget } from "./types";

/**
 * Pull the IDENTITY sub-object from any approved asset for this target.
 * Identity fields (face, build, signature features) cross style presets so
 * a painterly portrait can borrow continuity from an approved cinematic
 * portrait. Wardrobe/environment/composition are intentionally NOT included
 * here — those are preset-specific.
 *
 * Returns null when no approved asset exists yet, in which case the
 * synthesizer falls back to the corpus alone.
 */
export async function fetchIdentityContinuity(
  target: VisualTarget,
): Promise<VisualVisionDescription["identity"] | null> {
  if (target.kind !== "entity" || !target.id) return null;

  const admin = createAdminClient();

  const { data: prompts } = await admin
    .from("cel_visual_prompts")
    .select("id")
    .eq("target_kind", "entity")
    .eq("target_id", target.id);

  const promptIds = (prompts ?? []).map((r) => r.id as string);
  if (promptIds.length === 0) return null;

  const { data: assets } = await admin
    .from("cel_visual_assets")
    .select("vision_description, approved, created_at")
    .in("prompt_id", promptIds)
    .eq("approved", true)
    .not("vision_description", "is", null)
    .order("created_at", { ascending: false })
    .limit(1);

  const description = assets?.[0]?.vision_description as VisualVisionDescription | undefined;
  return description?.identity ?? null;
}

export function renderIdentityContinuityForPrompt(
  identity: VisualVisionDescription["identity"],
): string {
  const lines = [
    "# Continuity reference (locked from prior approved render — treat as canon)",
    `Build: ${identity.build || "(not specified)"}`,
    `Face: ${identity.face || "(not specified)"}`,
  ];
  if (identity.skin_tone_hex) lines.push(`Skin tone: ${identity.skin_tone_hex}`);
  if (identity.signature_features?.length > 0) {
    lines.push(`Signature features: ${identity.signature_features.join("; ")}`);
  }
  lines.push(
    "These IDENTITY fields must persist across re-rolls. Do not contradict them.",
  );
  return lines.join("\n");
}
