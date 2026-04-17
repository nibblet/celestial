import { createClient } from "@/lib/supabase/server";

async function assertAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("sb_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return null;
  return user;
}

// PATCH — toggle status between 'open' and 'resolved'
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await assertAdmin(supabase);
  if (!user) {
    return Response.json({ error: "Admin access required" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { status } = body as { status?: unknown };
  if (status !== "open" && status !== "resolved") {
    return Response.json(
      { error: "status must be 'open' or 'resolved'" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("sb_story_corrections")
    .update({
      status,
      resolved_at: status === "resolved" ? new Date().toISOString() : null,
    })
    .eq("id", id);

  if (error) {
    return Response.json({ error: "Could not update correction." }, { status: 500 });
  }

  return Response.json({ ok: true });
}

// DELETE — hard delete
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await assertAdmin(supabase);
  if (!user) {
    return Response.json({ error: "Admin access required" }, { status: 403 });
  }

  const { error } = await supabase
    .from("sb_story_corrections")
    .delete()
    .eq("id", id);

  if (error) {
    return Response.json({ error: "Could not delete correction." }, { status: 500 });
  }

  return Response.json({ ok: true });
}
