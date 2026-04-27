import test from "node:test";
import assert from "node:assert/strict";
import { routeAsk } from "./router";
import { resolveAskRoute } from "./orchestrator";

test("resolveAskRoute uses wiki-first answerer for normal deep Ask", () => {
  const classifiedRoute = routeAsk(
    "How does grief echo across the crew's journey and why does it matter?",
  );

  const route = resolveAskRoute({
    classifiedRoute,
    askModeRequested: "deep",
    deepEnabled: true,
    multiPersonaEnabled: false,
  });

  assert.deepEqual(route.personas, ["ask_answerer"]);
  assert.match(route.reason, /wiki-first single-call/i);
});

test("resolveAskRoute keeps legacy multi-persona only behind explicit fallback gate", () => {
  const classifiedRoute = routeAsk(
    "How does grief echo across the crew's journey and why does it matter?",
  );

  const route = resolveAskRoute({
    classifiedRoute,
    askModeRequested: "deep",
    deepEnabled: true,
    multiPersonaEnabled: true,
  });

  assert.deepEqual(route.personas, [
    "celestial_narrator",
    "archivist",
    "lorekeeper",
  ]);
});
