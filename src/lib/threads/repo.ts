/**
 * Repository helpers for `sb_open_threads` (proxied to `cel_open_threads`).
 *
 * These are narrative mysteries/setups/contradictions/gaps raised by the
 * text itself — distinct from `sb_chapter_questions`, which tracks reader
 * questions. The author uses them to stay honest about what the series
 * still owes the reader, and the AI orchestrator surfaces the unresolved
 * ones to personas via `sharedContentBlock`.
 *
 * All reads use the anon server client (public-readable per migration 026);
 * writes go through the same client but only succeed under the admin/keith
 * RLS policy. The callers in `/api/admin/threads` enforce that gate
 * explicitly before hitting the DB so forbidden users get a 403 instead of
 * a silent no-op.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type OpenThreadKind = "mystery" | "setup" | "contradiction" | "gap";

export type OpenThread = {
  id: string;
  title: string;
  question: string;
  kind: OpenThreadKind;
  openedInChapterId: string;
  openedInSceneSlug: string | null;
  resolved: boolean;
  resolvedInChapterId: string | null;
  resolvedInSceneSlug: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

type DbRow = {
  id: string;
  title: string;
  question: string;
  kind: OpenThreadKind;
  opened_in_chapter_id: string;
  opened_in_scene_slug: string | null;
  resolved: boolean;
  resolved_in_chapter_id: string | null;
  resolved_in_scene_slug: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type ListThreadsOptions = {
  /** If set, only returns threads with the matching resolved flag. */
  resolved?: boolean;
  /** If set, only returns threads opened in this chapter. */
  openedInChapterId?: string;
  /** Max rows to return (default 200, hard cap 500). */
  limit?: number;
};

export type CreateThreadInput = {
  title: string;
  question: string;
  kind?: OpenThreadKind;
  openedInChapterId: string;
  openedInSceneSlug?: string | null;
  notes?: string;
};

export type MarkResolvedInput = {
  resolvedInChapterId: string;
  resolvedInSceneSlug?: string | null;
  notes?: string;
};

// ── Mapping ─────────────────────────────────────────────────────────

function rowToThread(row: DbRow): OpenThread {
  return {
    id: row.id,
    title: row.title,
    question: row.question,
    kind: row.kind,
    openedInChapterId: row.opened_in_chapter_id,
    openedInSceneSlug: row.opened_in_scene_slug,
    resolved: row.resolved,
    resolvedInChapterId: row.resolved_in_chapter_id,
    resolvedInSceneSlug: row.resolved_in_scene_slug,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT_COLS =
  "id, title, question, kind, opened_in_chapter_id, opened_in_scene_slug, resolved, resolved_in_chapter_id, resolved_in_scene_slug, notes, created_at, updated_at";

// ── Queries ─────────────────────────────────────────────────────────

/** Chapter-order sort key: CH01 < CH02 < CH10 < other. */
function chapterOrderKey(id: string): string {
  const m = id.match(/^CH(\d{1,3})$/i);
  if (!m) return `~~${id}`; // non-CH ids sort last
  return `CH${m[1].padStart(4, "0")}`;
}

export async function listOpenThreads(
  supabase: SupabaseClient,
  opts: ListThreadsOptions = {},
): Promise<OpenThread[]> {
  const limit = Math.min(500, Math.max(1, opts.limit ?? 200));
  let query = supabase
    .from("sb_open_threads")
    .select(SELECT_COLS)
    .order("opened_in_chapter_id", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(limit);

  if (typeof opts.resolved === "boolean") {
    query = query.eq("resolved", opts.resolved);
  }
  if (opts.openedInChapterId) {
    query = query.eq("opened_in_chapter_id", opts.openedInChapterId);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return (data as DbRow[]).map(rowToThread);
}

/**
 * Returns every unresolved thread opened in a chapter at or before
 * `chapterId` (numerically, e.g. `CH03` returns threads opened in
 * CH01/CH02/CH03). Used by the AI orchestrator to build a spoiler-safe
 * thread context block for the persona pipeline.
 */
export async function listUnresolvedThroughChapter(
  supabase: SupabaseClient,
  chapterId: string,
): Promise<OpenThread[]> {
  // Pull every unresolved thread (the table is tiny — a dozen rows at most
  // for a series) and filter in JS by chapter-sort-key. Doing the bound in
  // SQL requires either a computed column or a regex cast, neither of
  // which is worth adding complexity for at this scale.
  const { data, error } = await supabase
    .from("sb_open_threads")
    .select(SELECT_COLS)
    .eq("resolved", false)
    .order("opened_in_chapter_id", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(500);

  if (error || !data) return [];
  const key = chapterOrderKey(chapterId);
  return (data as DbRow[])
    .filter((r) => chapterOrderKey(r.opened_in_chapter_id) <= key)
    .map(rowToThread);
}

// ── Mutations ───────────────────────────────────────────────────────

export async function createThread(
  supabase: SupabaseClient,
  input: CreateThreadInput,
): Promise<OpenThread | null> {
  const { data, error } = await supabase
    .from("sb_open_threads")
    .insert({
      title: input.title,
      question: input.question,
      kind: input.kind ?? "mystery",
      opened_in_chapter_id: input.openedInChapterId,
      opened_in_scene_slug: input.openedInSceneSlug ?? null,
      notes: input.notes ?? "",
    })
    .select(SELECT_COLS)
    .single();

  if (error || !data) return null;
  return rowToThread(data as DbRow);
}

export async function markResolved(
  supabase: SupabaseClient,
  id: string,
  input: MarkResolvedInput,
): Promise<OpenThread | null> {
  const patch: Record<string, unknown> = {
    resolved: true,
    resolved_in_chapter_id: input.resolvedInChapterId,
    resolved_in_scene_slug: input.resolvedInSceneSlug ?? null,
    updated_at: new Date().toISOString(),
  };
  if (typeof input.notes === "string") patch.notes = input.notes;

  const { data, error } = await supabase
    .from("sb_open_threads")
    .update(patch)
    .eq("id", id)
    .select(SELECT_COLS)
    .single();

  if (error || !data) return null;
  return rowToThread(data as DbRow);
}
