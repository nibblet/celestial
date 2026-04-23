# Fix: [FIX-033] Vault Alias Resolution Returns Wrong Kind

## Problem
`resolveWikiSlug("martian-resonance-vault")` resolves to `kind: "artifacts"` instead of `kind: "vaults"`.
Test `src/lib/wiki/canon-hubs.test.ts` line ~49 fails with:

```
Expected values to be strictly equal:
+ actual - expected
+ 'artifacts'
- 'vaults'
```

Impact: CanonDossierCard `[[martian-resonance-vault]]` wiki links route to `/artifacts/vault-002`
instead of `/vaults/vault-002`. Any dossier cross-reference using this alias is broken.

## Root Cause

`src/lib/wiki/slug-resolver.ts:47` — `PROBE_ORDER` is:
```ts
["characters", "artifacts", "vaults", "locations", "factions", "rules"]
```

`vault-002.md` exists in **both** `content/wiki/artifacts/` and `content/wiki/vaults/` (the
vaults directory is new; the artifact copies were not removed in commit 0ff28dd). The probe
loop hits `artifacts/vault-002.md` first and returns early with `kind: "artifacts"`.

The fix has two parts:
1. Reorder `PROBE_ORDER` so `"vaults"` is probed before `"artifacts"`.
2. (Content note for Paul) The following files exist in both `artifacts/` and `vaults/`:
   `giza-vault.md`, `vault-002.md`, `vault-003.md`, `vault-006.md`.
   Once probe order is fixed the artifact copies become dead duplicates.
   Paul should decide whether to delete them from `artifacts/` and re-run
   `npm run compile:wiki` — keeping both is confusing but does not break routing after
   this fix.

## Steps

1. Open `src/lib/wiki/slug-resolver.ts`
2. On line 47, change `PROBE_ORDER` from:
   ```ts
   const PROBE_ORDER: ResolvedWikiKind[] = [
     "characters",
     "artifacts",
     "vaults",
     "locations",
     "factions",
     "rules",
   ];
   ```
   to:
   ```ts
   const PROBE_ORDER: ResolvedWikiKind[] = [
     "characters",
     "vaults",
     "artifacts",
     "locations",
     "factions",
     "rules",
   ];
   ```
3. Run `npm test` — test 108 should now pass.
4. Run `npx next build` — no new errors expected.
5. Run `npm run lint` — no new errors expected.
6. Manual verification: visit `/vaults/vault-002` in dev — page should load with vault content.
   Any `[[martian-resonance-vault]]` dossier link on character/artifact pages should route to `/vaults/vault-002`.

## Files Modified
- `src/lib/wiki/slug-resolver.ts` — reorder PROBE_ORDER (line 47–54)

## New Files (if any)
None

## Database Changes (if any)
None

## Content Note (for Paul — not blocking this fix)
Four vault entities remain in `content/wiki/artifacts/` as duplicates after the new `vaults/`
directory was created:
- `content/wiki/artifacts/giza-vault.md`
- `content/wiki/artifacts/vault-002.md`
- `content/wiki/artifacts/vault-003.md`
- `content/wiki/artifacts/vault-006.md`

After verifying vault pages work correctly, consider deleting these from `artifacts/` and
updating any artifact-index links. This is a content author decision.

## Verify
- [ ] `npm test` — test 108 (`martian-resonance-vault alias resolves to vault-002`) passes
- [ ] `npx next build` — clean build
- [ ] `npm run lint` — 0 errors
- [ ] `[[martian-resonance-vault]]` in a dossier card routes to `/vaults/vault-002`
