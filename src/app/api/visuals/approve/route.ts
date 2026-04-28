import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

  let body: { assetId?: string; approved?: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.assetId) {
    return Response.json({ error: "assetId required" }, { status: 400 });
  }
  const approved = body.approved !== false;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("cel_visual_assets")
    .update({ approved })
    .eq("id", body.assetId)
    .select("id, approved")
    .single();
  if (error || !data) {
    return Response.json(
      { error: error?.message ?? "Asset not found" },
      { status: 404 },
    );
  }
  return Response.json({ assetId: data.id, approved: data.approved });
}
