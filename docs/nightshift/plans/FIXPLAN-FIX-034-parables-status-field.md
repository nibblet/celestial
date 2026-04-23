# Fix: [FIX-034] parables-of-resonance.md Missing `**Status:**` in Lore Metadata

## Problem
`npm test` fails with:

```
not ok 110 - all parables carry Status in Lore metadata
error: 'parables-of-resonance.md is flagged as parable but missing **Status:**'
```

The test in `src/lib/wiki/canon-hubs.test.ts` asserts that every rule file with
`subkind="parable"` in its canon dossier OR `**Subkind:** parable` in its lore metadata
must also have a `**Status:**` field in the Lore metadata section.

## Root Cause

`content/wiki/rules/parables-of-resonance.md:4` — canon dossier declares `subkind="parable"`,
which satisfies the test's detection regex. But:
- `## Lore metadata` section has `**Subkind:** concept` (inconsistent with dossier)
- `## Lore metadata` section is missing `**Status:**` entirely

All other parable rule files (`the-inheritance.md`, `the-vessel-and-the-thread.md`,
`the-weightless-measure.md`, `the-silent-choir.md`, `the-second-convergence.md`) carry a
`**Status:**` field (e.g. `fragment`, `foreshadowed`).

This file has no `<!-- generated:ingest -->` marker — it is safe to edit directly.

## Steps

1. Open `content/wiki/rules/parables-of-resonance.md`
2. Locate the `## Lore metadata` section (around line 24).
3. Change `**Subkind:** concept` → `**Subkind:** parable` (aligns with canon dossier).
4. Add `**Status:** active` on the line immediately after `**Subkind:** parable`.
   (Use `active` to indicate the parable phenomenon is a live canonical mechanism in the story,
   distinct from `fragment` / `foreshadowed` used by individual parables that haven't fully
   appeared yet. Paul may adjust the value.)
5. Run `npm test` — test 110 should now pass.
6. Run `npx next build` — no new errors expected.

## Files Modified
- `content/wiki/rules/parables-of-resonance.md` — Lore metadata section

## New Files (if any)
None

## Database Changes (if any)
None

## Verify
- [ ] `npm test` — test 110 (`all parables carry Status in Lore metadata`) passes
- [ ] `npx next build` — clean build
- [ ] `/rules/parables-of-resonance` renders correctly in dev with the updated lore metadata
