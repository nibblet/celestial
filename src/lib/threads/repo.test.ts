import test from "node:test";
import assert from "node:assert/strict";
import {
  createThread,
  listOpenThreads,
  listUnresolvedThroughChapter,
  markResolved,
  type OpenThread,
} from "@/lib/threads/repo";

// ── Fake Supabase query builder ──────────────────────────────────────
//
// Records every method call into `trace` so tests can assert queries
// filter the right columns. Supports the chains we actually call:
//   .from(t).select(cols).order(col, opts).order(col, opts).limit(n)
//   .eq(col, val) at any point in the chain
//   .insert(row).select(cols).single()
//   .update(patch).eq(col, val).select(cols).single()

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
  // Awaiting the chain without .single() returns the result too
  (chain as { then?: unknown }).then = (
    resolve: (v: FakeResult<T>) => unknown,
  ) => {
    return Promise.resolve(result).then(resolve);
  };
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

const ROW = {
  id: "t-1",
  title: "Why is the Vault listening?",
  question: "What is the Vault actually listening for?",
  kind: "mystery" as const,
  opened_in_chapter_id: "CH01",
  opened_in_scene_slug: "scene-waking-dust",
  resolved: false,
  resolved_in_chapter_id: null,
  resolved_in_scene_slug: null,
  notes: "",
  created_at: "2026-04-21T00:00:00.000Z",
  updated_at: "2026-04-21T00:00:00.000Z",
};

// ── listOpenThreads ──────────────────────────────────────────────────

test("listOpenThreads hits sb_open_threads and maps to camelCase", async () => {
  const { client, trace } = makeClient({ data: [ROW], error: null });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await listOpenThreads(client as any);

  const from = trace.find((c) => c.method === "from");
  assert.equal(from?.args[0], "sb_open_threads");

  assert.equal(rows.length, 1);
  const t = rows[0] as OpenThread;
  assert.equal(t.id, "t-1");
  assert.equal(t.openedInChapterId, "CH01");
  assert.equal(t.openedInSceneSlug, "scene-waking-dust");
  assert.equal(t.resolved, false);
  assert.equal(t.resolvedInChapterId, null);
});

test("listOpenThreads applies resolved + chapter filters", async () => {
  const { client, trace } = makeClient({ data: [], error: null });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await listOpenThreads(client as any, {
    resolved: true,
    openedInChapterId: "CH03",
    limit: 50,
  });

  const eqCalls = trace.filter((c) => c.method === "eq");
  const asPairs = eqCalls.map((c) => [c.args[0], c.args[1]]);
  assert.deepEqual(asPairs, [
    ["resolved", true],
    ["opened_in_chapter_id", "CH03"],
  ]);

  const limitCall = trace.find((c) => c.method === "limit");
  assert.equal(limitCall?.args[0], 50);
});

test("listOpenThreads caps limit at 500 and floors at 1", async () => {
  {
    const { client, trace } = makeClient({ data: [], error: null });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await listOpenThreads(client as any, { limit: 99999 });
    assert.equal(trace.find((c) => c.method === "limit")?.args[0], 500);
  }
  {
    const { client, trace } = makeClient({ data: [], error: null });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await listOpenThreads(client as any, { limit: 0 });
    assert.equal(trace.find((c) => c.method === "limit")?.args[0], 1);
  }
});

test("listOpenThreads returns [] on error", async () => {
  const { client } = makeClient({ data: null, error: { message: "x" } });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await listOpenThreads(client as any);
  assert.deepEqual(rows, []);
});

// ── listUnresolvedThroughChapter ─────────────────────────────────────

test("listUnresolvedThroughChapter only returns threads opened at or before the cutoff chapter", async () => {
  const rows = [
    { ...ROW, id: "a", opened_in_chapter_id: "CH01" },
    { ...ROW, id: "b", opened_in_chapter_id: "CH02" },
    { ...ROW, id: "c", opened_in_chapter_id: "CH03" },
    { ...ROW, id: "d", opened_in_chapter_id: "CH10" },
  ];
  const { client, trace } = makeClient({ data: rows, error: null });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const got = await listUnresolvedThroughChapter(client as any, "CH02");

  // always constrains resolved=false
  const eqCalls = trace.filter((c) => c.method === "eq");
  assert.deepEqual(eqCalls[0]?.args, ["resolved", false]);

  assert.deepEqual(
    got.map((t) => t.id),
    ["a", "b"],
  );
});

test("listUnresolvedThroughChapter handles two-digit chapter cutoffs correctly", async () => {
  // Regression: plain string compare would put 'CH10' < 'CH2'. The sort key
  // pads the numeric component so CH10 > CH02.
  const rows = [
    { ...ROW, id: "early", opened_in_chapter_id: "CH02" },
    { ...ROW, id: "late", opened_in_chapter_id: "CH10" },
  ];
  const { client } = makeClient({ data: rows, error: null });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const got = await listUnresolvedThroughChapter(client as any, "CH09");
  assert.deepEqual(
    got.map((t) => t.id),
    ["early"],
  );
});

// ── createThread ─────────────────────────────────────────────────────

test("createThread inserts snake_case row with sensible defaults", async () => {
  const { client, trace } = makeClient({
    data: { ...ROW, id: "new-id" },
    error: null,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = await createThread(client as any, {
    title: "What is Galen afraid to hear?",
    question: "He flinches whenever the ansible pings — why?",
    openedInChapterId: "CH02",
  });

  const insertCall = trace.find((c) => c.method === "insert");
  const row = insertCall?.args[0] as Record<string, unknown>;
  assert.equal(row.title, "What is Galen afraid to hear?");
  assert.equal(row.kind, "mystery"); // default
  assert.equal(row.opened_in_chapter_id, "CH02");
  assert.equal(row.opened_in_scene_slug, null);
  assert.equal(row.notes, "");

  assert.equal(t?.id, "new-id");
});

test("createThread passes through explicit kind/notes/scene", async () => {
  const { client, trace } = makeClient({ data: ROW, error: null });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await createThread(client as any, {
    title: "Contradiction: year mismatch",
    question: "Prologue says 2050; CH02 log says 2049.",
    kind: "contradiction",
    openedInChapterId: "CH02",
    openedInSceneSlug: "scene-the-quiet-weight",
    notes: "flagged by continuity pass",
  });
  const row = trace.find((c) => c.method === "insert")?.args[0] as Record<
    string,
    unknown
  >;
  assert.equal(row.kind, "contradiction");
  assert.equal(row.opened_in_scene_slug, "scene-the-quiet-weight");
  assert.equal(row.notes, "flagged by continuity pass");
});

test("createThread returns null on DB error", async () => {
  const { client } = makeClient({ data: null, error: { message: "RLS" } });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = await createThread(client as any, {
    title: "t",
    question: "q",
    openedInChapterId: "CH01",
  });
  assert.equal(t, null);
});

// ── markResolved ─────────────────────────────────────────────────────

test("markResolved patches resolved + resolution fields and targets by id", async () => {
  const resolved = {
    ...ROW,
    resolved: true,
    resolved_in_chapter_id: "CH12",
    resolved_in_scene_slug: "scene-final-ping",
  };
  const { client, trace } = makeClient({ data: resolved, error: null });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = await markResolved(client as any, "t-1", {
    resolvedInChapterId: "CH12",
    resolvedInSceneSlug: "scene-final-ping",
  });

  const updateCall = trace.find((c) => c.method === "update");
  const patch = updateCall?.args[0] as Record<string, unknown>;
  assert.equal(patch.resolved, true);
  assert.equal(patch.resolved_in_chapter_id, "CH12");
  assert.equal(patch.resolved_in_scene_slug, "scene-final-ping");
  assert.ok(typeof patch.updated_at === "string");
  assert.ok(!Object.prototype.hasOwnProperty.call(patch, "notes"));

  const eqCall = trace.find((c) => c.method === "eq");
  assert.deepEqual(eqCall?.args, ["id", "t-1"]);

  assert.equal(t?.resolved, true);
  assert.equal(t?.resolvedInChapterId, "CH12");
});

test("markResolved writes notes when supplied", async () => {
  const { client, trace } = makeClient({ data: ROW, error: null });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await markResolved(client as any, "t-1", {
    resolvedInChapterId: "CH12",
    notes: "resolved off-screen via Beyond reflection",
  });
  const patch = trace.find((c) => c.method === "update")?.args[0] as Record<
    string,
    unknown
  >;
  assert.equal(patch.notes, "resolved off-screen via Beyond reflection");
});
