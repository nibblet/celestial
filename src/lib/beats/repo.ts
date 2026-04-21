/**
 * Repository helpers for `sb_beats` (proxied to `cel_beats`).
 *
 * Beats are the structural map of a journey/arc: opening, inciting,
 * midpoint, reveal, etc. Each beat carries a `whyItMatters` teaching
 * payload — that is the whole point of the construct and is surfaced to
 * both readers (BeatTimeline) and the AI orchestrator (sharedContentBlock).
 *
 * Reads: anonymous clients only see `status='published'` rows (enforced
 * by migration 028's RLS). Admin/keith can read drafts too. Writes go
 * through the admin-gated RLS policy.
 *
 * `listBeatsByJourney` is the hot path — called from the journey detail
 * page and from the orchestrator every time `journeySlug` is set on an
 * Ask call — so it stays narrow (published-only, ordered by act + slot).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export const BEAT_TYPES = [
  "opening",
  "inciting",
  "rising",
  "midpoint",
  "climax",
  "falling",
  "resolution",
  "reveal",
  "decision",
  "reflection",
  "setup",
  "payoff",
] as const;

export type BeatType = (typeof BEAT_TYPES)[number];

export type BeatStatus = "draft" | "published";

export type Beat = {
  id: string;
  journeySlug: string | null;
  chapterId: string | null;
  sceneSlug: string | null;
  act: number;
  orderIndex: number;
  beatType: BeatType;
  title: string;
  summary: string;
  whyItMatters: string;
  status: BeatStatus;
  createdAt: string;
  updatedAt: string;
};

type DbRow = {
  id: string;
  journey_slug: string | null;
  chapter_id: string | null;
  scene_slug: string | null;
  act: number;
  order_index: number;
  beat_type: BeatType;
  title: string;
  summary: string;
  why_it_matters: string;
  status: BeatStatus;
  created_at: string;
  updated_at: string;
};

const SELECT_COLS =
  "id, journey_slug, chapter_id, scene_slug, act, order_index, beat_type, title, summary, why_it_matters, status, created_at, updated_at";

export type UpsertBeatInput = Omit<Beat, "id" | "createdAt" | "updatedAt">;

// ── Mapping ─────────────────────────────────────────────────────────

function rowToBeat(row: DbRow): Beat {
  return {
    id: row.id,
    journeySlug: row.journey_slug,
    chapterId: row.chapter_id,
    sceneSlug: row.scene_slug,
    act: row.act,
    orderIndex: row.order_index,
    beatType: row.beat_type,
    title: row.title,
    summary: row.summary,
    whyItMatters: row.why_it_matters,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── Reads ───────────────────────────────────────────────────────────

export type ListBeatsOptions = {
  /** If true (default), filters to `status='published'`. Admin UIs can
   *  pass `false` to see drafts. The underlying RLS still applies. */
  publishedOnly?: boolean;
  /** Max rows (default 200, hard cap 500). Beats-per-journey is expected
   *  to be 8–20; the cap exists only to keep the admin list bounded. */
  limit?: number;
};

export async function listBeatsByJourney(
  supabase: SupabaseClient,
  journeySlug: string,
  opts: ListBeatsOptions = {},
): Promise<Beat[]> {
  const limit = Math.min(500, Math.max(1, opts.limit ?? 200));
  let query = supabase
    .from("sb_beats")
    .select(SELECT_COLS)
    .eq("journey_slug", journeySlug)
    .order("act", { ascending: true })
    .order("order_index", { ascending: true })
    .limit(limit);

  if (opts.publishedOnly !== false) {
    query = query.eq("status", "published");
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return (data as DbRow[]).map(rowToBeat);
}

export async function listBeatsByChapter(
  supabase: SupabaseClient,
  chapterId: string,
  opts: ListBeatsOptions = {},
): Promise<Beat[]> {
  const limit = Math.min(500, Math.max(1, opts.limit ?? 200));
  let query = supabase
    .from("sb_beats")
    .select(SELECT_COLS)
    .eq("chapter_id", chapterId)
    .order("act", { ascending: true })
    .order("order_index", { ascending: true })
    .limit(limit);

  if (opts.publishedOnly !== false) {
    query = query.eq("status", "published");
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return (data as DbRow[]).map(rowToBeat);
}

// ── Writes ──────────────────────────────────────────────────────────

/**
 * Insert a new beat (or update an existing one when a `journey_slug +
 * act + order_index` row already exists). That triple is the natural
 * key we use in seed scripts so re-running the seed is idempotent.
 *
 * When `journey_slug` is null, the triple can't be used to disambiguate
 * — we fall back to a plain insert. Beats-without-a-journey are expected
 * to be rare (content-authored by hand through the admin UI) so this
 * trade-off is fine for the prototype.
 */
export async function upsertBeat(
  supabase: SupabaseClient,
  input: UpsertBeatInput,
): Promise<Beat | null> {
  const payload = {
    journey_slug: input.journeySlug,
    chapter_id: input.chapterId,
    scene_slug: input.sceneSlug,
    act: input.act,
    order_index: input.orderIndex,
    beat_type: input.beatType,
    title: input.title,
    summary: input.summary,
    why_it_matters: input.whyItMatters,
    status: input.status,
  };

  if (input.journeySlug) {
    // Idempotency probe on the natural key
    const { data: existing, error: selectError } = await supabase
      .from("sb_beats")
      .select("id")
      .eq("journey_slug", input.journeySlug)
      .eq("act", input.act)
      .eq("order_index", input.orderIndex)
      .maybeSingle();

    if (selectError) return null;

    if (existing) {
      const { data, error } = await supabase
        .from("sb_beats")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select(SELECT_COLS)
        .single();
      if (error || !data) return null;
      return rowToBeat(data as DbRow);
    }
  }

  const { data, error } = await supabase
    .from("sb_beats")
    .insert(payload)
    .select(SELECT_COLS)
    .single();
  if (error || !data) return null;
  return rowToBeat(data as DbRow);
}
