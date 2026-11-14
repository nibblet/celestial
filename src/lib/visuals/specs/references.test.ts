import { test } from "node:test";
import assert from "node:assert/strict";

import {
  collectReferenceImages,
  mergeShotReferences,
  renderReferenceImagesForPrompt,
} from "./references";

const patch = {
  path: "/visual-references/project-valkyrie-patch.png",
  role: "insignia",
  label: "PROJECT VALKYRIE patch",
};
const portrait = {
  path: "/visual-references/galen-voss-portrait.png",
  role: "identity",
  label: "Galen Voss identity portrait",
  instruction: "match face exactly",
};

test("collects references across layers, identity first", () => {
  const refs = collectReferenceImages([
    { name: "valkyrie-crew:master", data: { reference_images: [patch] } },
    { name: "master", data: { reference_images: [portrait] } },
  ]);
  assert.deepEqual(
    refs.map((r) => r.role),
    ["identity", "insignia"],
  );
  assert.equal(refs[0].instruction, "match face exactly");
});

test("a later layer overrides an inherited entry with the same path", () => {
  const refs = collectReferenceImages([
    { name: "parent", data: { reference_images: [patch] } },
    {
      name: "child",
      data: { reference_images: [{ ...patch, instruction: "render as embroidery" }] },
    },
  ]);
  assert.equal(refs.length, 1);
  assert.equal(refs[0].instruction, "render as embroidery");
});

test("resemblance references sort after identity and before insignia", () => {
  const grandparent = {
    path: "/visual-references/aven-voss-portrait.png",
    role: "resemblance",
    label: "Aven Voss (grandmother)",
  };
  const refs = collectReferenceImages([
    { name: "parent", data: { reference_images: [patch] } },
    { name: "master", data: { reference_images: [grandparent, portrait] } },
  ]);
  assert.deepEqual(refs.map((r) => r.role), ["identity", "resemblance", "insignia"]);
  assert.match(renderReferenceImagesForPrompt(refs), /family likeness only/);
});

test("drops invalid entries and non-array values", () => {
  const refs = collectReferenceImages([
    { name: "a", data: { reference_images: "nope" } },
    {
      name: "b",
      data: {
        reference_images: [
          { path: "relative/path.png", role: "insignia", label: "bad path" },
          { path: "/ok.png", role: "unknown", label: "bad role" },
          { path: "/ok.png", role: "prop", label: "" },
          patch,
        ],
      },
    },
  ]);
  assert.deepEqual(refs.map((r) => r.path), [patch.path]);
});

test("layers without reference_images contribute nothing", () => {
  assert.deepEqual(collectReferenceImages([{ name: "x", data: { entity: "x" } }]), []);
});

test("prompt block lists each reference with its instruction", () => {
  const text = renderReferenceImagesForPrompt(
    collectReferenceImages([{ name: "m", data: { reference_images: [portrait, patch] } }]),
  );
  assert.match(text, /1\. \[identity\] Galen Voss identity portrait — match face exactly/);
  assert.match(text, /2\. \[insignia\] PROJECT VALKYRIE patch/);
  assert.equal(renderReferenceImagesForPrompt([]), "");
});

test("inherit:false references apply to their own entity only", () => {
  const hull = {
    path: "/visual-references/valkyrie-1/three-quarter.png",
    role: "identity",
    label: "Valkyrie-1 hull",
    inherit: false,
  };
  const own = collectReferenceImages([{ name: "master", data: { reference_images: [hull] } }]);
  assert.equal(own.length, 1);
  const child = collectReferenceImages([
    { name: "valkyrie-1:master", data: { reference_images: [hull] }, inherited: true },
    { name: "master", data: { reference_images: [patch] } },
  ]);
  assert.deepEqual(child.map((r) => r.path), [patch.path]);
});

test("shot references: cast faces first, then place, then wardrobe; no resemblance; deduped", () => {
  const ref = (path: string, role: string, label = path) =>
    ({ path, role, label }) as Parameters<typeof mergeShotReferences>[0][number];
  const place = [ref("/p/hull.png", "style")];
  const galen = [ref("/p/galen.png", "identity"), ref("/p/patch.png", "insignia"), ref("/p/suit.png", "wardrobe")];
  const thane = [
    ref("/p/thane.png", "identity"),
    ref("/p/galen.png", "resemblance"),
    ref("/p/patch.png", "insignia"),
    ref("/p/suit.png", "wardrobe"),
  ];
  const out = mergeShotReferences(place, [galen, thane]);
  assert.deepEqual(out.map((r) => r.path), [
    "/p/galen.png",
    "/p/thane.png",
    "/p/hull.png",
    "/p/patch.png",
    "/p/suit.png",
  ]);
  assert.equal(out.find((r) => r.path === "/p/galen.png")!.role, "identity");
});
