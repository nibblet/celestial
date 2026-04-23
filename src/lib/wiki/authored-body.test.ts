import test from "node:test";
import assert from "node:assert/strict";
import { extractAuthoredBody } from "./authored-body";

test("extractAuthoredBody strips character ai-dossier blocks by default", () => {
  const raw = `
# Name
## Dossier
x

<!-- ai-dossier:relationships generated="2026-01-01" reviewed="false" model="x" source-hash="a" -->
### Key Relationships
- **A** — hi (CH01).
<!-- ai-dossier:end -->

<!-- ai-dossier:appearances generated="2026-01-01" reviewed="false" model="x" source-hash="b" -->
## Chapter Appearances
- CH01
<!-- ai-dossier:end -->
`;
  const out = extractAuthoredBody(raw);
  assert.ok(!out.includes("Key Relationships"));
  assert.ok(out.includes("Chapter Appearances"));
});

test("extractAuthoredBody with stripAiDossier none keeps character blocks too", () => {
  const raw = `
<!-- ai-dossier:relationships generated="2026-01-01" reviewed="false" model="x" source-hash="a" -->
### Key Relationships
- hi
<!-- ai-dossier:end -->
`;
  const out = extractAuthoredBody(raw, { stripAiDossier: "none" });
  assert.ok(out.includes("Key Relationships"));
});
