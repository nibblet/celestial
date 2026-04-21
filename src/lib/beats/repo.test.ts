import test from "node:test";
import assert from "node:assert/strict";
import {
  listBeatsByChapter,
  listBeatsByJourney,
  upsertBeat,
  type Beat,
} from "@/lib/beats/repo";

// ── Fake Supabase query builder ──────────────────────────────────────
//
// Matches the shape the repo actually uses:
//   .from(t).select(cols).eq(col,val)...order(...).order(...).limit(n)
//   .insert(row).select(cols).single()
//   .update(patch).eq(...).select(cols).single()
//   .maybeSingle() for the upsert idempotency probe

type Call = { method: string; args: unknown[] };
type FakeResult<T> = { data: T | null; error: { message: string } | null };

function makeQuery<T>(trace: Call[], result: FakeResult<T>) {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "order", "limit", "eq", "update", "insert"]) {
    chain[m] = (...args: unknown[]) => {
      trace.push({ method: m, args });
      return chain;
    };
  }
  chain.single = async () => result;
  chain.maybeSingle = async () => result;
  // Thenable support so we can `await` a chain without calling .single()
  (chain as { then?: unknown }).then = (
    resolve: (v: FakeResult<T>) => unknown,
  ) => Promise.resolve(result).then(resolve);
  return chain;
}

function makeClient<T>(result: FakeResult<T>) {
  const trace: Call[] = [];
  const client = {
    from(table: string) {
      trace.push({ method: "from", args: [table] });
      return makeQuery(trace, result);
    },
  };
  return { client, trace };
}

/**
 * Upsert has a select-then-branch flow. Provide a selectResult (for the
 * maybeSingle probe) separately from the downstream insert/update result.
 */
function makeUpsertClient<T>(
  probe: FakeResult<{ id: string } | null>,
  mutation: FakeResult<T>,
) {
  const trace: Call[] = [];
  let call = 0;
  const client = {
    from(table: string) {
      trace.push({ method: "from", args: [table] });
      // First .from() => select/maybeSingle probe.
      // Subsequent .from() calls => insert/update mutation.
      const useProbe = call === 0;
      call++;
      return useProbe
        ? makeQuery(trace, probe)
        : makeQuery(trace, mutation);
    },
  };
  return { client, trace };
}

const ROW = {
  id: "beat-1",
  journey_slug: "directive-14",
  chapter_id: "CH01",
  scene_slug: "scene-scene-1-waking-dust",
  act: 1,
  order_index: 1,
  beat_type: "opening" as const,
  title: "A silence that listens back",
  summary: "Galen feels the Valkyrie is not merely dormant.",
  why_it_matters:
    "Seeds the series' core question: when an artifact refuses to speak, is it dead — or deciding?",
  status: "published" as const,
  created_at: "2026-04-21T00:00:00.000Z",
  updated_at: "2026-04-21T00:00:00.000Z",
};

// ── listBeatsByJourney ──────────────────────────────────────────────

test("listBeatsByJourney hits sb_beats filtered by journey + published", async () => {
  const { client, trace } = makeClient({ data: [ROW], error: null });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await listBeatsByJourney(client as any, "directive-14");

  assert.equal(trace.find((c) => c.method === "from")?.args[0], "sb_beats");

  const eqPairs = trace
    .filter((c) => c.method === "eq")
    .map((c) => [c.args[0], c.args[1]]);
  assert.deepEqual(eqPairs, [
    ["journey_slug", "directive-14"],
    ["status", "published"],
  ]);

  const orders = trace.filter((c) => c.method === "order");
  assert.deepEqual(orders[0]?.args, ["act", { ascending: true }]);
  assert.deepEqual(orders[1]?.args, ["order_index", { ascending: true }]);

  assert.equal(rows.length, 1);
  const b = rows[0] as Beat;
  assert.equal(b.journeySlug, "directive-14");
  assert.equal(b.beatType, "opening");
  assert.equal(b.orderIndex, 1);
  assert.equal(b.chapterId, "CH01");
});

test("listBeatsByJourney can include drafts when publishedOnly=false", async () => {
  const { client, trace } = makeClient({ data: [], error: null });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await listBeatsByJourney(client as any, "directive-14", {
    publishedOnly: false,
  });
  const eqPairs = trace
    .filter((c) => c.method === "eq")
    .map((c) => [c.args[0], c.args[1]]);
  // Only the journey filter — no status clamp
  assert.deepEqual(eqPairs, [["journey_slug", "directive-14"]]);
});

test("listBeatsByJourney clamps limit between 1 and 500", async () => {
  {
    const { client, trace } = makeClient({ data: [], error: null });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await listBeatsByJourney(client as any, "j", { limit: 99999 });
    assert.equal(trace.find((c) => c.method === "limit")?.args[0], 500);
  }
  {
    const { client, trace } = makeClient({ data: [], error: null });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await listBeatsByJourney(client as any, "j", { limit: 0 });
    assert.equal(trace.find((c) => c.method === "limit")?.args[0], 1);
  }
});

test("listBeatsByJourney returns [] on DB error", async () => {
  const { client } = makeClient({ data: null, error: { message: "x" } });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await listBeatsByJourney(client as any, "j");
  assert.deepEqual(rows, []);
});

// ── listBeatsByChapter ──────────────────────────────────────────────

test("listBeatsByChapter filters by chapter_id + published by default", async () => {
  const { client, trace } = makeClient({ data: [ROW], error: null });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await listBeatsByChapter(client as any, "CH01");

  const eqPairs = trace
    .filter((c) => c.method === "eq")
    .map((c) => [c.args[0], c.args[1]]);
  assert.deepEqual(eqPairs, [
    ["chapter_id", "CH01"],
    ["status", "published"],
  ]);

  assert.equal(rows.length, 1);
});

// ── upsertBeat — idempotency path ───────────────────────────────────

test("upsertBeat inserts when no existing row matches (journey+act+order)", async () => {
  const { client, trace } = makeUpsertClient(
    { data: null, error: null },
    { data: { ...ROW, id: "new-beat" }, error: null },
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const beat = await upsertBeat(client as any, {
    journeySlug: "directive-14",
    chapterId: "CH01",
    sceneSlug: "scene-scene-1-waking-dust",
    act: 1,
    orderIndex: 1,
    beatType: "opening",
    title: ROW.title,
    summary: ROW.summary,
    whyItMatters: ROW.why_it_matters,
    status: "published",
  });

  // Probe + insert
  const froms = trace.filter((c) => c.method === "from");
  assert.equal(froms.length, 2);
  assert.equal(froms[0]?.args[0], "sb_beats");

  const probeEqs = trace.filter((c) => c.method === "eq");
  assert.deepEqual(probeEqs[0]?.args, ["journey_slug", "directive-14"]);
  assert.deepEqual(probeEqs[1]?.args, ["act", 1]);
  assert.deepEqual(probeEqs[2]?.args, ["order_index", 1]);

  const insertCall = trace.find((c) => c.method === "insert");
  const row = insertCall?.args[0] as Record<string, unknown>;
  assert.equal(row.journey_slug, "directive-14");
  assert.equal(row.beat_type, "opening");
  assert.equal(row.why_it_matters, ROW.why_it_matters);

  assert.equal(beat?.id, "new-beat");
});

test("upsertBeat updates existing row when (journey,act,order) matches", async () => {
  const { client, trace } = makeUpsertClient(
    { data: { id: "existing-beat" }, error: null },
    {
      data: { ...ROW, id: "existing-beat", title: "updated title" },
      error: null,
    },
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const beat = await upsertBeat(client as any, {
    journeySlug: "directive-14",
    chapterId: "CH01",
    sceneSlug: null,
    act: 1,
    orderIndex: 1,
    beatType: "opening",
    title: "updated title",
    summary: "",
    whyItMatters: "",
    status: "draft",
  });

  const updateCall = trace.find((c) => c.method === "update");
  const patch = updateCall?.args[0] as Record<string, unknown>;
  assert.equal(patch.title, "updated title");
  assert.equal(patch.status, "draft");
  assert.ok(typeof patch.updated_at === "string");

  const eqAfterUpdate = trace
    .slice(trace.indexOf(updateCall!))
    .find((c) => c.method === "eq");
  assert.deepEqual(eqAfterUpdate?.args, ["id", "existing-beat"]);

  assert.equal(beat?.id, "existing-beat");
  assert.equal(beat?.title, "updated title");
});

test("upsertBeat falls back to plain insert when journey_slug is null", async () => {
  const { client, trace } = makeClient({
    data: { ...ROW, id: "orphan-beat", journey_slug: null },
    error: null,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await upsertBeat(client as any, {
    journeySlug: null,
    chapterId: "CH01",
    sceneSlug: null,
    act: 1,
    orderIndex: 5,
    beatType: "reveal",
    title: "orphan",
    summary: "",
    whyItMatters: "",
    status: "draft",
  });

  // Should NOT have done a probe .eq("journey_slug", ...) when slug is null
  const hasJourneyProbe = trace.some(
    (c) => c.method === "eq" && c.args[0] === "journey_slug",
  );
  assert.equal(hasJourneyProbe, false);
  assert.ok(trace.some((c) => c.method === "insert"));
});

test("upsertBeat returns null if insert errors out", async () => {
  const { client } = makeUpsertClient(
    { data: null, error: null },
    { data: null, error: { message: "RLS denied" } },
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const beat = await upsertBeat(client as any, {
    journeySlug: "j",
    chapterId: null,
    sceneSlug: null,
    act: 1,
    orderIndex: 1,
    beatType: "opening",
    title: "",
    summary: "",
    whyItMatters: "",
    status: "draft",
  });
  assert.equal(beat, null);
});
