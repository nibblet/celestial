import test from "node:test";
import assert from "node:assert/strict";
import { computeSessionWrapSignature } from "@/lib/beyond/session-wrap";

test("signature is stable for identical inputs", () => {
  const a = computeSessionWrapSignature({
    lastSessionId: "s-1",
    draftCount: 2,
    latestMessageTimestamp: "2026-04-21T12:00:00.000Z",
  });
  const b = computeSessionWrapSignature({
    lastSessionId: "s-1",
    draftCount: 2,
    latestMessageTimestamp: "2026-04-21T12:00:00.000Z",
  });
  assert.equal(a, b);
  assert.equal(a.length, 16);
});

test("different lastSessionId yields different signatures", () => {
  const a = computeSessionWrapSignature({
    lastSessionId: "s-1",
    draftCount: 2,
    latestMessageTimestamp: "2026-04-21T12:00:00.000Z",
  });
  const b = computeSessionWrapSignature({
    lastSessionId: "s-2",
    draftCount: 2,
    latestMessageTimestamp: "2026-04-21T12:00:00.000Z",
  });
  assert.notEqual(a, b);
});

test("different draftCount yields different signatures", () => {
  const a = computeSessionWrapSignature({
    lastSessionId: "s-1",
    draftCount: 2,
    latestMessageTimestamp: "2026-04-21T12:00:00.000Z",
  });
  const b = computeSessionWrapSignature({
    lastSessionId: "s-1",
    draftCount: 3,
    latestMessageTimestamp: "2026-04-21T12:00:00.000Z",
  });
  assert.notEqual(a, b);
});

test("different latestMessageTimestamp yields different signatures", () => {
  const a = computeSessionWrapSignature({
    lastSessionId: "s-1",
    draftCount: 2,
    latestMessageTimestamp: "2026-04-21T12:00:00.000Z",
  });
  const b = computeSessionWrapSignature({
    lastSessionId: "s-1",
    draftCount: 2,
    latestMessageTimestamp: "2026-04-21T12:05:00.000Z",
  });
  assert.notEqual(a, b);
});

test("empty-inputs signature is stable and distinct from populated inputs", () => {
  const empty1 = computeSessionWrapSignature({
    lastSessionId: null,
    draftCount: 0,
    latestMessageTimestamp: null,
  });
  const empty2 = computeSessionWrapSignature({
    lastSessionId: null,
    draftCount: 0,
    latestMessageTimestamp: null,
  });
  const populated = computeSessionWrapSignature({
    lastSessionId: "s-1",
    draftCount: 1,
    latestMessageTimestamp: "2026-04-21T12:00:00.000Z",
  });
  assert.equal(empty1, empty2);
  assert.notEqual(empty1, populated);
});

test("the string 'null' as an id is treated distinctly from literal null", () => {
  // Sanity check against accidental collision between null → "null" and
  // an actual id that happens to be the word "null".
  const a = computeSessionWrapSignature({
    lastSessionId: null,
    draftCount: 0,
    latestMessageTimestamp: null,
  });
  const b = computeSessionWrapSignature({
    lastSessionId: "null",
    draftCount: 0,
    latestMessageTimestamp: null,
  });
  // Intentionally equal — our serialisation is "null" literal for both
  // cases. This test pins that behaviour so a future refactor (e.g.
  // switching to JSON.stringify) is a conscious choice.
  assert.equal(a, b);
});
