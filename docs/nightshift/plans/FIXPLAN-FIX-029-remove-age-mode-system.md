# Fix: [FIX-029] Age Mode System Exposed in Adult-Only Celestial App

## Problem

The `AgeModeSwitcher` component is visible in Nav (`Nav.tsx:178`), Header (`Header.tsx:26`), and Home (`HomePageClient.tsx:52`). Journey components render `young_reader` copy branches. The Ask page (`ask/page.tsx:179-198`) has `SUGGESTIONS_BY_AGE_MODE` with `young_reader` and `teen` suggestion sets. The system prompts in `prompts.ts` (lines 548-560) inject a "The user is a young reader (ages 3-10). Use very simple language." block when `ageMode` is `young_reader`. Celestial is adult fiction only — no age modes.

**Severity: Low-Medium** — A reader who clicks AgeModeSwitcher to "young_reader" receives age-restricted AI responses for adult fiction. Also confuses the product identity.

**Scope note (Run 22 audit):** Full removal is a multi-phase effort. `age_mode` is present in:
- DB schema with CHECK constraints: migrations 001 (`sb_profiles`, `sb_conversations`), 002 (trigger), 006 (`cel_chapter_questions`)
- 20+ source files
- AI system prompt (`prompts.ts` lines 86-89 and 548-560)
- API request bodies (`/api/ask`, `/api/stories/[storyId]/questions`)

## Root Cause

Age mode system inherited from memoir shell. The `useAgeMode` hook (`src/hooks/useAgeMode.tsx`) reads from `localStorage` or the `sb_profiles.age_mode` DB column. Supabase migration 001 defines the column with `check (age_mode in ('young_reader', 'teen', 'adult'))`.

## Steps

### Phase 1 — UI removal (safe to execute immediately, no DB migration needed)

1. Remove `<AgeModeSwitcher>` from `src/components/layout/Nav.tsx` line 178 (and its import line).

2. Remove `<AgeModeSwitcher>` from `src/components/layout/Header.tsx` line 26 (and its import line).

3. Remove `<AgeModeSwitcher>` from `src/components/home/HomePageClient.tsx` line 52 (and its import line).

4. In `src/app/ask/page.tsx`:
   - Flatten `SUGGESTIONS_BY_AGE_MODE` (lines 179-198) to a plain `const SUGGESTIONS: string[]` using only the `adult` entries.
   - Remove the `useAgeMode()` import and call (line 5 and line 248).
   - Replace `ageMode` usage in the suggestion chip render (line 679) to use the flat array directly.
   - Leave `ageMode` in the API POST body as-is (API defaults to `"adult"` and this is not reader-visible).

5. In `src/components/journeys/JourneyProgressBar.tsx`:
   - Remove `useAgeMode()` import and call.
   - Delete the `young_reader` and `teen` conditional branches; keep only the `adult` branch (or drop the conditional entirely since adult is the only mode).

6. In `src/components/journeys/JourneyReflection.tsx`:
   - Remove `useAgeMode()` import and call.
   - Delete the `reflectionCopy` function's `young_reader` case; simplify to return `adult` values always.
   - Remove the `{ageMode === "young_reader" && (...)}` conditional block (line 46).

7. In `src/components/journeys/JourneyCompleteSummary.tsx`:
   - Remove `useAgeMode()` import and call.
   - Replace `ageMode === "adult" ? 5 : 3` with just `5`.
   - Remove the `{ageMode === "adult" ? ... : ...}` conditional render.

8. In `src/components/profile/StoriesReadProgress.tsx`:
   - Remove `useAgeMode()` import and call.
   - Replace `ageMode === "young_reader" && complete` with `complete` (adult only).

9. In `src/components/story/ReadBadgeAgeAware.tsx`:
   - Remove `useAgeMode()` import and call.
   - Replace `ageMode === "young_reader" ? "Read it!" : "Read"` with just `"Read"`.

10. In `src/components/layout/ThemesYoungReaderRedirect.tsx`:
    - This component redirects young_reader to a different themes page. Since young_reader mode will not exist, delete this component entirely and remove from wherever it's used.

11. `npm run lint`

12. `npm run build`

13. `npm test`

14. Manual verify: Nav, Header, Home — confirm `AgeModeSwitcher` is not visible.

### Phase 2 — DB migration (execute after Phase 1 is confirmed and stable)

1. Create `supabase/migrations/040_remove_age_mode.sql` (or next sequential number; coordinate with FIX-026 which also targets migration 040):
   ```sql
   -- Drop age_mode from cel_profiles (mapped from sb_profiles)
   alter table public.cel_profiles drop column if exists age_mode;
   -- Drop age_mode from cel_conversations (mapped from sb_conversations)
   alter table public.cel_conversations drop column if exists age_mode;
   -- Drop age_mode from cel_chapter_questions (from migration 006)
   alter table public.cel_chapter_questions drop column if exists age_mode;
   ```

2. Remove `age_mode: AgeMode | null` from `src/types/index.ts` (appears in multiple interface definitions).

3. Update `src/hooks/useAgeMode.tsx` — either delete the file entirely (if no other consumers remain) or replace it with a stub that always returns `{ ageMode: "adult", setAgeMode: () => {} }`.

4. Update `src/lib/utils/age-mode.ts` — delete file if no consumers remain.

### Phase 3 — prompts.ts cleanup (coordinate with Phase 2)

1. Remove `ageModeHint` block from `src/lib/ai/prompts.ts` lines 86-89 (3 lines + the conditional that injects it).

2. Remove `AGE_MODE_INSTRUCTIONS` const from `src/lib/ai/prompts.ts` lines ~547-557 (the record of young_reader/teen/adult prompt strings).

3. Remove `ageMode: AgeMode` from the `PersonaPromptArgs` type and from all function signatures that accept it (`buildReaderContextBlock`, `buildSystemPrompt`).

4. Remove `ageMode` from `/api/ask/route.ts` request body destructuring (or leave as ignored param for backward compat).

5. Remove `ageMode` from `/api/stories/[storyId]/questions/route.ts` (uses `VALID_AGE_MODES`).

## Files Modified

**Phase 1 (9 files):**
- `src/components/layout/Nav.tsx`
- `src/components/layout/Header.tsx`
- `src/components/home/HomePageClient.tsx`
- `src/app/ask/page.tsx`
- `src/components/journeys/JourneyProgressBar.tsx`
- `src/components/journeys/JourneyReflection.tsx`
- `src/components/journeys/JourneyCompleteSummary.tsx`
- `src/components/profile/StoriesReadProgress.tsx`
- `src/components/story/ReadBadgeAgeAware.tsx`
- `src/components/layout/ThemesYoungReaderRedirect.tsx` (delete)

**Phase 2–3 (~8 files):**
- `src/types/index.ts`
- `src/hooks/useAgeMode.tsx`
- `src/lib/utils/age-mode.ts`
- `src/lib/ai/prompts.ts`
- `src/app/api/ask/route.ts`
- `src/app/api/stories/[storyId]/questions/route.ts`
- `src/app/welcome/steps.ts`

## New Files (Phase 2)

- `supabase/migrations/040_remove_age_mode.sql` (or next available sequential number — coordinate with FIX-026)

## Database Changes (Phase 2)

- Drop `age_mode` column from `cel_profiles`, `cel_conversations`, `cel_chapter_questions`
- No data loss risk — values are not reader-facing and the column will be unused after Phase 1

## Verify

- [ ] Phase 1: `npm run lint` — 0 errors
- [ ] Phase 1: `npm run build` passes
- [ ] Phase 1: `npm test` — 192/192 pass
- [ ] Phase 1: `AgeModeSwitcher` not visible in Nav, Header, or Home page
- [ ] Phase 1: Ask page shows only adult suggestion chips (no young_reader/teen copy)
- [ ] Phase 1: Journey components render normally without age-mode branches
- [ ] Phase 2: DB migration applies cleanly in Supabase dashboard
- [ ] Phase 2: `age_mode` column absent from `cel_profiles` and `cel_conversations` tables
- [ ] Phase 3: `young_reader` no longer appears in any AI system prompt (grep `src/lib/ai/prompts.ts`)
