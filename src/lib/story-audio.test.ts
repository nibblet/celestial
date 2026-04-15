import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_LISTEN_WPM,
  formatEstimatedListenLabel,
  getEstimatedListenMinutes,
} from "@/lib/story-audio";

test("returns 0 minutes for missing or zero word counts", () => {
  assert.equal(getEstimatedListenMinutes(0), 0);
  assert.equal(getEstimatedListenMinutes(-10), 0);
});

test("formats very short stories as less than one minute", () => {
  assert.equal(formatEstimatedListenLabel(1), "< 1 min listen");
  assert.equal(formatEstimatedListenLabel(DEFAULT_LISTEN_WPM - 1), "< 1 min listen");
});

test("rounds up mid-length stories to whole minutes", () => {
  assert.equal(getEstimatedListenMinutes(528), 4);
  assert.equal(formatEstimatedListenLabel(528), "4 min listen");
});

test("formats longer memoir stories consistently", () => {
  assert.equal(getEstimatedListenMinutes(2456), 16);
  assert.equal(formatEstimatedListenLabel(2456), "16 min listen");
});
