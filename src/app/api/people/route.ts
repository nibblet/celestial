import { createClient } from "@/lib/supabase/server";
import { requireAuthor } from "@/lib/auth/require-author";

/**
 * GET /api/people?q=ba — list people for autocomplete / directory.
 * Public read (anonymous ok) matches sb_people RLS.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 20), 50);

  const supabase = await createClient();
  let query = supabase
    .from("sb_people")
    .select("id, slug, display_name, relationship, birth_year, death_year, bio_md")
    .order("display_name", { ascending: true })
    .limit(limit);

  if (q) {
    query = query.ilike("display_name", `%${q}%`);
  }

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ people: data ?? [] });
}

/**
 * POST /api/people — create a person. Keith-gated.
 * Body: { display_name, slug?, relationship?, bio_md?, birth_year?, death_year? }
 */
export async function POST(request: Request) {
  const gate = await requireAuthor();
  if (!gate.ok) return Response.json({ error: gate.error }, { status: gate.status });

  const body = (await request.json().catch(() => ({}))) as {
    display_name?: string;
    slug?: string;
    relationship?: string | null;
    bio_md?: string | null;
    birth_year?: number | null;
    death_year?: number | null;
  };

  const name = (body.display_name ?? "").trim();
  if (!name) {
    return Response.json(
      { error: "display_name required" },
      { status: 400 }
    );
  }

  const slug = (body.slug ?? slugify(name)).trim();

  const { data, error } = await gate.supabase
    .from("sb_people")
    .insert({
      slug,
      display_name: name,
      relationship: body.relationship ?? null,
      bio_md: body.bio_md ?? null,
      birth_year: body.birth_year ?? null,
      death_year: body.death_year ?? null,
      created_by: gate.user!.id,
      updated_by: gate.user!.id,
    })
    .select("id, slug, display_name, relationship, birth_year, death_year, bio_md")
    .single();

  if (error || !data) {
    return Response.json(
      { error: error?.message ?? "Failed to create person" },
      { status: 500 }
    );
  }
  return Response.json({ person: data });
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
