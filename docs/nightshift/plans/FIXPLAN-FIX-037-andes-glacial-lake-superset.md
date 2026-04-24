# Fix: [FIX-037] `andes-glacial-lake.md` Missing `**Superset:**` in Lore Metadata — Test Failures

## Problem
Tests 113 (`every location has Superset: or is on root allow-list`) and 117 (`wiki: location Superset: line matches canon parent when canon has one`) both fail because `content/wiki/locations/andes-glacial-lake.md` has `parent="earth"` in its canon dossier block but is missing the matching `**Superset:** [[earth]]` field in the Lore metadata section. No runtime impact; pure test failure.

## Root Cause

`andes-glacial-lake.md` was seeded by `scripts/seed-canon-entities.ts` in commit `145a753`. The canon dossier correctly records `parent="earth"` and the `## Canon Dossier` section shows `**Parent:** [[earth]]`. However, the Lore metadata section at the bottom of the file was generated without the `**Superset:**` line, which the canon-hubs and canon-integrity tests require to be in sync.

`content/wiki/locations/andes-glacial-lake.md` — Lore metadata section (last 10 lines):
```
**Content type:** location
**Parent slug:** earth
**Source type:** canon_inventory
**Canon status:** canonical
**Visibility policy:** always_visible
**Source document:** Vault Encounter Tracker v2.md
**Extractor version:** seed-canon-entities/1
```

Missing: `**Superset:** [[earth]]`

No `<!-- generated:ingest -->` marker — safe to edit directly without touching the generator.

## Steps

1. Open `content/wiki/locations/andes-glacial-lake.md`
2. In the `## Lore metadata` section, add `**Superset:** [[earth]]` after the `**Content type:** location` line:
   ```
   **Content type:** location
   **Superset:** [[earth]]
   **Parent slug:** earth
   ...
   ```
3. Run `npm test`
4. Run `npm run lint`
5. Run `npx next build`

## Files Modified
- `content/wiki/locations/andes-glacial-lake.md`

## New Files
None.

## Database Changes
None.

## Verify
- [ ] `npm test` — tests 113 and 117 pass
- [ ] Build and lint clean
- [ ] `/locations/andes-glacial-lake` renders correctly (no runtime regression)
