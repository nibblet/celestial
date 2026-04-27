import test from "node:test";
import assert from "node:assert/strict";
import { classifyAskIntent } from "./ask-intent";

test("classifyAskIntent identifies factual lookup questions", () => {
  const intent = classifyAskIntent("When did Valkyrie-1 launch?");

  assert.equal(intent.kind, "factual");
  assert.ok(intent.confidence >= 0.7);
  assert.match(intent.reason, /factual|lookup|when/i);
});

test("classifyAskIntent identifies character arc questions", () => {
  const intent = classifyAskIntent(
    "How is Thane Meric changing after Directive 14?",
  );

  assert.equal(intent.kind, "character_arc");
  assert.ok(intent.confidence >= 0.7);
});

test("classifyAskIntent identifies bounded future speculation questions", () => {
  const intent = classifyAskIntent(
    "What might happen next if the Vault keeps listening?",
  );

  assert.equal(intent.kind, "future_speculation");
  assert.ok(intent.confidence >= 0.7);
});

test("classifyAskIntent identifies world-rule questions", () => {
  const intent = classifyAskIntent("How does resonance memory work?");

  assert.equal(intent.kind, "world_rule");
  assert.ok(intent.confidence >= 0.6);
});
