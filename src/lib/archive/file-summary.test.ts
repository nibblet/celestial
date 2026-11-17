import test from "node:test";
import assert from "node:assert/strict";
import { parseRelationships, shortName, splitLede } from "@/lib/archive/file-summary";

test("relationship rows become a name, one line and chapter numbers", () => {
  const rows = parseRelationships(
    [
      "### Key Relationships",
      "- **Aven Voss** — His wife and medical officer; she reads his silences (CH01, CH02, CH12, CH17).",
      "- **ALARA** — The ship's AI (CH04)",
      "Some stray prose.",
    ].join("\n")
  );
  assert.deepEqual(rows, [
    {
      name: "Aven Voss",
      line: "His wife and medical officer; she reads his silences.",
      chapters: [1, 2, 12, 17],
    },
    { name: "ALARA", line: "The ship's AI.", chapters: [4] },
  ]);
  assert.deepEqual(parseRelationships(undefined), []);
});

test("the lede is whole sentences from the first paragraph, the rest follows", () => {
  const text =
    "Former USAF pilot, rejuvenated from 82 to 50. He embodies the Air Force core values. Calm, rational, and experienced.\n\nSecond paragraph here.";
  const { lede, rest } = splitLede(text, 90);
  assert.equal(lede, "Former USAF pilot, rejuvenated from 82 to 50. He embodies the Air Force core values.");
  assert.equal(rest, "Calm, rational, and experienced.\n\nSecond paragraph here.");
});

test("a long first sentence is kept whole, and empty text is safe", () => {
  const long = "A".repeat(400) + ".";
  assert.equal(splitLede(long, 100).lede, long);
  assert.deepEqual(splitLede(""), { lede: "", rest: "" });
  assert.deepEqual(splitLede("Short."), { lede: "Short.", rest: "" });
});

test("questions use a person's first name and a place's full name", () => {
  assert.equal(shortName("Galen Voss", true), "Galen");
  assert.equal(shortName("ALARA", true), "ALARA");
  assert.equal(shortName("Vault 002: Vault of First Light"), "Vault 002");
  assert.equal(shortName("Command Dome"), "Command Dome");
});
