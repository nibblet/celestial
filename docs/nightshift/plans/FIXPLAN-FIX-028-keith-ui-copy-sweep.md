# Fix: [FIX-028] Legacy "Keith" UI Copy — Phase 1 Cleanup

## Problem

Phase 1 exit criteria require all legacy `keith`/`Keith`/`Cobb`/`cobb` strings removed from `src/`. 14+ references remain across 20+ files. Key surfaces include AI system prompts (affects narrator voice), reader-facing UI copy, and code comments. Some are auto-replaceable; others require Paul to confirm preferred copy.

**Severity: Low — cosmetic/brand. No functional impact.**

## Root Cause

The app was migrated from a Keith Cobb memoir shell. Many UI strings, system prompt references, and code comments still reference "Keith" or "Keith Cobb" rather than the Celestial app identity. Grep: `grep -rn "\bkeith\b\|\bKeith\b\|\bkcobb\b\|\bcobb\b" src/ --include="*.ts" --include="*.tsx"` — the known files are:

```
src/components/journeys/JourneyCompleteSummary.tsx
src/components/stories/AskAboutStory.tsx
src/components/visuals/EntityVisualsGallery.tsx   (requireKeith — FIX-049)
src/components/beyond/BeyondEditMode.tsx
src/components/tell/StoryContributionWorkspace.tsx
src/app/admin/drafts/page.tsx
src/app/journeys/[slug]/page.tsx
src/app/profile/admin/visuals/page.tsx            (requireKeith — FIX-049)
src/app/profile/highlights/page.tsx
src/app/profile/questions/page.tsx
src/app/api/admin/ai-activity/route.ts            (comment only)
src/app/api/admin/threads/route.ts                (comment only)
src/app/api/visuals/*.ts                          (requireKeith — FIX-049)
src/app/welcome/OnboardingStepper.tsx
src/app/welcome/page.tsx
src/app/welcome/demos/AskDemo.tsx
src/app/themes/page.tsx
src/app/beyond/page.tsx
src/app/api/beyond/questions/[id]/seed-session/route.ts
src/lib/beyond/session-wrap.ts                    (system prompt)
src/lib/supabase/table-prefix.ts                  (comment)
```

Note: `requireKeith()` function renames are tracked separately under **FIX-049**.

## Steps

1. Run the grep audit to get exact line numbers:
   ```
   grep -rn "\bkeith\b\|\bKeith\b\|\bkcobb\b\|\bcobb\b" src/ --include="*.ts" --include="*.tsx" | grep -v "requireKeith"
   ```

2. **Auto-replaceable — safe to change without Paul input (comments/internal only):**
   - `src/app/api/admin/ai-activity/route.ts` ~line 31: comment `// Keith role` or similar → `// Author role`
   - `src/app/api/admin/threads/route.ts` ~line 19: stale `keith` comment → `// author`
   - `src/lib/supabase/table-prefix.ts`: comment referencing Keith's `sb_*` tables → "legacy shared-schema names" or similar

3. **Requires Paul to confirm preferred copy before changing (do NOT auto-replace):**
   - `src/lib/beyond/session-wrap.ts`: AI system prompt contains "Keith" — replace with the author's chosen identity or generic "the author"
   - `src/components/stories/AskAboutStory.tsx`: "Write to Keith" CTA label → e.g., "Ask the Author" or remove
   - `src/components/tell/StoryContributionWorkspace.tsx`: Keith references in workspace → generic author copy
   - `src/app/welcome/OnboardingStepper.tsx` + `welcome/page.tsx` + `welcome/demos/AskDemo.tsx`: onboarding copy referencing Keith → Celestial generic
   - `src/app/journeys/[slug]/page.tsx`, `themes/page.tsx`, `beyond/page.tsx`: page copy → generic
   - `src/app/profile/highlights/page.tsx`, `profile/questions/page.tsx`: profile page copy → generic
   - `src/components/beyond/BeyondEditMode.tsx`: Beyond workspace copy
   - `src/components/journeys/JourneyCompleteSummary.tsx`: journey completion copy
   - `src/app/admin/drafts/page.tsx`: admin page copy
   - `src/app/api/beyond/questions/[id]/seed-session/route.ts`: `young_reader: "A young reader"` — likely not Keith but worth checking

4. After all replacements: `npm run lint` to confirm no errors introduced.

5. `npm run build`

6. `npm test`

7. Manual verify: navigate to `/welcome`, `/journeys`, `/ask`, `/themes`, `/profile/highlights` — confirm no "Keith" or "Cobb" visible in any reader-facing UI surface.

## Files Modified

- `src/app/api/admin/ai-activity/route.ts` — comment fix
- `src/app/api/admin/threads/route.ts` — comment fix
- `src/lib/supabase/table-prefix.ts` — comment fix
- `src/lib/beyond/session-wrap.ts` — system prompt copy (requires Paul)
- `src/components/stories/AskAboutStory.tsx` — UI copy (requires Paul)
- `src/components/tell/StoryContributionWorkspace.tsx` — UI copy (requires Paul)
- `src/app/welcome/OnboardingStepper.tsx` — onboarding copy (requires Paul)
- `src/app/welcome/page.tsx` — welcome copy (requires Paul)
- `src/app/welcome/demos/AskDemo.tsx` — demo copy (requires Paul)
- `src/app/journeys/[slug]/page.tsx` — page copy (requires Paul)
- `src/app/themes/page.tsx` — page copy (requires Paul)
- `src/app/beyond/page.tsx` — page copy (requires Paul)
- `src/app/profile/highlights/page.tsx` — profile copy (requires Paul)
- `src/app/profile/questions/page.tsx` — profile copy (requires Paul)
- `src/components/beyond/BeyondEditMode.tsx` — UI copy (requires Paul)
- `src/components/journeys/JourneyCompleteSummary.tsx` — journey copy (requires Paul)

## New Files

None.

## Database Changes

None.

## Verify

- [ ] `grep -rn "\bkeith\b\|\bKeith\b" src/ --include="*.ts" --include="*.tsx" | grep -v requireKeith` returns 0 results
- [ ] `npm run lint` passes (0 errors)
- [ ] `npm run build` passes
- [ ] `npm test` passes (192/192)
- [ ] No "Keith" or "Cobb" visible in reader-facing UI at `/welcome`, `/journeys`, `/ask`, `/themes`, `/profile/highlights`
