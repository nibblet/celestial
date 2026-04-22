import test from "node:test";
import assert from "node:assert/strict";
import {
  verifyAskAnswer,
  getAskVerifierStrictnessFromEnv,
} from "./ask-verifier";

test("when strictness is off, verifier returns empty issues", async () => {
  const prev = process.env.ASK_VERIFIER_STRICTNESS;
  process.env.ASK_VERIFIER_STRICTNESS = "off";
  try {
    assert.equal(getAskVerifierStrictnessFromEnv(), "off");
    const r = await verifyAskAnswer({
      userQuestion: "Who is Galen?",
      assistantText: "Galen appears in chapter one.",
      linksInAnswer: [],
    });
    assert.equal(r.strictness, "off");
    assert.equal(r.issues.length, 0);
  } finally {
    if (prev === undefined) delete process.env.ASK_VERIFIER_STRICTNESS;
    else process.env.ASK_VERIFIER_STRICTNESS = prev;
  }
});
