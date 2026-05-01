# Fix: [FIX-045] `visuals-integration-plan.md` Uses Obsolete Style Preset Names

## Problem

`docs/celestial/visuals-integration-plan.md` (added in commit `58b2527`, 348 lines) contains a "Phase 0 anchor seeding" table (~30 rows) where every row includes a `StylePresetKey` value. All preset names in that table use the **old** 4-preset vocabulary:
- `cinematic_canon`
- `painterly_lore`
- `noir_intimate`
- `mythic_wide`

These keys were **replaced** in the same commit (`58b2527`) when `src/lib/visuals/style-presets.ts` and `src/lib/visuals/types.ts` were updated to define 8 new Celestial-specific presets:
- `valkyrie_shipboard`
- `vault_threshold`
- `mars_excavation`
- `earth_institutional`
- `giza_archaeological`
- `noncorporeal_presence`
- `intimate_crew`
- `mythic_scale`

**Impact:** If Paul follows the plan verbatim and passes old preset names to the API (`/api/visuals/prompt`), the TypeScript types (`VisualPrompt.stylePreset: StylePresetKey`) will fail to compile and the API will reject the values. The planning doc is internally inconsistent with the same commit that created it.

**Severity:** Low — docs only; no runtime impact. Risk is wasted effort when executing the plan.

## Root Cause

`docs/celestial/visuals-integration-plan.md` was authored before the style preset names were finalized, or the preset rename and the plan doc were committed together without reconciling the table.

## Steps

1. Open `docs/celestial/visuals-integration-plan.md`
2. Find the anchor seeding table (around line 80–160, under "Phase 0 — Anchor seeding") containing columns including a style preset key column
3. Replace each old key with the appropriate new key using the mapping below:

| Old key | Replacement | Rationale |
|---|---|---|
| `cinematic_canon` → character portraits | `intimate_crew` or `valkyrie_shipboard` | Crew characters in Valkyrie setting |
| `cinematic_canon` → ship exterior hero | `valkyrie_shipboard` | Shipboard aesthetic |
| `mythic_wide` → scale/establishing shots | `mythic_scale` | Direct equivalent |
| `painterly_lore` → ancient/Earth-side locations | `giza_archaeological` or `earth_institutional` | Based on location type |
| `noir_intimate` → Sovrin / adjudication | `noncorporeal_presence` | Symbolic AI entity |
| `mythic_wide` → vault/Ancients material | `vault_threshold` | Vault aesthetic |
| `noir_intimate` → intimate interior scenes | `intimate_crew` | Direct equivalent |

4. Update any prose references to old preset names in the document (section headers, explanatory text)
5. Verify that all preset keys in the table now match one of the 8 keys in `StylePresetKey` from `src/lib/visuals/types.ts`
6. No code changes, build, or tests required

## Files Modified
- `docs/celestial/visuals-integration-plan.md` — find/replace old preset names with new equivalents

## New Files (if any)
None.

## Database Changes (if any)
None.

## Verify
- [ ] No `cinematic_canon`, `painterly_lore`, `noir_intimate`, `mythic_wide` remain in the doc
- [ ] All preset keys in the table are valid `StylePresetKey` values from `src/lib/visuals/types.ts`
- [ ] Build still passes: `npx next build`
