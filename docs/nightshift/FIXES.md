# FIXES — Celestial Interactive Book Companion

> Bug and issue tracker. Updated each nightshift run.
> Numbering continues from Run 14 (last new entry is FIX-040).

## Statuses
- `found` — Issue identified, no plan yet
- `planned` — Fix plan written (see plan file path)
- `resolved` — Fix confirmed in codebase (check git log)

---

## Open Issues

### [FIX-040] Dead `storyContextRaw` DB Fetch in Ask Orchestrator — Wasted Latency
- **Status:** planned
- **Severity:** Low-Medium — unnecessary Supabase DB call on every Ask request with a `storySlug`; result immediately discarded. Secondary risk: AI prompts use filesystem content instead of DB-canonical version (could diverge if story edited via Beyond).
- **Found:** 2026-04-26 (Run 14)
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-040-dead-story-context-raw-fetch.md`
- **Summary:** `src/lib/ai/orchestrator.ts buildPromptArgs()` calls `getCanonicalStoryMarkdown(storySlug)` in the `Promise.all` at line 188 and assigns to `storyContextRaw`, then immediately discards with `void storyContextRaw` (line 197). The actual story context used in AI prompts comes from `getStoryContext()` in `perspectives.ts` (filesystem read). Fix: remove the 3 dead lines from the orchestrator. Optional follow-up: wire `storyContextRaw` through properly so prompts always use the DB-canonical version.

---

### [FIX-039] `getJourneyContextForPrompt` Injects Locked Chapter Summaries into AI Prompt
- **Status:** planned
- **Severity:** P2 — secondary chapter-gating gap. When a reader passes `journeySlug` to the Ask API, `getJourneyContextForPrompt()` iterates ALL story IDs in the journey and injects each story's `title` and `summary` (opening paragraph of the chapter) into every AI persona system prompt, regardless of reader progress. A CH01 reader asking with `journeySlug: "directive-14"` has CH08–CH14 opening paragraphs in the AI context.
- **Found:** 2026-04-25 (Run 13)
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-039-journey-context-prompt-story-gating.md`
- **Summary:** Add `readerProgress?: ReaderProgress | null` parameter to `getJourneyContextForPrompt` in `prompts.ts`. Filter story iteration to `isStoryUnlocked(id, readerProgress)`. Update the call site in `perspectives.ts` `sharedContentBlock` to pass `args.readerProgress`. Re-reader and no-`readerProgress` paths unaffected (optional param defaults to `undefined`).

---

### [FIX-038] Journey Beats in Ask Orchestrator Not Filtered by Reader Progress
- **Status:** planned
- **Severity:** P1 — chapter-gating gap in the Ask AI context layer. When a reader sends `journeySlug` to the `/api/ask` endpoint, the orchestrator fetches ALL published beats via `listBeatsByJourney()` and injects them into every AI persona system prompt without filtering by reader progress. Beat `whyItMatters` text contains verbatim story events from named chapters. FIX-032 covers the journey page BeatTimeline rendering; this fix covers the orchestrator/AI path specifically noted as "FIX-032 in Ask path too" in STATUS.md but absent from FIXPLAN-FIX-032.
- **Found:** 2026-04-25 (Run 13)
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-038-orchestrator-journey-beats-gating.md`
- **Summary:** In `src/lib/ai/orchestrator.ts` `buildPromptArgs()`, filter `journeyBeats` by `isStoryUnlocked(b.chapterId, readerProgress)` before mapping them into `PersonaPromptArgs.beats`. `readerProgress` is already in scope; `isStoryUnlocked` is already imported. One filter chain addition.

---

### [FIX-036] `storySlug` Not Validated Against Reader Progress in Ask API — P0 Spoiler Leak
- **Status:** planned
- **Severity:** P0 — spoiler leak. Any authenticated reader can pass a locked chapter's slug in the Ask API POST body and receive that chapter's story body (first 3 000 chars), mission log entries (up to 600 chars each), and scene data injected into the AI system prompt. The AI's "Reader Progress Gate" instruction is a prompt-level hint, not a code gate.
- **Found:** 2026-04-24 (Run 12)
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-036-ask-story-slug-spoiler-gate.md`
- **Summary:** In `src/app/api/ask/route.ts`, `storySlug` is destructured from the request body and passed to `orchestrateAsk` without checking `isStoryUnlocked(storySlug, readerProgress)`. Fix: add one validation statement after `getReaderProgress()` and use `validatedStorySlug` in the orchestrate call. Re-reader (`show_all_content=true`) and unlocked-chapter paths are unaffected.

---

### [FIX-037] `andes-glacial-lake.md` Missing `**Superset:**` in Lore Metadata — Test Failures
- **Status:** planned
- **Severity:** Low — tests 113 and 117 fail; no runtime impact.
- **Found:** 2026-04-24 (Run 12)
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-037-andes-glacial-lake-superset.md`
- **Summary:** New location file `content/wiki/locations/andes-glacial-lake.md` (seeded by `seed-canon-entities.ts` in commit `145a753`) has `parent="earth"` in its canon dossier but is missing `**Superset:** [[earth]]` in the Lore metadata section. The canon-hubs and canon-integrity tests require these to match. No `<!-- generated:ingest -->` marker — safe to edit directly. One-line content fix.

---

### [FIX-035] Vault Detail Pages Leak Story IDs Without Chapter Gating
- **Status:** planned
- **Severity:** P1 — chapter-gating gap. Vault entities extract `memoirStoryIds` from `## Appearances` sections via the `(CH0X)` pattern. `/vaults/[slug]/page.tsx` uses `FictionEntityDetailPage` without passing `readerProgress`, so all story links render to all readers unfiltered.
- **Found:** 2026-04-23 (Run 11)
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-035-vault-detail-story-gating.md`
- **Summary:** Same root cause as FIX-031 (factions/locations/artifacts). `vault-002` has CH06 in Appearances and CH11 in Additional appearances; these render as story links regardless of reader progress. Fix: fetch `getReaderProgress()` in `/vaults/[slug]/page.tsx` and pass as `readerProgress` prop to `FictionEntityDetailPage`. Coordinate with FIX-031 since both touch `FictionEntityViews.tsx`.

---

### [FIX-034] `parables-of-resonance.md` Missing `**Status:**` in Lore Metadata — Test Failure
- **Status:** planned
- **Severity:** Low — test 114 fails (was test 110 in Run 11, renumbered by new tests); no runtime impact. Content inconsistency: canon dossier says `subkind="parable"` but Lore metadata says `**Subkind:** concept` and lacks `**Status:**`.
- **Found:** 2026-04-23 (Run 11)
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-034-parables-status-field.md`
- **Summary:** `content/wiki/rules/parables-of-resonance.md` Lore metadata section: change `**Subkind:** concept` → `**Subkind:** parable` and add `**Status:** active`. No `<!-- generated:ingest -->` marker — safe to edit directly.

---

### [FIX-032] BeatTimeline Leaks Locked Chapter Content on Journey Pages
- **Status:** planned
- **Severity:** P0 — chapter content leak via BeatTimeline. Beat summaries/titles contain verbatim story content and character developments from specific locked chapters. A reader at CH01 can see CH11 story content on the journey intro page.
- **Found:** 2026-04-22 (Run 10)
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-032-beat-timeline-chapter-gating.md`
- **Summary:** `src/app/journeys/[slug]/page.tsx` fetches ALL published beats via `listBeatsByJourney()` and passes them unfiltered to `BeatTimeline`. The directive-14 journey has beats for CH08–CH14 with summaries that contain actual story events. Fix: fetch `getReaderProgress()` in the journey page and filter beats to `isStoryUnlocked(beat.chapterId, progress)` before passing to BeatTimeline.

---

### [FIX-031] Fiction Entity Detail Pages Leak Future Chapter IDs
- **Status:** planned
- **Severity:** P1 — chapter-gating gap. Faction/location/artifact detail pages show story IDs from locked chapters without gating. Characters are correctly gated; other entity types are not.
- **Found:** 2026-04-22 (Run 10)
- **Plan:** `docs/nightshift/plans/FIXPLAN-FIX-031-fiction-entity-story-gating.md`
- **Summary:** `FictionEntityDetailPage` in `FictionEntityViews.tsx` renders `memoirStoryIds` and `interviewStoryIds` without `isStoryUnlocked()` filtering. Used by `/factions/[slug]`, `/locations/[slug]`, and `/artifacts/[slug]`. Fix: add `readerProgress` prop to `FictionEntityDetailPage` and filter story IDs before rendering; update the three page files to fetch and pass progress.

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
- **Summary:** Migrations 025–028 check `p.role = 'keith'` in RLS policies. Fix: new migration **035** (migrations 030–034 used by other features). Plan file still describes approach correctly — update migration number to 035 when executing.

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
