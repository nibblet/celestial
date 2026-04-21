import test from "node:test";
import assert from "node:assert/strict";
import { estimateCostUsd, logAiCall, type AiCallRecord } from "@/lib/ai/ledger";

test("estimateCostUsd returns null for unknown model", () => {
  assert.equal(estimateCostUsd("unknown-model", 1000, 1000), null);
});

test("estimateCostUsd returns null when tokens are missing", () => {
  assert.equal(estimateCostUsd("claude-sonnet-4-20250514", null, 500), null);
  assert.equal(estimateCostUsd("claude-sonnet-4-20250514", 500, null), null);
  assert.equal(estimateCostUsd("claude-sonnet-4-20250514", undefined, undefined), null);
});

test("estimateCostUsd computes USD using per-1K rates for sonnet-4", () => {
  const got = estimateCostUsd("claude-sonnet-4-20250514", 1000, 500);
  assert.ok(got !== null);
  // 1K in @ $0.003 + 0.5K out @ $0.015 = 0.003 + 0.0075 = 0.0105
  assert.ok(Math.abs((got as number) - 0.0105) < 1e-9);
});

test("estimateCostUsd computes USD for haiku-3-5 correctly", () => {
  const got = estimateCostUsd("claude-3-5-haiku-20241022", 2000, 1000);
  assert.ok(got !== null);
  // 2K in @ $0.0008 + 1K out @ $0.004 = 0.0016 + 0.004 = 0.0056
  assert.ok(Math.abs((got as number) - 0.0056) < 1e-9);
});

test("estimateCostUsd handles zero tokens as $0", () => {
  const got = estimateCostUsd("claude-sonnet-4-20250514", 0, 0);
  assert.equal(got, 0);
});

// ── logAiCall with a fake Supabase client ────────────────────────────

type InsertedRow = Record<string, unknown>;

function makeFakeClient(opts: {
  insertError?: { message: string } | null;
  generatedId?: string;
  onInsert?: (row: InsertedRow) => void;
  throws?: Error;
}) {
  return {
    from(table: string) {
      return {
        insert(row: InsertedRow) {
          opts.onInsert?.({ __table: table, ...row });
          return {
            select() {
              return {
                async single() {
                  if (opts.throws) throw opts.throws;
                  if (opts.insertError) {
                    return { data: null, error: opts.insertError };
                  }
                  return { data: { id: opts.generatedId ?? "row-1" }, error: null };
                },
              };
            },
          };
        },
      };
    },
  };
}

test("logAiCall inserts into sb_ai_interactions and returns the row id", async () => {
  let captured: InsertedRow | null = null;
  const client = makeFakeClient({
    generatedId: "ai-int-123",
    onInsert: (row) => {
      captured = row;
    },
  });
  const record: AiCallRecord = {
    userId: "user-abc",
    persona: "narrator",
    contextType: "ask",
    contextId: "conv-xyz",
    model: "claude-sonnet-4-20250514",
    inputTokens: 1000,
    outputTokens: 500,
    latencyMs: 842,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const id = await logAiCall(client as any, record);
  assert.equal(id, "ai-int-123");
  assert.ok(captured, "insert should have been called");
  const row = captured as InsertedRow;
  assert.equal(row.__table, "sb_ai_interactions");
  assert.equal(row.user_id, "user-abc");
  assert.equal(row.persona, "narrator");
  assert.equal(row.context_type, "ask");
  assert.equal(row.context_id, "conv-xyz");
  assert.equal(row.model, "claude-sonnet-4-20250514");
  assert.equal(row.input_tokens, 1000);
  assert.equal(row.output_tokens, 500);
  assert.equal(row.latency_ms, 842);
  // Cost is auto-derived when omitted: 1K*$0.003 + 0.5K*$0.015 = $0.0105
  assert.ok(typeof row.cost_usd === "number");
  assert.ok(Math.abs((row.cost_usd as number) - 0.0105) < 1e-9);
  assert.equal(row.status, "ok");
  assert.deepEqual(row.meta, {});
});

test("logAiCall defaults optional fields and honors explicit cost override", async () => {
  let captured: InsertedRow | null = null;
  const client = makeFakeClient({
    onInsert: (row) => {
      captured = row;
    },
  });
  await logAiCall(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client as any,
    {
      persona: "finder",
      contextType: "ask",
      model: "unknown-model",
      costUsd: 0.0005,
    }
  );
  assert.ok(captured);
  const row = captured as InsertedRow;
  assert.equal(row.user_id, null);
  assert.equal(row.context_id, null);
  assert.equal(row.input_tokens, null);
  assert.equal(row.output_tokens, null);
  assert.equal(row.latency_ms, null);
  assert.equal(row.cost_usd, 0.0005);
  assert.equal(row.error_message, null);
});

test("logAiCall records error status with message", async () => {
  let captured: InsertedRow | null = null;
  const client = makeFakeClient({
    onInsert: (row) => {
      captured = row;
    },
  });
  await logAiCall(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client as any,
    {
      persona: "narrator",
      contextType: "ask",
      model: "claude-sonnet-4-20250514",
      status: "error",
      errorMessage: "upstream timeout",
    }
  );
  assert.ok(captured);
  const row = captured as InsertedRow;
  assert.equal(row.status, "error");
  assert.equal(row.error_message, "upstream timeout");
});

test("logAiCall swallows insert errors and returns null", async () => {
  const client = makeFakeClient({
    insertError: { message: "RLS blocked" },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const id = await logAiCall(client as any, {
    persona: "narrator",
    contextType: "ask",
    model: "claude-sonnet-4-20250514",
  });
  assert.equal(id, null);
});

test("logAiCall swallows unexpected throws and returns null", async () => {
  const client = makeFakeClient({
    throws: new Error("network down"),
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const id = await logAiCall(client as any, {
    persona: "narrator",
    contextType: "ask",
    model: "claude-sonnet-4-20250514",
  });
  assert.equal(id, null);
});
