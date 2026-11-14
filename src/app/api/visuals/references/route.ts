import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { composeEntitySpec } from "@/lib/visuals/specs/loader";

export const dynamic = "force-dynamic";

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
  if (!profile || !["admin", "author", "keith"].includes(profile.role)) {
    return { error: "Forbidden" as const, status: 403 } as const;
  }
  return { userId: user.id } as const;
}

/**
 * GET /api/visuals/references?targetId=galen-voss&view=&state=
 *
 * Returns spec-declared reference images for an entity so the admin console
 * can preview them before synthesizing a prompt.
 */
export async function GET(request: Request) {
  const auth = await requireKeith();
  if ("error" in auth) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(request.url);
  const targetId = (url.searchParams.get("targetId") ?? "").trim();
  const view = url.searchParams.get("view")?.trim() || undefined;
  const state = url.searchParams.get("state")?.trim() || undefined;

  if (!targetId) {
    return Response.json({ error: "targetId required" }, { status: 400 });
  }

  const spec = composeEntitySpec({ entitySlug: targetId, view, state });
  return Response.json({
    targetId,
    referenceImages: spec?.referenceImages ?? [],
    hasSpec: !!spec,
  });
}
