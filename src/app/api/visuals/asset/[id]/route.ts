import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const BUCKET_ID = "beyond-media";

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
 * DELETE /api/visuals/asset/{id}
 *
 * Removes a single visual asset row + the underlying storage object. Used
 * when an asset was misattached to the wrong entity, or when a bad
 * generation should be hard-deleted rather than just unapproved.
 *
 * The cel_visual_prompts row is intentionally preserved — multiple assets
 * can share a prompt, and deleting the prompt would cascade-drop them all.
 */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireKeith();
  if ("error" in auth) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  const admin = createAdminClient();

  const { data: asset } = await admin
    .from("cel_visual_assets")
    .select("id, storage_path")
    .eq("id", id)
    .maybeSingle();
  if (!asset) {
    return Response.json({ error: "Asset not found" }, { status: 404 });
  }

  // Best-effort storage cleanup — never block delete on storage errors.
  const { error: storageError } = await admin.storage
    .from(BUCKET_ID)
    .remove([asset.storage_path as string]);
  if (storageError) {
    console.warn(
      `[api/visuals/asset] storage delete failed for ${asset.storage_path}: ${storageError.message}`,
    );
  }

  const { error: rowError } = await admin
    .from("cel_visual_assets")
    .delete()
    .eq("id", id);
  if (rowError) {
    return Response.json({ error: rowError.message }, { status: 500 });
  }

  return Response.json({ deleted: true, assetId: id });
}
