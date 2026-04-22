import test from "node:test";
import assert from "node:assert/strict";
import { getRulesContext } from "./prompts";

test("getRulesContext loads wiki rules markdown", () => {
  const ctx = getRulesContext();
  assert.ok(ctx.includes("World rules"));
  assert.ok(ctx.includes("/rules/"));
});
