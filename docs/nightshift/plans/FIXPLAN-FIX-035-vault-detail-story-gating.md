# Fix: [FIX-035] Vault Detail Pages Leak Story IDs Without Chapter Gating

## Problem
`/vaults/[slug]` uses `FictionEntityDetailPage` without passing `readerProgress`.
Vault entities extract chapter IDs from `## Appearances` sections via the `(CH0X)` pattern
— e.g., `vault-002` has `memoirStoryIds: ["CH06"]` and `interviewStoryIds: ["CH11"]`.
These are rendered as clickable story links to ALL readers regardless of progress.

A reader at CH01 visiting `/vaults/vault-002` sees a link to CH06 and CH11 chapter pages.
This violates the chapter-gating contract.

**Severity: P1** — chapter-gating gap. Same root cause as FIX-031 (factions/locations/
artifacts), which is also planned but not yet merged. These two fixes should ideally land
together.

## Root Cause

`src/app/vaults/[slug]/page.tsx` (commit 0ff28dd):
```tsx
export default async function VaultDetailPage({ params }) {
  const entity = getVaultBySlug(slug);
  if (!entity) notFound();
  return (
    <FictionEntityDetailPage entity={entity} heading="Vaults" basePath="/vaults" />
  );
}
```

`FictionEntityDetailPage` in `src/components/entities/FictionEntityViews.tsx` renders
`entity.memoirStoryIds` and `entity.interviewStoryIds` as story links at lines ~241–265
without any `isStoryUnlocked()` filtering. The character detail page at
`src/app/characters/[slug]/page.tsx` shows the correct pattern: it fetches `getReaderProgress()`
and passes it to the component (lines 34, 139, 181).

## Steps

1. Open `src/app/vaults/[slug]/page.tsx`
2. Add the following imports at the top:
   ```ts
   import { getReaderProgress } from "@/lib/progress/reader-progress";
   ```
3. In `VaultDetailPage`, fetch progress before the render:
   ```tsx
   const progress = await getReaderProgress();
   ```
4. Pass it to the component:
   ```tsx
   <FictionEntityDetailPage
     entity={entity}
     heading="Vaults"
     basePath="/vaults"
     readerProgress={progress}
   />
   ```
5. Verify that `FictionEntityDetailPage` already accepts and uses `readerProgress` prop to
   filter `memoirStoryIds` and `interviewStoryIds`. If it does not yet (FIX-031 may not be
   merged), coordinate with FIX-031's `FictionEntityViews.tsx` changes, which add this prop.

   **Dependency:** This fix assumes FIX-031 has been applied first (adds `readerProgress` prop
   handling to `FictionEntityDetailPage`). If applying vaults before FIX-031:
   - Add `readerProgress?: ReaderProgress | null` to `FictionEntityDetailPage` props
   - Filter story ID lists: `entity.memoirStoryIds.filter(id => isStoryUnlocked(id, progress))`
   - Apply the same filter to `interviewStoryIds`

6. Run `npx next build` — clean build expected.
7. Run `npm run lint` — no errors.

## Files Modified
- `src/app/vaults/[slug]/page.tsx` — add `getReaderProgress()`, pass as `readerProgress` prop

## If FIX-031 not yet applied, also modify:
- `src/components/entities/FictionEntityViews.tsx` — add `readerProgress` prop to
  `FictionEntityDetailPage` and filter story ID lists (see FIX-031 plan for full details)

## New Files (if any)
None

## Database Changes (if any)
None

## Gating Contract
- **Locked reader (< CH0X):** Story ID links for chapters beyond progress are hidden.
  Vault name, description, canon dossier, and relations still display.
- **Unlocked reader or re-reader (`show_all_content = true`):** All story links display.
- **Guest (cookie fallback):** `getReaderProgress()` falls back to guest cookie; same
  filtering applies with guest chapter state.

## Verify
- [ ] `npx next build` — clean build
- [ ] `npm run lint` — 0 errors
- [ ] Locked-reader path: visit `/vaults/vault-002` as a CH01 reader — CH06 and CH11 links
      should NOT appear
- [ ] Unlocked-reader path: visit `/vaults/vault-002` as a CH11+ reader — CH06 and CH11
      links appear
- [ ] Re-reader path (`show_all_content = true`): all vault story links appear
