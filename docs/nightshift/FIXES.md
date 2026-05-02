# FIXES — Celestial Interactive Book Companion

> Bug and issue tracker. Updated each nightshift run.
> Numbering continues from Run 18 (last new entry is FIX-048).

## Statuses
- `found` — Issue identified, no plan yet
- `planned` — Fix plan written (see plan file path)
- `parked` — Not currently targeted (kept for historical context)
- `resolved` — Fix confirmed in codebase (check git log)

---

## Open Issues

### [FIX-048] ~15MB of Binary Test Renders Committed to `public/images/`
- **Status:** found
- **Severity:** Low — repo bloat; no functional breakage. Images served as public assets from Next.js static dir.
- **Found:** 2026-05-02 (Run 18) — commits `03d7d20` + `74aeae5` (between Run 16/17; missed by Run 17 scan).
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-048-committed-images-public.md`
- **Summary:** 14 image files (~15MB) under `public/images/` from visual spec development: 5 Valkyrie-1 harmonic state renders, 8 exterior/interior spec renders, 1 portrait reference. No `.gitignore` pattern prevents future additions. Fix: add `public/images/*.png` / `*.jpg` to `.gitignore`; optionally move canonical state renders to Supabase storage (see IDEA-047).

---

### [FIX-047] All 8 API Model References Use Stale `claude-sonnet-4-20250514`
- **Status:** found
- **Severity:** Low — API currently accepts the old model ID; `claude-sonnet-4-6` is the current latest.
- **Found:** 2026-05-02 (Run 18)
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-047-stale-model-id.md`
- **Summary:** `personas.ts`, `synthesize-prompt.ts`, `extract-vision.ts`, `session-wrap.ts`, `profile-reflection.ts`, and 3 API routes all hard-code `claude-sonnet-4-20250514`. Fix: find/replace in 8 files, add `claude-sonnet-4-6` entry to `MODEL_COST` in `ledger.ts`, bump `SYNTH_PROMPT_VERSION` to v10 to invalidate cached visual prompts.

---

### [FIX-046] Stale "Unlock As You Progress" UI Copy After Companion-First Shift
- **Status:** found
- **Severity:** Low — cosmetic + dead code. User-visible home page copy directly contradicts the companion-first product direction; dead code path in story detail page adds confusion for future devs.
- **Found:** 2026-05-01 (Run 17)
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-046-companion-first-stale-copy.md`
- **Summary:** Three places reference the old "read to unlock" gating model that no longer applies after the companion-first shift (commit `0e60b8c`): (1) `HomePageClient.tsx:16` — "Begin at Chapter 1 and unlock the companion as you progress."; (2) `StoriesPageClient.tsx:217` — "read to unlock."; (3) `stories/[storyId]/page.tsx:42–60` — dead `if (!unlocked)` block with locked-chapter copy that can never execute. Fix requires Paul to confirm preferred copy for (1) and (2); (3) can be safely removed.

---

### [FIX-045] `visuals-integration-plan.md` Uses Obsolete Style Preset Names
- **Status:** found
- **Severity:** Low — docs only. Planning table references `cinematic_canon`, `painterly_lore`, `noir_intimate`, `mythic_wide` which were removed from `StylePresetKey` in commit `58b2527`. Any code written from this plan will fail TypeScript type checks.
- **Found:** 2026-05-01 (Run 17)
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-045-visuals-plan-stale-presets.md`
- **Summary:** `docs/celestial/visuals-integration-plan.md` anchor seeding table (~30 rows) uses 4 old preset names replaced by 8 new Celestial-specific keys: `valkyrie_shipboard`, `vault_threshold`, `mars_excavation`, `earth_institutional`, `giza_archaeological`, `noncorporeal_presence`, `intimate_crew`, `mythic_scale`. Docs-only fix: find/replace old names with appropriate new equivalents per the mapping in the fix plan.

---

### [FIX-044] Migration 035 RLS Policies Check `role = 'keith'` on Visual Tables
- **Status:** resolved
- **Severity:** Medium — author accounts cannot insert or update rows in `cel_visual_prompts` or `cel_visual_assets` at the DB layer, even after FIX-043 fixes the application-layer check. Four INSERT/UPDATE policies in migration 035 check `p.role = 'keith' or p.role = 'admin'`; author role is `'author'`.
- **Found:** 2026-04-28 (Run 16)
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-044-visual-migration-035-keith-rls.md`
- **Resolved:** 2026-04-28 (Run 16)
- **Summary:** Implemented `supabase/migrations/039_visual_rls_keith_to_author.sql` to drop the four stale policies and recreate them with `'author'` instead of `'keith'`. Verified in repo with lint/build/tests green.

---

### [FIX-043] `requireKeith()` in Visuals API Routes Blocks Author Accounts
- **Status:** resolved
- **Severity:** Medium-High — the entire visuals feature (prompt synthesis, asset generation, approval, reference upload, delete) is inaccessible to `role = 'author'` accounts. All 5 mutation API routes and the admin console page define an inline `requireKeith()` function checking `["admin", "keith"].includes(profile.role)`. Author role is `'author'`.
- **Found:** 2026-04-28 (Run 16)
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-043-visuals-routes-keith-role.md`
- **Resolved:** 2026-04-28 (Run 16)
- **Summary:** Updated all 5 visuals mutation routes (`prompt`, `generate`, `approve`, `asset/[id]`, `reference`) plus `profile/admin/visuals/page.tsx` from `["admin", "keith"]` to `["admin", "author"]`. Verified in repo with lint/build/tests green.

---

### [FIX-042] Character Arc AI Context Injects Spoilery Sections Without Reader Progress Filter
- **Status:** parked
- **Severity:** P1 — chapter-gating gap in AI context. `getCharacterArcContext()` in `prompts.ts` injects `unresolvedTensions` and `futureQuestions` sections for all 9 characters into every Ask system prompt without reader progress filtering. These sections contain spoilery arc-endpoint hints (e.g., "Can a merged ALARA still refuse" = CH17 merge; "once CAEDEN's occupation becomes visible" = CH16+ event). The Reader Progress Gate is a prompt-level instruction only.
- **Found:** 2026-04-27 (Run 15)
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-042-arc-context-spoiler-sections.md`
- **Summary:** Remove `unresolvedTensions` and `futureQuestions` from the arc context block built in `getCharacterArcContext()` (`prompts.ts` lines ~181–184). Retain `startingState` and `askGuidance`, which are designed to be safe. The two dropped sections are still shown on the author-only `/arcs/[slug]` page (after FIX-041). Two-line deletion; no new logic required.
- **Parking note:** Parked after product-direction change to companion-first default visibility (reader-progress gating no longer primary UX path).

---

### [FIX-041] `/arcs` and `/arcs/[slug]` Pages Expose Full Arc Spoilers to All Readers
- **Status:** parked
- **Severity:** P0 — spoiler leak. Any authenticated reader can access `/arcs/alara` and read verbatim CH17 events ("Translation completes; ALARA is no longer singular"). The arc detail page renders `arc.markdown` unfiltered via `StoryMarkdown`. Both `/arcs/page.tsx` and `/arcs/[slug]/page.tsx` were added in commit `724d66b` with zero auth checks. `/characters/[slug]/page.tsx` links all readers to the arc detail page via `CharacterArcPanel`.
- **Found:** 2026-04-27 (Run 15)
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-041-arcs-page-author-gating.md`
- **Summary:** Add `hasAuthorSpecialAccess()` gate to both arc pages (redirect non-authors to `/`). Remove the `CharacterArcPanel` link for non-author readers in `characters/[slug]/page.tsx`. Pattern: same as `/beyond/page.tsx` (import `getAuthenticatedProfileContext`, check `isAuthorSpecialAccess`, redirect if false). Three-file change.
- **Parking note:** Parked after product-direction change to companion-first default visibility (reader-progress gating no longer primary UX path).

---

### [FIX-039] `getJourneyContextForPrompt` Injects Locked Chapter Summaries into AI Prompt
- **Status:** resolved
- **Severity:** P2 — secondary chapter-gating gap. When a reader passes `journeySlug` to the Ask API, `getJourneyContextForPrompt()` iterates ALL story IDs in the journey and injects each story's `title` and `summary` (opening paragraph of the chapter) into every AI persona system prompt, regardless of reader progress. A CH01 reader asking with `journeySlug: "directive-14"` has CH08–CH14 opening paragraphs in the AI context.
- **Found:** 2026-04-25 (Run 13)
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-039-journey-context-prompt-story-gating.md`
- **Resolved:** 2026-04-28 — commit `0e60b8c` added `readerProgress?: ReaderProgress | null` param to `getJourneyContextForPrompt` in `prompts.ts`, added `isStoryUnlocked(...)` guard per iteration, and updated the `perspectives.ts` call site. **Note:** With companion-first defaults (same commit), all content is always unlocked for all users, so this filter is effectively a no-op in production; it remains correct code that preserves future flexibility.
- **Summary:** Implemented `readerProgress?: ReaderProgress | null` in `getJourneyContextForPrompt` (`prompts.ts`), added `isStoryUnlocked(...)` filtering during journey story iteration, and passed `args.readerProgress` at the `perspectives.ts` call site.

---

### [FIX-038] Journey Beats in Ask Orchestrator Not Filtered by Reader Progress
- **Status:** parked
- **Severity:** P1 — chapter-gating gap in the Ask AI context layer. When a reader sends `journeySlug` to the `/api/ask` endpoint, the orchestrator fetches ALL published beats via `listBeatsByJourney()` and injects them into every AI persona system prompt without filtering by reader progress. Beat `whyItMatters` text contains verbatim story events from named chapters. FIX-032 covers the journey page BeatTimeline rendering; this fix covers the orchestrator/AI path specifically noted as "FIX-032 in Ask path too" in STATUS.md but absent from FIXPLAN-FIX-032.
- **Found:** 2026-04-25 (Run 13)
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-038-orchestrator-journey-beats-gating.md`
- **Summary:** In `src/lib/ai/orchestrator.ts` `buildPromptArgs()`, filter `journeyBeats` by `isStoryUnlocked(b.chapterId, readerProgress)` before mapping them into `PersonaPromptArgs.beats`. `readerProgress` is already in scope; `isStoryUnlocked` is already imported. One filter chain addition.
- **Parking note:** Parked after product-direction change to companion-first default visibility (reader-progress gating no longer primary UX path).

---

### [FIX-036] `storySlug` Not Validated Against Reader Progress in Ask API — P0 Spoiler Leak
- **Status:** parked
- **Severity:** P0 — spoiler leak. Any authenticated reader can pass a locked chapter's slug in the Ask API POST body and receive that chapter's story body (first 3 000 chars), mission log entries (up to 600 chars each), and scene data injected into the AI system prompt. The AI's "Reader Progress Gate" instruction is a prompt-level hint, not a code gate.
- **Found:** 2026-04-24 (Run 12)
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-036-ask-story-slug-spoiler-gate.md`
- **Summary:** In `src/app/api/ask/route.ts`, `storySlug` is destructured from the request body and passed to `orchestrateAsk` without checking `isStoryUnlocked(storySlug, readerProgress)`. Fix: add one validation statement after `getReaderProgress()` and use `validatedStorySlug` in the orchestrate call. Re-reader (`show_all_content=true`) and unlocked-chapter paths are unaffected.
- **Parking note:** Parked after product-direction change to companion-first default visibility (reader-progress gating no longer primary UX path).

---

### [FIX-037] `andes-glacial-lake.md` Missing `**Superset:**` in Lore Metadata — Test Failures
- **Status:** resolved
- **Severity:** Low — tests 127 and 131 fail; no runtime impact.
- **Found:** 2026-04-24 (Run 12)
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-037-andes-glacial-lake-superset.md`
- **Resolved:** 2026-04-28 — commit `0e60b8c` added `**Superset:** [[earth]]` to `andes-glacial-lake.md` and also added Superset fields to `asteroid-belt.md`, `europa.md`, `ganymede.md`. Run 17 confirms: all 192 tests pass.
- **Summary:** Added `**Superset:** [[earth]]` to `content/wiki/locations/andes-glacial-lake.md`. Also fixed related location metadata gaps found during verification (`asteroid-belt`, `europa`, `ganymede`) so canon-hubs checks pass.

---

### [FIX-035] Vault Detail Pages Leak Story IDs Without Chapter Gating
- **Status:** parked
- **Severity:** P1 — chapter-gating gap. Vault entities extract `memoirStoryIds` from `## Appearances` sections via the `(CH0X)` pattern. `/vaults/[slug]/page.tsx` uses `FictionEntityDetailPage` without passing `readerProgress`, so all story links render to all readers unfiltered.
- **Found:** 2026-04-23 (Run 11)
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-035-vault-detail-story-gating.md`
- **Summary:** Same root cause as FIX-031 (factions/locations/artifacts). `vault-002` has CH06 in Appearances and CH11 in Additional appearances; these render as story links regardless of reader progress. Fix: fetch `getReaderProgress()` in `/vaults/[slug]/page.tsx` and pass as `readerProgress` prop to `FictionEntityDetailPage`. Coordinate with FIX-031 since both touch `FictionEntityViews.tsx`.
- **Parking note:** Parked after product-direction change to companion-first default visibility (reader-progress gating no longer primary UX path).

---

### [FIX-034] `parables-of-resonance.md` Missing `**Status:**` in Lore Metadata — Test Failure
- **Status:** resolved
- **Severity:** Low — test 128 fails; no runtime impact. Content inconsistency: canon dossier says `subkind="parable"` but Lore metadata says `**Subkind:** concept` and lacks `**Status:**`.
- **Found:** 2026-04-23 (Run 11)
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-034-parables-status-field.md`
- **Resolved:** 2026-04-28 — commit `0e60b8c` updated `parables-of-resonance.md` Lore metadata to `**Subkind:** parable` + added `**Status:** active`. Also fixed `vault-parables.md` with same correction. Run 17 confirms: all 192 tests pass.
- **Summary:** Updated `content/wiki/rules/parables-of-resonance.md` Lore metadata to `**Subkind:** parable` and added `**Status:** active`. Also corrected the same metadata mismatch in `content/wiki/rules/vault-parables.md`.

---

### [FIX-032] BeatTimeline Leaks Locked Chapter Content on Journey Pages
- **Status:** parked
- **Severity:** P0 — chapter content leak via BeatTimeline. Beat summaries/titles contain verbatim story content and character developments from specific locked chapters. A reader at CH01 can see CH11 story content on the journey intro page.
- **Found:** 2026-04-22 (Run 10)
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-032-beat-timeline-chapter-gating.md`
- **Summary:** `src/app/journeys/[slug]/page.tsx` fetches ALL published beats via `listBeatsByJourney()` and passes them unfiltered to `BeatTimeline`. The directive-14 journey has beats for CH08–CH14 with summaries that contain actual story events. Fix: fetch `getReaderProgress()` in the journey page and filter beats to `isStoryUnlocked(beat.chapterId, progress)` before passing to BeatTimeline.
- **Parking note:** Parked after product-direction change to companion-first default visibility (reader-progress gating no longer primary UX path).

---

### [FIX-031] Fiction Entity Detail Pages Leak Future Chapter IDs
- **Status:** parked
- **Severity:** P1 — chapter-gating gap. Faction/location/artifact detail pages show story IDs from locked chapters without gating. Characters are correctly gated; other entity types are not.
- **Found:** 2026-04-22 (Run 10)
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-031-fiction-entity-story-gating.md`
- **Summary:** `FictionEntityDetailPage` in `FictionEntityViews.tsx` renders `memoirStoryIds` and `interviewStoryIds` without `isStoryUnlocked()` filtering. Used by `/factions/[slug]`, `/locations/[slug]`, and `/artifacts/[slug]`. Fix: add `readerProgress` prop to `FictionEntityDetailPage` and filter story IDs before rendering; update the three page files to fetch and pass progress.
- **Parking note:** Parked after product-direction change to companion-first default visibility (reader-progress gating no longer primary UX path).

---

### [FIX-030] `/api/admin/threads` Checks Stale `'keith'` Role
- **Status:** planned
- **Severity:** Medium — author accounts receive 403 from the new threads admin API (Phase E). Cannot create, list, or resolve narrative threads via API.
- **Found:** 2026-04-22 (Run 10)
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-030-threads-route-keith-role.md`
- **Summary:** `src/app/api/admin/threads/route.ts:45` — `requireAdmin()` checks `["admin", "keith"].includes(profile.role)`. Should be `["admin", "author"]`. Same pattern as FIX-027 but in the new Phase E route. Also update the comment on line 19 and a stale comment in `threads/repo.ts`.

---

### [FIX-028] Legacy "Keith" UI Copy — Phase 1 Cleanup Incomplete
- **Status:** found
- **Severity:** Low — cosmetic/brand. No functional impact.
- **Found:** 2026-04-22 (Run 9)
- **Summary:** Scope unchanged from Run 11. 14+ Keith/Cobb references remain in `src/`. Key surfaces: `session-wrap.ts` system prompt, `AskAboutStory.tsx`, `StoryContributionWorkspace.tsx`, `welcome/page.tsx`, `OnboardingStepper.tsx`, `journeys/page.tsx`, `themes/page.tsx`, `profile/highlights/page.tsx`, `profile/questions/page.tsx`, `admin/threads/route.ts` (comment), `admin/ai-activity/route.ts` (comment). Fix requires Paul to define preferred copy for each surface.

---

### [FIX-029] Age Mode System UI Exposed in Adult-Only Celestial App
- **Status:** found
- **Severity:** Low-Medium — `AgeModeSwitcher` visible in Nav (`Nav.tsx:178`) and Header (`Header.tsx:26`). Journey components render `young_reader` copy branches. Adult fiction only per spec.
- **Found:** 2026-04-22 (Run 9)
- **Summary:** Age mode infrastructure carried from memoir shell. Fix: remove `AgeModeSwitcher` from Nav and Header; hardcode `ageMode = "adult"` in journey components.

---

### [FIX-027] `/api/admin/ai-activity` Checks Stale `'keith'` Role
- **Status:** planned
- **Severity:** Medium — author accounts get 403 from the AI activity dashboard
- **Found:** 2026-04-22 (Run 9)
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-027-ai-activity-route-keith-role.md`
- **Summary:** `src/app/api/admin/ai-activity/route.ts:31` checks `["admin", "keith"].includes(profile.role)`. Should be `["admin", "author"]`. One-line fix.

---

### [FIX-026] Stale `role = 'keith'` in RLS Policies (Migrations 025–028)
- **Status:** planned
- **Severity:** Medium — author accounts cannot write to `cel_open_threads`, `cel_chapter_scenes`, or `cel_beats`
- **Found:** 2026-04-22 (Run 9)
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-026-stale-keith-role-rls.md`
- **Summary:** Migrations 025–028 check `p.role = 'keith'` in RLS policies. Fix: new migration **040** (migrations 035–039 now consumed by visuals + visual RLS fix). Plan file still describes approach correctly — update migration number to **040** when executing.

---

### [FIX-022] Duplicate `013_` Migration Prefix
- **Status:** planned
- **Severity:** Low — no functional impact
- **Found:** 2026-04-18 (Run 7)
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-022-dual-013-migration.md` *(recreate if needed)*
- **Summary:** Two migrations with `013_` prefix. New migrations start at `035_`. Documentation-only fix.

---

### [FIX-013] Uncaught Exception in /api/tell/draft When Fenced JSON is Malformed
- **Status:** planned
- **Severity:** Low
- **Found:** 2026-04-15
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-013-tell-draft-fenced-json-throw.md` *(recreate if needed)*
- **Summary:** Secondary `JSON.parse(fenced[1])` in catch block of `/api/tell/draft/route.ts` not wrapped in try/catch.

---

### [FIX-014] ageMode Not Validated at Runtime in /api/ask
- **Status:** planned
- **Severity:** Low — adult fiction app; invalid ageMode silently returns undefined
- **Found:** 2026-04-15
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-014-agemode-not-validated.md` *(recreate if needed)*

---

### [FIX-016] Tell Page SSE State Mutation (Strict Mode Double-Append Risk)
- **Status:** planned
- **Severity:** Low-Medium
- **Found:** 2026-04-15
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-016-tell-sse-mutation.md` *(recreate if needed)*

---

### [FIX-017] Multiple Draft Rows Created for One Tell Session
- **Status:** planned
- **Severity:** Low
- **Found:** 2026-04-15
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-017-multiple-drafts-per-session.md` *(recreate if needed)*

---

## Recently Resolved

### [FIX-040] Dead `storyContextRaw` DB Fetch in Ask Orchestrator
- **Status:** resolved / **Resolved:** 2026-04-28 (Run 16) — commit `3ffc33c` rewrote `orchestrator.ts buildPromptArgs()` with the wiki-first context pack approach. The dead `getCanonicalStoryMarkdown(storySlug)` call is gone.

### [FIX-033] Vault Alias Resolution Returns Wrong Kind — Test Failure
- **Status:** resolved
- **Resolved:** 2026-04-24 (Run 12) — symptom resolved by commit `145a753` which deleted the four duplicate vault files from `content/wiki/artifacts/` (giza-vault.md, vault-002.md, vault-003.md, vault-006.md). Test 108 now passes. Note: PROBE_ORDER in `src/lib/wiki/slug-resolver.ts` still has `"artifacts"` before `"vaults"` — this is a latent risk if vault files are ever accidentally placed in `artifacts/` again, but it is not currently causing test failures. The 1-line probe order fix from the original plan remains advisable but is not blocking.

### [FIX-025] Paragraph Text Used as React Key on Principle Detail Page
- **Status:** resolved / **Resolved:** 2026-04-19

### [FIX-024] Corpus Cache Invalidation Ineffective in Serverless
- **Status:** resolved / **Resolved:** 2026-04-19

### [FIX-023] Wiki Mirror Publish — Non-Atomic DB Operations
- **Status:** resolved / **Resolved:** 2026-04-19

### [FIX-021] ESLint Errors in Beyond Components
- **Status:** resolved — 0 lint errors since commit `1bf9147`

### [FIX-020] `<img>` ESLint Warnings in StoryMarkdown.tsx
- **Status:** resolved

### [FIX-019] `_history` Unused Parameter Lint Warning in classifier.ts
- **Status:** resolved

### [FIX-018] Uncommitted Changes
- **Status:** resolved

### [FIX-001 through FIX-017] (prior runs)
- **Status:** all resolved except the open FIX-013, FIX-014, FIX-016, FIX-017 which were replanned above
