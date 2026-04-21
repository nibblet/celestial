/**
 * seed-open-threads.ts
 *
 * Inserts a starter pack of 5 unresolved narrative threads into
 * `sb_open_threads` (remapped to `cel_open_threads` by the table-prefix
 * proxy) so the AI orchestrator has something concrete to surface in its
 * "## Open Narrative Threads" context block while we wait for the author
 * to populate real ones.
 *
 * Idempotent: a thread with the same (title, opened_in_chapter_id) pair is
 * left alone if it already exists.
 *
 * Run:
 *   npm run seed:threads
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { withCelTablePrefix } from "@/lib/supabase/table-prefix";
import type { OpenThreadKind } from "@/lib/threads/repo";

(() => {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = trimmed.match(/^([^=]+)=(.*)$/);
    if (!m) continue;
    const key = m[1].trim();
    const value = m[2].trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
})();

function makeClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "seed:threads requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  return withCelTablePrefix(
    createClient(url, key, { auth: { persistSession: false } }),
  );
}

type SeedThread = {
  title: string;
  question: string;
  kind: OpenThreadKind;
  openedInChapterId: string;
  openedInSceneSlug: string | null;
  notes?: string;
};

// A starter pack grounded in CH01–CH02 material we already have. Tune or
// replace these as real threads emerge during the author's continuity
// pass; `npm run seed:threads` is safe to re-run.
const SEEDS: SeedThread[] = [
  {
    title: "Why is the Vault listening?",
    question:
      "The Vault's ambient hum spikes whenever Kade speaks. Is it responding to him specifically, or to something he's carrying?",
    kind: "mystery",
    openedInChapterId: "CH01",
    openedInSceneSlug: "scene-scene-1-waking-dust",
    notes: "Recurring motif — text returns to it without ever resolving.",
  },
  {
    title: "What is Galen afraid to hear?",
    question:
      "Galen silences the ansible whenever its status chime comes in. Fear of bad news, fear of good news, or fear that someone is finally calling back?",
    kind: "setup",
    openedInChapterId: "CH02",
    openedInSceneSlug: "scene-scene-2-the-quiet-weight",
  },
  {
    title: "Mission date contradiction: 2049 vs 2050",
    question:
      "The Prologue situates Valkyrie-1 in 2050, but CH02's mission log header reads 2049-11-14. Either the log is backdated or the snapshot is off.",
    kind: "contradiction",
    openedInChapterId: "CH02",
    openedInSceneSlug: null,
    notes: "Flag for continuity pass.",
  },
  {
    title: "Who first translated the Ancient glyphs?",
    question:
      "The wiki cross-references a 'first translator' of the Ancient glyphs, but no chapter actually names them or shows the moment of first translation.",
    kind: "gap",
    openedInChapterId: "CH01",
    openedInSceneSlug: null,
  },
  {
    title: "The Unseen Below — what did Kade feel?",
    question:
      "Kade reports a presence 'beneath the Vault floor'. The text leaves it ambiguous whether this is geothermal imagination, Ancient tech, or something hearing him back.",
    kind: "mystery",
    openedInChapterId: "CH01",
    openedInSceneSlug: "scene-scene-3-the-unseen-below",
  },
];

async function seedThread(
  supabase: ReturnType<typeof makeClient>,
  t: SeedThread,
  counters: { inserted: number; skipped: number; failed: number },
): Promise<void> {
  // Idempotency probe: match on (title, chapter) because ids are generated.
  const { data: existing, error: selectErr } = await supabase
    .from("sb_open_threads")
    .select("id")
    .eq("title", t.title)
    .eq("opened_in_chapter_id", t.openedInChapterId)
    .maybeSingle();

  if (selectErr) {
    console.error(`[seed:threads] select failed for "${t.title}":`, selectErr.message);
    counters.failed++;
    return;
  }
  if (existing) {
    counters.skipped++;
    return;
  }

  const { error: insertErr } = await supabase.from("sb_open_threads").insert({
    title: t.title,
    question: t.question,
    kind: t.kind,
    opened_in_chapter_id: t.openedInChapterId,
    opened_in_scene_slug: t.openedInSceneSlug,
    notes: t.notes ?? "",
  });

  if (insertErr) {
    console.error(`[seed:threads] insert failed for "${t.title}":`, insertErr.message);
    counters.failed++;
    return;
  }
  counters.inserted++;
}

async function main() {
  const supabase = makeClient();
  const counters = { inserted: 0, skipped: 0, failed: 0 };
  for (const t of SEEDS) {
    await seedThread(supabase, t, counters);
  }
  console.log(
    `[seed:threads] done — inserted=${counters.inserted} skipped=${counters.skipped} failed=${counters.failed}`,
  );
  if (counters.failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("[seed:threads] fatal:", err);
  process.exit(1);
});
