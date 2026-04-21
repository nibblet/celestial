import { createClient } from "@/lib/supabase/server";
import { requireAuthor } from "@/lib/auth/require-author";
import { getPersonBySlug } from "@/lib/wiki/parser";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: person, error } = await supabase
    .from("sb_people")
    .select(
      "id, slug, display_name, relationship, bio_md, birth_year, death_year, updated_at"
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!person) return Response.json({ error: "Not found" }, { status: 404 });

  // Backlinks: drafts and published story ids that mention this person.
  const { data: links } = await supabase
    .from("sb_story_people")
    .select("owner_type, owner_id")
    .eq("person_id", person.id);

  // AI draft from the wiki markdown file — used as bio pre-fill in the editor.
  const wikiPerson = getPersonBySlug(slug);
  const aiDraft = wikiPerson?.aiDraft ?? null;

  return Response.json({ person, links: links ?? [], aiDraft });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const gate = await requireAuthor();
  if (!gate.ok) return Response.json({ error: gate.error }, { status: gate.status });

  const patch = (await request.json().catch(() => ({}))) as {
    display_name?: string;
    relationship?: string | null;
    bio_md?: string | null;
    birth_year?: number | null;
    death_year?: number | null;
  };

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    updated_by: gate.user!.id,
  };
  if (patch.display_name !== undefined)
    update.display_name = patch.display_name.trim() || "Unknown";
  if (patch.relationship !== undefined) update.relationship = patch.relationship;
  if (patch.bio_md !== undefined) update.bio_md = patch.bio_md;
  if (patch.birth_year !== undefined) update.birth_year = patch.birth_year;
  if (patch.death_year !== undefined) update.death_year = patch.death_year;

  const { data, error } = await gate.supabase
    .from("sb_people")
    .update(update)
    .eq("slug", slug)
    .select(
      "id, slug, display_name, relationship, bio_md, birth_year, death_year, updated_at"
    )
    .single();

  if (error || !data) {
    return Response.json(
      { error: error?.message ?? "Failed to update" },
      { status: 500 }
    );
  }
  return Response.json({ person: data });
}
