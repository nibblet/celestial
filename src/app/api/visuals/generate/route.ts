import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrGenerateAsset } from "@/lib/visuals/generate-asset";
import type { VisualProviderName } from "@/lib/visuals/providers/types";
import type { VisualPrompt } from "@/lib/visuals/types";

export const dynamic = "force-dynamic";
// Runway video generation polls 30-90s; allow up to 5 minutes total.
export const maxDuration = 300;

const VALID_PROVIDERS: VisualProviderName[] = ["imagen", "runway"];

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
  if (!profile || !["admin", "author"].includes(profile.role)) {
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
    promptId?: string;
    provider?: VisualProviderName;
    providerModel?: string;
    params?: Record<string, unknown>;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.promptId) {
    return Response.json({ error: "promptId required" }, { status: 400 });
  }
  const provider = body.provider ?? "imagen";
  if (!VALID_PROVIDERS.includes(provider)) {
    return Response.json({ error: "Unsupported provider" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: promptRow } = await admin
    .from("cel_visual_prompts")
    .select("prompt_json")
    .eq("id", body.promptId)
    .maybeSingle();
  if (!promptRow) {
    return Response.json({ error: "Prompt not found" }, { status: 404 });
  }

  try {
    const result = await getOrGenerateAsset({
      promptId: body.promptId,
      prompt: promptRow.prompt_json as VisualPrompt,
      provider,
      providerModel: body.providerModel,
      params: body.params,
      userId: auth.userId,
    });
    return Response.json(result);
  } catch (err) {
    console.error("[api/visuals/generate]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Generation failed" },
      { status: 500 },
    );
  }
}
