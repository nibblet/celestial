/**
 * Ask router — maps an incoming user message to a PersonaRoute.
 *
 * This is the single public entry point the orchestrator uses to decide
 * WHICH personas to fire. It wraps `classifyQuestion` (keeps the
 * simple/deep detection localized) and returns a persona plan plus a
 * human-readable reason (logged to the AI ledger as `meta.route_reason`
 * for future tuning).
 *
 * Routing policy:
 *   - simple  -> ["finder"]                                   (single call)
 *   - deep    -> ["celestial_narrator", "archivist", "lorekeeper"]
 *               (fired in parallel; results merged by the Synthesizer)
 *
 * The orchestrator layers a kill-switch on top of this (ENABLE_DEEP_ASK)
 * so ops can force the single-call path in production if needed.
 */

import { classifyQuestion, type QuestionDepth } from "./classifier";
import type { PersonaKey } from "./personas";

export type PersonaRoute = {
  personas: PersonaKey[];
  depth: QuestionDepth;
  reason: string;
};

export function routeAsk(message: string): PersonaRoute {
  const depth = classifyQuestion(message);

  if (depth === "simple") {
    return {
      personas: ["finder"],
      depth,
      reason: "classified as factual/short lookup",
    };
  }

  return {
    personas: ["celestial_narrator", "archivist", "lorekeeper"],
    depth,
    reason: "classified as deep — multi-perspective synthesis",
  };
}
