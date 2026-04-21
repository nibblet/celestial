import test from "node:test";
import assert from "node:assert/strict";
import { routeAsk } from "@/lib/ai/router";

test("short factual lookups route to finder", () => {
  const r = routeAsk("When did Valkyrie-1 launch?");
  assert.equal(r.depth, "simple");
  assert.deepEqual(r.personas, ["finder"]);
  assert.match(r.reason, /factual|lookup/i);
});

test("list queries route to finder", () => {
  const r = routeAsk("List the stories where the Vault appears.");
  assert.equal(r.depth, "simple");
  assert.deepEqual(r.personas, ["finder"]);
});

test("very short questions route to finder", () => {
  // < 20 chars -> classifier returns "simple"
  const r = routeAsk("who is Kael?");
  assert.equal(r.depth, "simple");
  assert.deepEqual(r.personas, ["finder"]);
});

test("reflective / thematic questions route to the 3-persona deep path", () => {
  const r = routeAsk(
    "How does grief echo across the Valkyrie crew's journey and why does it matter for the reader?",
  );
  assert.equal(r.depth, "deep");
  assert.deepEqual(r.personas, [
    "celestial_narrator",
    "archivist",
    "lorekeeper",
  ]);
  assert.match(r.reason, /deep|multi-perspective/i);
});

test("route always includes a reason string for ledger telemetry", () => {
  for (const q of [
    "When did it happen?",
    "Why does the silence keep listening back across chapters?",
  ]) {
    const r = routeAsk(q);
    assert.ok(r.reason.length > 0, `route for "${q}" has a reason`);
  }
});

test("deep route lists exactly 3 personas with no duplicates", () => {
  const r = routeAsk(
    "What's the deeper pattern connecting Frances Cobb and Bayne Cobb in the text?",
  );
  assert.equal(r.personas.length, 3);
  assert.equal(new Set(r.personas).size, 3);
});
