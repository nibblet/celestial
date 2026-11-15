import { test } from "node:test";
import assert from "node:assert/strict";

import {
  RUNWAY_MAX_DATA_URI_BYTES,
  RUNWAY_MAX_PROMPT_CHARS,
  RUNWAY_RESTRAINT_SUFFIX,
  clampRunwayPrompt,
  withRestraint,
  runwayDurationFor,
  runwayRatioFor,
  klingReferencePreamble,
  isKlingO3,
  supportsEndFrame,
  toDataUri,
} from "./runway-helpers";

test("gen4_turbo snaps to 5 or 10 seconds", () => {
  assert.equal(runwayDurationFor("gen4_turbo", 3), 5);
  assert.equal(runwayDurationFor("gen4_turbo", 5), 5);
  assert.equal(runwayDurationFor("gen4_turbo", 8), 10);
  assert.equal(runwayDurationFor("gen4_turbo", 12), 10);
});

test("gen4.5 clamps to 2-10 whole seconds", () => {
  assert.equal(runwayDurationFor("gen4.5", 1), 2);
  assert.equal(runwayDurationFor("gen4.5", 3), 3);
  assert.equal(runwayDurationFor("gen4.5", 7.6), 8);
  assert.equal(runwayDurationFor("gen4.5", 30), 10);
  assert.equal(runwayDurationFor("gen4.5", Number.NaN), 5);
});

test("prompt text is clamped to Runway's limit at a sentence boundary", () => {
  const sentence = "He breathes slowly and looks toward the stars. ";
  const long = sentence.repeat(40);
  const out = clampRunwayPrompt(long);
  assert.ok(out.length <= RUNWAY_MAX_PROMPT_CHARS);
  assert.ok(out.endsWith("."));
  assert.equal(clampRunwayPrompt("  short   text "), "short text");
});

test("data URI encodes with the content type and enforces the 5MB cap", () => {
  const uri = toDataUri(new Uint8Array([1, 2, 3]), "image/png");
  assert.equal(uri, "data:image/png;base64,AQID");
  const tooBig = new Uint8Array(Math.ceil((RUNWAY_MAX_DATA_URI_BYTES * 3) / 4) + 10);
  assert.throws(() => toDataUri(tooBig, "image/png"), /too large/);
});

test("every Runway prompt ends with the restraint suffix and stays under the cap", () => {
  const short = withRestraint("Slow push-in. He breathes.");
  assert.ok(short.startsWith("Slow push-in. He breathes."));
  assert.ok(short.endsWith(RUNWAY_RESTRAINT_SUFFIX));
  const long = withRestraint("He looks toward the stars and breathes slowly. ".repeat(60));
  assert.ok(long.length <= RUNWAY_MAX_PROMPT_CHARS);
  assert.ok(long.endsWith(RUNWAY_RESTRAINT_SUFFIX));
  assert.equal(withRestraint("   "), RUNWAY_RESTRAINT_SUFFIX);
});

test("Kling O3: durations 3-15, tier-specific ratios", () => {
  assert.ok(isKlingO3("klingO3_pro") && !isKlingO3("gen4.5"));
  assert.equal(runwayDurationFor("klingO3_standard", 2), 3);
  assert.equal(runwayDurationFor("klingO3_pro", 15), 15);
  assert.equal(runwayDurationFor("klingO3_pro", 40), 15);
  assert.equal(runwayRatioFor("klingO3_pro", "16:9"), "1920:1080");
  assert.equal(runwayRatioFor("klingO3_standard", "16:9"), "1280:720");
  assert.equal(runwayRatioFor("klingO3_standard", "9:16"), "720:1280");
  assert.equal(runwayRatioFor("klingO3_pro", "4:5"), "1440:1440");
  assert.equal(runwayRatioFor("gen4.5", "4:5"), "832:1104");
});

test("Kling preamble names the start frame then each reference in order", () => {
  const text = klingReferencePreamble(["Galen Voss approved portrait", "Aven Voss approved portrait"]);
  assert.match(text, /^<<<image_1>>> is the start frame/);
  assert.match(text, /<<<image_2>>> is Galen Voss approved portrait/);
  assert.match(text, /<<<image_3>>> is Aven Voss approved portrait/);
});

test("restraint suffix forbids orbiting and revealing new faces", () => {
  assert.match(RUNWAY_RESTRAINT_SUFFIX, /no orbiting/);
  assert.match(RUNWAY_RESTRAINT_SUFFIX, /no new faces are revealed/);
  assert.ok(withRestraint("x".repeat(3000), 2400).length <= 2400);
});

test("end frames: Kling O3 and Gen-4.5 yes, Gen-4 Turbo no; preamble shifts reference tokens", () => {
  assert.ok(supportsEndFrame("klingO3_pro") && supportsEndFrame("gen4.5"));
  assert.ok(!supportsEndFrame("gen4_turbo"));
  const text = klingReferencePreamble(["Galen Voss approved portrait"], true);
  assert.match(text, /<<<image_2>>> is the end frame/);
  assert.match(text, /<<<image_3>>> is Galen Voss approved portrait/);
});
