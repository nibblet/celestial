import test from "node:test";
import assert from "node:assert/strict";
import {
  decideReflectionAction,
  getOrGenerateBeyondReflection,
} from "@/lib/ai/reflections";

// ── Pure decision ────────────────────────────────────────────────────

test("decideReflectionAction returns 'generate' when no cached row exists", () => {
  assert.equal(
    decideReflectionAction({ cached: null, inputSignature: "sig-1" }),
    "generate",
  );
});

test("decideReflectionAction returns 'use-cache' when signatures match", () => {
  assert.equal(
    decideReflectionAction({
      cached: { reflection_text: "x", input_signature: "sig-1" },
      inputSignature: "sig-1",
    }),
    "use-cache",
  );
});

test("decideReflectionAction returns 'generate' when signatures differ", () => {
  assert.equal(
    decideReflectionAction({
      cached: { reflection_text: "x", input_signature: "sig-1" },
      inputSignature: "sig-2" },
    ),
    "generate",
  );
});

// ── Programmable Supabase mock ───────────────────────────────────────
//
// Each .from(table) call consumes the next "response" in the queue. The
// chain records every method call into `trace` so tests can assert the
// query was shaped correctly. Terminal methods supported:
//   .maybeSingle()        — for reads
//   .select().single()    — for ledger inserts
//   awaiting the chain    — for terminal update/insert statements

type FakeResponse = {
  data?: unknown;
  error?: { message: string } | null;
};

type Call = { method: string; args: unknown[]; table?: string };

function makeClient(queue: FakeResponse[]) {
  const trace: Call[] = [];
  let idx = 0;

  function nextResponse(): FakeResponse {
    const r = queue[idx] ?? { data: null, error: null };
    idx += 1;
    return r;
  }

  function makeChain(table: string) {
    const res = nextResponse();
    const chain: Record<string, unknown> = {};
    for (const m of [
      "select",
      "insert",
      "update",
      "eq",
      "is",
      "order",
      "limit",
    ]) {
      chain[m] = (...args: unknown[]) => {
        trace.push({ method: m, args, table });
        return chain;
      };
    }
    chain.maybeSingle = async () => ({
      data: res.data ?? null,
      error: res.error ?? null,
    });
    chain.single = async () => ({
      data: res.data ?? null,
      error: res.error ?? null,
    });
    // Awaiting the chain terminally (update/insert without select) also
    // returns the queued response.
    (chain as { then?: unknown }).then = (
      resolve: (v: FakeResponse) => unknown,
    ) => Promise.resolve({ data: res.data ?? null, error: res.error ?? null }).then(resolve);
    return chain;
  }

  const client = {
    from(table: string) {
      trace.push({ method: "from", args: [table] });
      return makeChain(table);
    },
  };
  return { client, trace, get calls() { return idx; } };
}

// ── Cache hit ────────────────────────────────────────────────────────

test("cache hit returns cached text without calling generate() or logging", async () => {
  // Queue: 1 response for the read (maybeSingle), nothing else
  const { client, trace } = makeClient([
    {
      data: { reflection_text: "Cached wrap.", input_signature: "sig-hit" },
      error: null,
    },
  ]);
  let generateCalled = false;

  const result = await getOrGenerateBeyondReflection({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: client as any,
    userId: "user-1",
    kind: "session_wrap",
    targetId: null,
    inputSignature: "sig-hit",
    model: "claude-sonnet-4-20250514",
    contextType: "beyond",
    contextId: "ctx-1",
    generate: async () => {
      generateCalled = true;
      return { text: "should-not-be-used" };
    },
  });

  assert.equal(result.text, "Cached wrap.");
  assert.equal(result.generated, false);
  assert.equal(generateCalled, false);

  const fromCalls = trace.filter((c) => c.method === "from");
  assert.equal(fromCalls.length, 1);
  assert.equal(fromCalls[0]?.args[0], "sb_beyond_reflections");
});

// ── Cache miss: no row ──────────────────────────────────────────────

test("cache miss (no row) generates, logs, and inserts, returning generated=true", async () => {
  // Queue:
  //   1. read (no row)
  //   2. logAiCall insert → returns id
  //   3. persistReflection read (no row, same as step 1)
  //   4. persistReflection insert (no select chain)
  const { client, trace } = makeClient([
    { data: null, error: null },
    { data: { id: "ai-123" }, error: null },
    { data: null, error: null },
    { data: null, error: null },
  ]);
  let generateCalled = 0;

  const result = await getOrGenerateBeyondReflection({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: client as any,
    userId: "user-1",
    kind: "session_wrap",
    targetId: null,
    inputSignature: "sig-new",
    model: "claude-sonnet-4-20250514",
    contextType: "beyond",
    contextId: "ctx-1",
    generate: async () => {
      generateCalled += 1;
      return { text: "Fresh wrap.", inputTokens: 100, outputTokens: 50 };
    },
  });

  assert.equal(result.text, "Fresh wrap.");
  assert.equal(result.generated, true);
  assert.equal(generateCalled, 1);

  const tables = trace
    .filter((c) => c.method === "from")
    .map((c) => c.args[0]);
  // read → ledger → read-before-write → insert
  assert.deepEqual(tables, [
    "sb_beyond_reflections",
    "sb_ai_interactions",
    "sb_beyond_reflections",
    "sb_beyond_reflections",
  ]);
  assert.ok(
    trace.some((c) => c.method === "insert" && c.table === "sb_beyond_reflections"),
    "insert on sb_beyond_reflections should fire",
  );
});

// ── Cache miss: signature mismatch ──────────────────────────────────

test("cache miss (signature mismatch) triggers update path, not insert", async () => {
  // Queue:
  //   1. initial read → cached row (old sig)
  //   2. ledger insert → id
  //   3. persistReflection read → same cached row
  //   4. update → ok
  const cachedRow = { reflection_text: "Old wrap.", input_signature: "sig-old" };
  const { client, trace } = makeClient([
    { data: cachedRow, error: null },
    { data: { id: "ai-200" }, error: null },
    { data: cachedRow, error: null },
    { data: null, error: null },
  ]);

  const result = await getOrGenerateBeyondReflection({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: client as any,
    userId: "user-1",
    kind: "session_wrap",
    targetId: null,
    inputSignature: "sig-new",
    model: "claude-sonnet-4-20250514",
    contextType: "beyond",
    generate: async () => ({ text: "New wrap.", inputTokens: 80, outputTokens: 40 }),
  });

  assert.equal(result.generated, true);
  assert.equal(result.text, "New wrap.");

  const updates = trace.filter(
    (c) => c.method === "update" && c.table === "sb_beyond_reflections",
  );
  const inserts = trace.filter(
    (c) => c.method === "insert" && c.table === "sb_beyond_reflections",
  );
  assert.equal(updates.length, 1);
  assert.equal(inserts.length, 0);
});

// ── Fail-open on read error ─────────────────────────────────────────

test("DB read error is swallowed; generator runs and output is returned", async () => {
  // Queue:
  //   1. initial read → error (treated as no cache)
  //   2. ledger insert → id
  //   3. persistReflection read → error again
  //   4. (persist-read fails → insert path) → insert ok
  const { client } = makeClient([
    { data: null, error: { message: "offline" } },
    { data: { id: "ai-300" }, error: null },
    { data: null, error: { message: "offline" } },
    { data: null, error: null },
  ]);

  const result = await getOrGenerateBeyondReflection({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: client as any,
    userId: "user-1",
    kind: "session_wrap",
    targetId: null,
    inputSignature: "sig-any",
    model: "claude-sonnet-4-20250514",
    contextType: "beyond",
    generate: async () => ({ text: "Graceful fallback." }),
  });

  assert.equal(result.text, "Graceful fallback.");
  assert.equal(result.generated, true);
});

// ── targetId scoping ────────────────────────────────────────────────

test("targetId non-null filters with .eq, not .is", async () => {
  const { client, trace } = makeClient([
    {
      data: { reflection_text: "Draft digest.", input_signature: "sig-d" },
      error: null,
    },
  ]);
  await getOrGenerateBeyondReflection({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: client as any,
    userId: "u",
    kind: "draft_digest",
    targetId: "draft-42",
    inputSignature: "sig-d",
    model: "claude-sonnet-4-20250514",
    contextType: "beyond",
    generate: async () => ({ text: "unused" }),
  });

  const eqCalls = trace.filter((c) => c.method === "eq");
  const isCalls = trace.filter((c) => c.method === "is");
  assert.ok(
    eqCalls.some((c) => c.args[0] === "target_id" && c.args[1] === "draft-42"),
    "target_id should be matched with .eq when non-null",
  );
  assert.equal(
    isCalls.filter((c) => c.args[0] === "target_id").length,
    0,
    "should never use .is(target_id, null) when targetId is provided",
  );
});
