import test from "node:test";
import assert from "node:assert/strict";
import { storiesData, timelineData } from "@/lib/wiki/static-data";
import { getTimeline } from "@/lib/wiki/parser";

test("Phase 4 — static catalogue and timeline resolve after IA cutover", () => {
  assert.ok(storiesData.length > 0, "storiesData must list published chapters");
  assert.ok(timelineData.length > 0, "timelineData must mirror wiki timeline ingest");
  assert.ok(getTimeline().length > 0, "getTimeline must merge file + fallback rows");
});
