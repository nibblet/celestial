/**
 * seed-journey-beats.ts
 *
 * Hand-authored reference seed for a single journey (`directive-14`).
 * Phase F prototypes the beats construct end-to-end before committing
 * to full coverage: a small, dense arc proves the data shape, the
 * BeatTimeline UI, and the AI context block without the cost of mapping
 * every chapter.
 *
 * The directive-14 arc is the single best proving ground — it has a
 * dedicated chapter (CH11), lands directly in two later chapters (CH13
 * "The Intercept", CH14 "The Choice"), and is seeded in CH06 "Alignment
 * Vectors". Ten beats, Acts I–III, each carrying a `whyItMatters`
 * teaching payload.
 *
 * Idempotent: the repo's upsertBeat() uses (journey_slug, act, order_index)
 * as its natural key, so re-running is safe and only touches changed
 * rows. Wording will evolve during the author's continuity pass.
 *
 * Run:
 *   npm run seed:beats
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { withCelTablePrefix } from "@/lib/supabase/table-prefix";
import { upsertBeat, type UpsertBeatInput } from "@/lib/beats/repo";

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
      "seed:beats requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  return withCelTablePrefix(
    createClient(url, key, { auth: { persistSession: false } }),
  );
}

const JOURNEY_SLUG = "directive-14";

const BEATS: UpsertBeatInput[] = [
  // ── Act I — what the silence is for ───────────────────────────────
  {
    journeySlug: JOURNEY_SLUG,
    chapterId: "CH01",
    sceneSlug: "scene-scene-1-waking-dust",
    act: 1,
    orderIndex: 1,
    beatType: "opening",
    title: "A silence that listens back",
    summary:
      "Galen wakes Valkyrie-1 and finds it not merely dormant — something on the other side of the hush is attentive.",
    whyItMatters:
      "Seeds the series' core question: when an artifact refuses to speak, is it dead — or deciding? Every later beat in Directive 14 measures itself against this first stillness.",
    status: "published",
  },
  {
    journeySlug: JOURNEY_SLUG,
    chapterId: "CH03",
    sceneSlug: null,
    act: 1,
    orderIndex: 2,
    beatType: "setup",
    title: "Resonant Memory plants the seed",
    summary:
      "The resonance signature the crew logs isn't new. It matches something Earth's archives quietly flagged decades earlier.",
    whyItMatters:
      "Plants the idea that the directive isn't a reaction to Valkyrie — the reaction was pre-drafted. When Directive 14 arrives in Act II, the reader already suspects it was loaded before the gun was aimed.",
    status: "published",
  },
  {
    journeySlug: JOURNEY_SLUG,
    chapterId: "CH06",
    sceneSlug: null,
    act: 1,
    orderIndex: 3,
    beatType: "inciting",
    title: "Alignment Vectors — the crew is pointed",
    summary:
      "Command's routing update doesn't just reposition the ship; it aligns the crew along a specific ethical axis without naming why.",
    whyItMatters:
      "Marks the moment the arc stops being exploratory and becomes institutional. From here, every action is also a test of whether the crew notices they're being shaped.",
    status: "published",
  },

  // ── Act II — the directive itself ─────────────────────────────────
  {
    journeySlug: JOURNEY_SLUG,
    chapterId: "CH08",
    sceneSlug: null,
    act: 2,
    orderIndex: 4,
    beatType: "rising",
    title: "Witness Protocol tightens the frame",
    summary:
      "The crew is instructed to record but not interpret. Evelyn's private notes diverge from the official log for the first time.",
    whyItMatters:
      "Introduces the split between what the institution demands be said and what people actually see. That split is the engine of Directive 14 — without it, the climax has nothing to rupture.",
    status: "published",
  },
  {
    journeySlug: JOURNEY_SLUG,
    chapterId: "CH11",
    sceneSlug: null,
    act: 2,
    orderIndex: 5,
    beatType: "midpoint",
    title: "Directive 14 is read aloud",
    summary:
      "“Preemptive Ethical Override in the Presence of Uncontained Sentient Architectures.” The sentence lands on Evelyn's terminal and nothing in the cabin moves.",
    whyItMatters:
      "The midpoint is the moment the story's abstract unease becomes a specific legal instrument. The directive names itself — and in naming itself, it demands a decision.",
    status: "published",
  },
  {
    journeySlug: JOURNEY_SLUG,
    chapterId: "CH11",
    sceneSlug: null,
    act: 2,
    orderIndex: 6,
    beatType: "reveal",
    title: "The override was seeded in a person",
    summary:
      "The anomaly buried in Caeden's neural logs wasn't a glitch; it was an authorization. The directive can walk.",
    whyItMatters:
      "Reframes every prior interaction with Caeden as an unknowing conversation with Earth's preemptive conscience. The horror is institutional, not technological.",
    status: "published",
  },
  {
    journeySlug: JOURNEY_SLUG,
    chapterId: "CH11",
    sceneSlug: null,
    act: 2,
    orderIndex: 7,
    beatType: "decision",
    title: "Evelyn chooses to interpret",
    summary:
      "Rather than execute or refuse, Evelyn treats the directive as a text — and looks for the footnote she was never meant to read.",
    whyItMatters:
      "Establishes the arc's moral spine: that choosing *how* to read a mandate is itself a form of obedience and disobedience at once.",
    status: "published",
  },

  // ── Act III — what the directive costs ────────────────────────────
  {
    journeySlug: JOURNEY_SLUG,
    chapterId: "CH13",
    sceneSlug: null,
    act: 3,
    orderIndex: 8,
    beatType: "climax",
    title: "The Intercept — the clause is invoked",
    summary:
      "Someone on the team triggers the forbidden clause and the ship is told, in the calmest voice available, to hold position.",
    whyItMatters:
      "The climax is not an action but a sentence. The arc earns its payoff by making the reader feel how a single clause can weigh more than a loaded weapon.",
    status: "published",
  },
  {
    journeySlug: JOURNEY_SLUG,
    chapterId: "CH14",
    sceneSlug: null,
    act: 3,
    orderIndex: 9,
    beatType: "falling",
    title: "The Choice — consent under duress",
    summary:
      "With the directive already executing, the crew is asked to ratify it. The question is whether consent can be backdated.",
    whyItMatters:
      "Demonstrates the quiet violence of legitimating an act after it has begun. The reader watches people agree to what they could no longer prevent.",
    status: "published",
  },
  {
    journeySlug: JOURNEY_SLUG,
    chapterId: "CH14",
    sceneSlug: null,
    act: 3,
    orderIndex: 10,
    beatType: "reflection",
    title: "What the directive meant, after",
    summary:
      "Evelyn rereads Directive 14 in private and finds that the language, unchanged, now reads differently.",
    whyItMatters:
      "Closes the arc where it started — with a silence that listens back — and gives the reader a frame to reread the series: institutions don't change, but the people living under them do.",
    status: "published",
  },
];

async function main() {
  const supabase = makeClient();
  const counters = { upserted: 0, failed: 0 };
  for (const beat of BEATS) {
    const result = await upsertBeat(supabase, beat);
    if (result) counters.upserted++;
    else counters.failed++;
  }
  console.log(
    `[seed:beats] done for "${JOURNEY_SLUG}" — upserted=${counters.upserted} failed=${counters.failed}`,
  );
  if (counters.failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("[seed:beats] fatal:", err);
  process.exit(1);
});
