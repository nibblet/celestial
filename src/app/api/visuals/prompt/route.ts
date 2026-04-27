import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildVisualCorpusContext } from "@/lib/visuals/corpus-context";
import { synthesizeVisualPrompt } from "@/lib/visuals/synthesize-prompt";
import { DEFAULT_STYLE_PRESET, STYLE_PRESETS } from "@/lib/visuals/style-presets";
import type {
  StylePresetKey,
  VisualAspect,
  VisualIntent,
  VisualTargetKind,
} from "@/lib/visuals/types";

export const dynamic = "force-dynamic";

const VALID_TARGET_KINDS: VisualTargetKind[] = ["entity", "story", "scene", "freeform"];
const VALID_ASPECTS: VisualAspect[] = ["16:9", "9:16", "1:1", "4:5", "3:2"];
const VALID_INTENTS: VisualIntent[] = [
  "portrait",
  "establishing_shot",
  "scene_moment",
  "motion_loop",
];

async function requireKeith() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" as const, status: 401 } as const;
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("cel_profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || !["admin", "keith"].includes(profile.role)) {
    return { error: "Forbidden" as const, status: 403 } as const;
  }
  return { userId: user.id } as const;
}

export async function POST(request: Request) {
  const auth = await requireKeith();
  if ("error" in auth) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  let body: {
    targetKind?: VisualTargetKind;
    targetId?: string | null;
    focus?: string;
    stylePreset?: StylePresetKey;
    aspect?: VisualAspect;
    intent?: VisualIntent;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const targetKind = body.targetKind;
  if (!targetKind || !VALID_TARGET_KINDS.includes(targetKind)) {
    return Response.json({ error: "targetKind required" }, { status: 400 });
  }
  const aspect = body.aspect ?? "16:9";
  if (!VALID_ASPECTS.includes(aspect)) {
    return Response.json({ error: "Invalid aspect" }, { status: 400 });
  }
  const intent = body.intent ?? "establishing_shot";
  if (!VALID_INTENTS.includes(intent)) {
    return Response.json({ error: "Invalid intent" }, { status: 400 });
  }
  const stylePreset = body.stylePreset ?? DEFAULT_STYLE_PRESET;
  if (!STYLE_PRESETS[stylePreset]) {
    return Response.json({ error: "Unknown stylePreset" }, { status: 400 });
  }
  if (targetKind !== "freeform" && !body.targetId) {
    return Response.json(
      { error: "targetId required for non-freeform targets" },
      { status: 400 },
    );
  }

  try {
    const target = {
      kind: targetKind,
      id: body.targetId ?? null,
      focus: body.focus,
    };
    const context = await buildVisualCorpusContext(target);
    const result = await synthesizeVisualPrompt({
      target,
      context,
      stylePreset,
      aspect,
      intent,
      userId: auth.userId,
    });
    return Response.json({
      promptId: result.promptId,
      prompt: result.prompt,
      cached: result.cached,
      evidence: context.evidence,
      corpusVersion: context.corpusVersion,
    });
  } catch (err) {
    console.error("[api/visuals/prompt]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Synthesis failed" },
      { status: 500 },
    );
  }
}
