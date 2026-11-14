import { test } from "node:test";
import assert from "node:assert/strict";

import { MAX_CAST, castKey, parseCast } from "./cast";

test("parses comma-separated slug:state entries", () => {
  assert.deepEqual(parseCast("galen-voss:mars_surface, aven-voss:mars_surface"), [
    { id: "galen-voss", state: "mars_surface" },
    { id: "aven-voss", state: "mars_surface" },
  ]);
});

test("state is optional, blanks and duplicates are dropped", () => {
  assert.deepEqual(parseCast("thane-meric, , thane-meric:shipboard\nlena-osei"), [
    { id: "thane-meric" },
    { id: "lena-osei" },
  ]);
});

test("accepts arrays of strings or objects", () => {
  assert.deepEqual(parseCast(["galen-voss:mars_canopy", { id: "aven-voss", state: " " }]), [
    { id: "galen-voss", state: "mars_canopy" },
    { id: "aven-voss" },
  ]);
});

test("empty input is an empty cast", () => {
  assert.deepEqual(parseCast(""), []);
  assert.deepEqual(parseCast(undefined), []);
});

test("rejects malformed slugs, states and oversized casts", () => {
  assert.throws(() => parseCast("Galen Voss"), /character slug/);
  assert.throws(() => parseCast("../etc"), /character slug/);
  assert.throws(() => parseCast("galen-voss:mars surface"), /valid state/);
  assert.throws(() => parseCast("a:b:c"), /Couldn't read/);
  const many = Array.from({ length: MAX_CAST + 1 }, (_, i) => `c${i}`).join(",");
  assert.throws(() => parseCast(many), /At most/);
});

test("cast key is order-independent", () => {
  assert.equal(
    castKey(parseCast("galen-voss:mars_surface, aven-voss")),
    castKey(parseCast("aven-voss, galen-voss:mars_surface")),
  );
});
