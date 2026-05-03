# NIGHTLOG — Celestial Interactive Book Companion

> Append-only history of every nightly run. Most recent at the top.

---

## Run: 2026-05-03 (Run 19)

### Summary
- Scanned: 0 new code commits since Run 18 nightshift (`0d7969b`). All codebase state identical to Run 18.
- Issues: 0 new, 0 resolved. No new bugs found. All open issues unchanged.
- Ideas (by theme): ask-forward 1 seed (IDEA-048 — Ask CTA top-of-page variant) / 1 marked shipped (IDEA-040 discovered already implemented); genmedia 1 seed (IDEA-049 — Chapter Hero Images) / 1 promoted to `planned` (IDEA-043 — dev plan written); post-read-world 1 seed (IDEA-050 — Chapter Recap on Demand) / 0 promoted; parked 0.
- Plans written: DEVPLAN-IDEA-043-on-demand-scene-visualization.md (genmedia, 5 hr estimate).

### Build & Lint & Test Results
- `npm install`: clean
- `node_modules/.bin/next build`: **PASSES** — same ~106 routes as Run 18. (Continue using local binary, not `npx next build`.)
- `npm run lint`: **PASSES** — 0 errors, **4 warnings** (same 4 `<img>` tag warnings, unchanged).
- `npm test`: **192 PASS / 0 FAIL** (unchanged from Run 18).

### Key Findings

1. **IDEA-040 was already shipped — prior nightshift runs missed it.** Full read of `stories/[storyId]/page.tsx` (lines 314–330) reveals a bottom-of-page CTA block with `href={/ask?story=${storyId}}` and label "Chat about this story (AI)". Prior runs (17, 18) read only lines 1–130 and believed the link was absent. Core functionality of IDEA-040 is live. The dev plan's original goal of a *top-of-page* placement (after summary, visible on first scroll without reaching page bottom) remains undone — seeded as IDEA-048.

2. **IDEA-042 (follow-up chips) confirmed unimplemented.** `src/lib/ai/ask-suggestions.ts` does not exist. `Message` interface in `ask/page.tsx` has no `suggestions` field. `ask/page.tsx` has no chip rendering. Plan from Run 18 is accurate and ready to execute.

3. **IDEA-043 promoted to `planned`.** Dev plan written: `DEVPLAN-IDEA-043-on-demand-scene-visualization.md`. Phases: (1) add `visual_request` to `ask-intent.ts`; (2) new `ask-visual-handler.ts` module (entity extraction + auto-preset selection + cache check + Imagen 4 call); (3) parallel image generation in Ask API route; (4) image card rendering in `ask/page.tsx`; (5) optional `source` column migration. Migration 040 conflict noted with FIX-026 — coordinate sequencing.

4. **Three new ideas seeded.** IDEA-048 (ask-forward: top-of-page Ask CTA, 15-min copy from IDEA-040 plan), IDEA-049 (genmedia: batch-authored chapter hero images), IDEA-050 (post-read-world: Ask-generated chapter recap on demand).

5. **No new bugs.** No code changes, no regressions. All prior open issues (FIX-026 through FIX-048) remain exactly as in Run 18. All parked issues remain parked.

6. **3-day stale check.** No ideas crossed the 3-day threshold tonight. Earliest active ideas (IDEA-043, 044) were seeded 2026-05-01 — Day 2, not stale. All currently-active ideas remain active.

7. **`ask-intent.ts` confirmed: no `visual_request` type exists yet.** Current intent kinds: `factual`, `thematic`, `character_arc`, `world_rule`, `future_speculation`, `unknown_gap`. Adding `visual_request` is Phase 1 of IDEA-043.

8. **Migration 040 naming conflict.** Both FIX-026 (stale keith RLS) and IDEA-043 Phase 5 (visual assets source field) target migration 040. The FIX-026 plan file must be executed as 040 and IDEA-043 Phase 5 as 041, or vice versa — first one merged wins the number. IDEA-043 Phase 5 is optional; FIX-026 is a bug fix. Recommendation: FIX-026 takes 040, IDEA-043 Phase 5 becomes 041.

### Plans Ready to Execute
- `docs/nightshift/plans/DEVPLAN-IDEA-043-on-demand-scene-visualization.md` — **NEW planned (genmedia)**: Reader-triggered image generation in Ask, ~5 hours. Extends the already-built author visuals pipeline to reader-facing use.
- `docs/nightshift/plans/DEVPLAN-IDEA-042-follow-up-chips.md` — planned (ask-forward): follow-up chips after Ask answers, 2 hours.
- `docs/nightshift/plans/FIXPLAN-FIX-047-stale-model-id.md` — Low: 8-file model ID update to `claude-sonnet-4-6`, 15 min.
- `docs/nightshift/plans/FIXPLAN-FIX-048-committed-images-public.md` — Low: `.gitignore` for `public/images/`, 5 min.
- `docs/nightshift/plans/FIXPLAN-FIX-045-visuals-plan-stale-presets.md` — Low: update preset names in visuals-integration-plan.md, 10 min.
- `docs/nightshift/plans/FIXPLAN-FIX-046-companion-first-stale-copy.md` — Low: stale copy + dead code, 20 min.
- `docs/nightshift/plans/FIXPLAN-FIX-030-threads-route-keith-role.md` — Medium: one-line role fix, 5 min.
- `docs/nightshift/plans/FIXPLAN-FIX-027-ai-activity-route-keith-role.md` — Medium: one-line role fix, 5 min.
- `docs/nightshift/plans/FIXPLAN-FIX-026-stale-keith-role-rls.md` — Medium: migration 040 (takes priority over IDEA-043 Phase 5 for the 040 slot).

### Recommendations
- **If you have 15 min:** IDEA-048 — add the Ask companion CTA near the top of story pages. The exact JSX is already in `DEVPLAN-IDEA-040-ask-about-this-chapter.md` Phase 1 code block. One insertion at line ~166 of `stories/[storyId]/page.tsx`.
- **If you have 30 min:** IDEA-048 (15 min) + FIX-047 (15 min). Ask CTA at top + all APIs upgraded to Sonnet 4.6.
- **If you have 2 hours:** The 30-min batch + IDEA-042 (2 hrs). After this: Ask has a top-of-page CTA, Sonnet is upgraded, and follow-up chips are working — three high-visibility companion improvements live.

---

## Run: 2026-05-02 (Run 18)

### Summary
- Scanned: 0 new code commits since Run 17 nightshift (`ac74916`). **Catch-up**: Run 17 missed scanning commits `03d7d20` (visual spec architecture) and `74aeae5` (world-branched vocabulary + parent_entity inheritance) — both between Run 16 and Run 17. Scanned and documented tonight.
- Issues: 2 new found (FIX-047 Low: stale `claude-sonnet-4-20250514` in 8 files; FIX-048 Low: ~15MB binary test renders in `public/images/`). 0 resolved. 0 spoiler-leak P0.
- Ideas (by theme): ask-forward 1 seed (IDEA-045) / 1 promoted to planned (IDEA-042 dev plan written); genmedia 1 seed (IDEA-046) / 0 promoted; post-read-world 1 seed (IDEA-047) / 0 promoted; parked 0.
- Plans written: DEVPLAN-IDEA-042, FIXPLAN-FIX-047, FIXPLAN-FIX-048.

### Build & Lint & Test Results
- `npm install`: required in fresh sandbox clone (dependencies not pre-installed)
- `node_modules/.bin/next build`: **PASSES** — same ~106 routes as Run 17. (`npx next build` pulls wrong version in sandbox — use local binary.)
- `npm run lint`: **PASSES** — 0 errors, **4 warnings** (same 4 `<img>` tag warnings, unchanged).
- `npm test`: **192 PASS / 0 FAIL** (unchanged from Run 17).

### Key Findings

1. **Run 17 missed two commits between Run 16 and Run 17.** Commits `03d7d20` ("Add visual spec architecture") and `74aeae5` ("Add world-branched vocabulary, parent_entity inheritance, Valkyrie state + interior specs") were committed April 28 after Run 16 nightshift but not scanned by Run 17. Tonight's run documents what they introduced and updates STATUS.md.

2. **New visual spec system** (commits `03d7d20` + `74aeae5`). `content/wiki/specs/` now has 17 entity directories, 14 with `master.json`, 25 total JSON files. Key additions:
   - `src/lib/visuals/specs/loader.ts` — `composeEntitySpec()` with parent_entity inheritance (cycle-protected, 6-level depth limit). Render order: parent.master → parent.features → parent.state → child.master → child.features → child.view → child.state.
   - `src/lib/visuals/specs/types.ts` — `SpecLayer`, `ComposedSpec`, `SpecCompositionRequest`.
   - `synthesize-prompt.ts` — 3-world canonical vocabulary in SYSTEM_PROMPT: WORLD A (alien_organic: Valkyrie-1), WORLD B (earth_2050: Mars/military/Earth), WORLD C (ancient_vault: Giza/pre-human).
   - `view` and `state` params added to `/api/visuals/prompt` route and `VisualsAdminConsole.tsx`.
   - 5 harmonic states for Valkyrie-1 (`dormant`, `wake`, `active`, `alignment`, `harmonic_jump`).
   - 11 Valkyrie-1 interior locations with `parent_entity: "valkyrie-1"` stub specs.
   - SYNTH_PROMPT_VERSION = `v9` (already bumped in `58b2527` to cover new vocabulary).

3. **FIX-047 (Low — NEW): 8 API model references use stale `claude-sonnet-4-20250514`.** Every hard-coded model ID in `personas.ts`, `synthesize-prompt.ts`, `extract-vision.ts`, `session-wrap.ts`, `profile-reflection.ts`, and 3 API routes uses the old model ID. Current latest: `claude-sonnet-4-6`. Fix: 8-file find/replace + ledger pricing entry + bump SYNTH_PROMPT_VERSION to v10. Plan: FIXPLAN-FIX-047.

4. **FIX-048 (Low — NEW): ~15MB of binary test renders committed to `public/images/`.** Commits `03d7d20` + `74aeae5` added 14 image files including 5 Valkyrie harmonic state renders (~2MB each) and 8 spec development renders. No `.gitignore` pattern prevents more additions. Note: the 5 state renders may be intentionally public-facing (IDEA-047 dependency). Plan: FIXPLAN-FIX-048.

5. **All builds/tests/lint clean.** No regressions from the spec system additions. The spec loader compiles cleanly; used only from server-side routes.

6. **Review queue unchanged.** `brain_lab/out/review-queue.md` still shows 9 character files with `reviewed: false`. File last generated 2026-04-26T20:05:34Z — needs a pipeline re-run.

7. **FIX-045 and FIX-046 remain unexecuted.** No new code commits since Run 17 — plans are ready but unimplemented.

8. **IDEA-042 (Follow-Up Chips) promoted to `planned`.** Dev plan `DEVPLAN-IDEA-042-follow-up-chips.md` written. New `src/lib/ai/ask-suggestions.ts` module using `claude-haiku-4-5-20251001`; suggestions included in `done: true` SSE event; rendered as chip buttons in ask/page.tsx between markdown div and AskSourcesDisclosure.

9. **Note on git state.** Previous nightshift commits (Run 15–17) were made locally but NOT pushed to `origin/main` (`origin/main` is at `724d66b`, "updated arcs"). Tonight's push will be to origin/main with the docs/nightshift/ delta only. Paul: to push the full local history including Runs 15–17 code commits, run `git push origin <local-commit-hash>:main` from the development machine.

### Plans Ready to Execute
- `docs/nightshift/plans/DEVPLAN-IDEA-040-ask-about-this-chapter.md` — **ready (ask-forward)**: Ask companion CTA on story pages, 15 min. Still highest-ROI feature not yet shipped.
- `docs/nightshift/plans/DEVPLAN-IDEA-042-follow-up-chips.md` — **NEW planned (ask-forward)**: Follow-up chip suggestions after Ask answers, 2 hours.
- `docs/nightshift/plans/FIXPLAN-FIX-047-stale-model-id.md` — **NEW Low**: 8-file model ID update to `claude-sonnet-4-6`, 15 min.
- `docs/nightshift/plans/FIXPLAN-FIX-048-committed-images-public.md` — **NEW Low**: `.gitignore` for `public/images/`, 5 min.
- `docs/nightshift/plans/FIXPLAN-FIX-045-visuals-plan-stale-presets.md` — Low: update preset names in visuals-integration-plan.md, 10 min.
- `docs/nightshift/plans/FIXPLAN-FIX-046-companion-first-stale-copy.md` — Low: stale copy + dead code, 20 min.
- `docs/nightshift/plans/FIXPLAN-FIX-030-threads-route-keith-role.md` — Medium: one-line role fix, 5 min.
- `docs/nightshift/plans/FIXPLAN-FIX-027-ai-activity-route-keith-role.md` — Medium: one-line role fix, 5 min.
- `docs/nightshift/plans/FIXPLAN-FIX-026-stale-keith-role-rls.md` — Medium: migration 040 for RLS (update migration number in plan before executing).

### Recommendations
- **If you have 15 min:** IDEA-040 (`stories/[storyId]/page.tsx` ~8 lines JSX). Ship the Ask companion CTA — it's been ready for 2 nightshift runs.
- **If you have 30 min:** IDEA-040 (15 min) + FIX-047 (15 min). Ask CTA live + all APIs upgraded to Sonnet 4.6.
- **If you have 2 hours:** The 30-min batch + IDEA-042 (2 hrs). After this: Ask has a CTA, Sonnet is upgraded, and follow-up chips are working.

---

## Run: 2026-05-01 (Run 17)

### Summary
- Scanned: 2 code commits since Run 16 — `0e60b8c` ("fixes", 18 files, 137 insertions — FIX-043/044/039/037/034 + **companion-first product direction shift**), `58b2527` ("fixing admin", 13 files, 550 insertions — visuals integration plan + 8 Celestial-specific style presets + SYNTH_PROMPT_VERSION v9 + keith added back to route guards for backward compat).
- Issues: 2 new (FIX-045 Low: visuals-integration-plan.md uses obsolete preset names; FIX-046 Low: stale "unlock as you progress" UI copy + dead code after companion-first shift). 5 resolved this run (FIX-043, FIX-044, FIX-039, FIX-037, FIX-034). 0 spoiler-leak P0 — all P0/P1 gating issues remain parked (companion-first makes them moot).
- Ideas (by theme): ask-forward 1 seed (IDEA-042) / 1 promoted to ready (IDEA-040); genmedia 1 seed (IDEA-043) / 0 promoted; post-read-world 1 seed (IDEA-044) / 0 promoted; parked 10 (IDEA-041, IDEA-038, IDEA-036, IDEA-034, IDEA-033, IDEA-032, IDEA-030, IDEA-039, IDEA-037; + IDEA-023 and others already parked). **First run using three-theme BACKLOG structure** — all existing ideas re-tagged or moved to Parked.
- Plans written: FIXPLAN-FIX-045, FIXPLAN-FIX-046, DEVPLAN-IDEA-040.

### Build & Lint & Test Results
- `npm install`: clean
- `npx next build`: **PASSES** — ~106 routes. 1 expected Turbopack NFT warning.
- `npm run lint`: **PASSES** — 0 errors, **4 warnings** (`<img>` tags in `VisualsAdminConsole.tsx:230,394` and `EntityVisualsGallery.tsx:64,118`). Same as Run 16.
- `npm test`: **192 PASS / 0 FAIL** (192 total — up from 191; +1 new test for companion-first defaults in `reader-progress.test.ts`; 3 previously-failing tests now pass: FIX-037 Superset + FIX-034 parable Status). **First clean test run since at least Run 12.**

### Key Findings

1. **COMPANION-FIRST PRODUCT DIRECTION SHIFT.** Commit `0e60b8c` fundamentally changed `reader-progress.ts`: `getReaderProgress()` now defaults ALL users (unauthenticated and authenticated with no DB reads) to `currentChapterNumber = max chapter (17)` and `readStoryIds = all CH01–CH17`. Authenticated users with any DB reads still use their actual progress for `readStoryIds`, but `currentChapterNumber` is always `max(theirProgress, 17) = 17`. Effect: `isStoryUnlocked()` returns `true` for every story for every user. The progressive-unlock UX is no longer the default. This explains why all P0/P1 chapter-gating issues (FIX-036, FIX-032, FIX-038, FIX-041, FIX-042, FIX-031, FIX-035) were parked — they're structurally moot.

2. **FIX-043, FIX-044, FIX-039, FIX-037, FIX-034 all RESOLVED.** Commit `0e60b8c` fixed all five: visuals routes now accept `["admin", "author"]` (commit `0e60b8c`), then `["admin", "author", "keith"]` (commit `58b2527` backward compat). Migration 039 fixed DB-layer RLS for visual tables to `author/admin`. `getJourneyContextForPrompt` now accepts `readerProgress`. Location and parable metadata gaps patched. All 3 test failures gone.

3. **NEW: 8 Celestial-specific style presets** replace 4 generic ones. Commit `58b2527` rewrote `style-presets.ts` with Celestial-canon-grounded presets: `valkyrie_shipboard`, `vault_threshold`, `mars_excavation`, `earth_institutional`, `giza_archaeological`, `noncorporeal_presence`, `intimate_crew`, `mythic_scale`. Anchors quote and paraphrase canon (resonance color semantics, glyph language, curve geometry). `SYNTH_PROMPT_VERSION` bumped to `v9` to bust the prompt cache. Build verifies all 8 new `StylePresetKey` values compile.

4. **FIX-045 (Low — NEW): `visuals-integration-plan.md` uses 4 obsolete preset names.** `docs/celestial/visuals-integration-plan.md` (348 lines, added in `58b2527`) has a ~30-row anchor seeding table that references `cinematic_canon`, `painterly_lore`, `noir_intimate`, `mythic_wide` — all deleted from `StylePresetKey` in the same commit. If Paul follows the plan and copies preset names into code, TypeScript will reject them. Quick docs find/replace fix before executing Phase 0.

5. **FIX-046 (Low — NEW): Stale "unlock as you progress" copy in 3 UI locations after companion-first shift.** `HomePageClient.tsx:16` ("Begin at Chapter 1 and unlock the companion as you progress"), `StoriesPageClient.tsx:217` ("read to unlock"), and `stories/[storyId]/page.tsx:42–60` (dead `if (!unlocked)` block) all reference a gating model that no longer applies. The dead code block can never execute since `isStoryUnlocked` always returns `true` under companion-first.

6. **`AskAboutStory.tsx` is a legacy "Write to Keith" author Q&A widget, NOT the AI Ask companion.** On the story detail page, the `#ask` TOC section renders `AskAboutStory` — which submits notes to the author at `/api/stories/{storyId}/questions`, not the AI. Copy says "Keith will see it" and "Send to Keith" — FIX-028 scope. IDEA-040 (now ready) adds a distinct "Ask the companion" CTA pointing to the actual AI `/ask` page.

7. **All tests green for first time since Run 12.** 192/192 pass. Prior 3 failures (andes-glacial-lake Superset, parables Status, Superset canon parent match) all fixed.

8. **Migration 039 DB vs app-layer role inconsistency (intentional).** Migration 039 RLS uses `'author' or 'admin'` only. App-layer routes use `["admin", "author", "keith"]` (keith re-added in commit `58b2527` for backward compat). This means `role='keith'` accounts can pass the app gate but are rejected at the DB layer for visual INSERT/UPDATE. Paul's solution is likely to migrate his account to `role='author'` when ready. FIX-026 (migrations 025-028) remains open — those still let `keith` write to other tables while blocking `author`.

9. **`brain_lab/out/review-queue.md` shows 9 entries (stale, not regenerated).** File was generated 2026-04-26; commit `724d66b` (Run 15) reportedly resolved one entry. Actual count needs a pipeline re-run to confirm. Treating as ~8-9 character files still `reviewed: false`.

### Plans Ready to Execute
- `docs/nightshift/plans/DEVPLAN-IDEA-040-ask-about-this-chapter.md` — **NEW ready (ask-forward)**: Ask companion CTA on story pages, 0.25 hours — simplest, highest-ROI feature tonight
- `docs/nightshift/plans/FIXPLAN-FIX-045-visuals-plan-stale-presets.md` — **NEW Low**: update preset names in visuals-integration-plan.md before running Phase 0 (10 min)
- `docs/nightshift/plans/FIXPLAN-FIX-046-companion-first-stale-copy.md` — **NEW Low**: update stale "unlock" copy + remove dead code (20 min + Paul copy decisions)
- `docs/nightshift/plans/FIXPLAN-FIX-030-threads-route-keith-role.md` — Medium: one-line role fix in threads admin route (5 min)
- `docs/nightshift/plans/FIXPLAN-FIX-027-ai-activity-route-keith-role.md` — Medium: one-line role fix in ai-activity route (5 min)
- `docs/nightshift/plans/FIXPLAN-FIX-026-stale-keith-role-rls.md` — Medium: migration 040 for RLS (note: update migration number in plan to **040** before executing)

### Recommendations
- **If you have 15 min:** IDEA-040 (8 lines JSX, 0.25 hours). Adds the Ask companion CTA to every chapter page — the single most impactful product improvement available right now.
- **If you have 30 min:** IDEA-040 (15 min) + FIX-045 (10 min) + FIX-046 single-file portion (5 min). Three things shipped: companion CTA live, visuals plan ready to execute, home page copy updated.
- **If you have 1 hour:** The 30-min batch above + FIX-027 + FIX-030 (10 min combined — two one-liners) + start FIX-026 migration 040. After this: all three stale keith admin routes fixed, tests green, compiler clean.

---

## Run: 2026-04-28 (Run 16)

### Summary
- Scanned: 3 code commits since Run 15 — `3ffc33c` (wiki-first Ask retrieval, 1165 insertions), `ce762b7` (merge), `af27957` (corpus-grounded visuals pipeline, 3118 insertions, 30 files, migrations 035–038).
- Issues: 2 new (FIX-043 Medium-High: requireKeith in visuals routes blocks authors; FIX-044 Medium: migration 035 RLS uses keith role), 1 resolved (FIX-040: dead storyContextRaw fetch gone from orchestrator rewrite). All prior P0/P1 issues unchanged.
- Ideas: 2 new seeds (IDEA-040 new: "Ask About This Chapter" CTA on story pages; IDEA-041 enhance: shared requireAuthor() helper), 2 advanced (IDEA-030 exploring→planned + dev plan; IDEA-038 seed→exploring), 1 parked (IDEA-035 stale 3 days).
- Plans written: FIXPLAN-FIX-043, FIXPLAN-FIX-044, DEVPLAN-IDEA-030.

### Build & Lint & Test Results
- `npm install`: clean
- `npx next build`: **PASSES** — ~106 routes (+7 new: admin visuals page + 6 visuals API routes). 1 expected Turbopack NFT warning.
- `npm run lint`: **PASSES** — 0 errors, **4 warnings** (new: `<img>` tags in `VisualsAdminConsole.tsx:226,374` and `EntityVisualsGallery.tsx:64,118`)
- `npm test`: **188 PASS / 3 FAIL** (191 total — up from 178; +13 new wiki-first retrieval tests all passing)
  - Test 127: `every location has Superset:` → FIX-037 still open
  - Test 128: `all parables carry Status` → FIX-034 still open
  - Test 131: `location Superset: matches canon parent` → FIX-037 still open

### Key Findings

1. **FIX-043 (Medium-High — NEW): Entire visuals system broken for author accounts.** Commit `af27957` introduced 5 visuals mutation API routes and 1 admin console page, all defining an inline `requireKeith()` function that checks `["admin", "keith"].includes(profile.role)`. Celestial's author role is `'author'`, not `'keith'`. Author accounts receive 403 from: `/api/visuals/prompt`, `/api/visuals/generate`, `/api/visuals/approve`, `/api/visuals/asset/[id]`, `/api/visuals/reference`, and `/profile/admin/visuals`. Same pattern as FIX-027 (ai-activity route) and FIX-030 (threads route). Six-file string-swap fix. Plan: FIXPLAN-FIX-043.

2. **FIX-044 (Medium — NEW): Migration 035 RLS uses `role = 'keith'` in 4 policies.** `035_visual_prompts_assets.sql` policies "Keith admin can insert/update visual prompts/assets" all check `p.role = 'keith' or p.role = 'admin'`. Even after FIX-043 fixes the app layer, author accounts would be blocked at the DB layer. Fix: new migration **039** (035–038 consumed by the visuals commit). Plan: FIXPLAN-FIX-044.

3. **FIX-040 RESOLVED: Dead `storyContextRaw` DB fetch is gone.** Commit `3ffc33c` rewrote `orchestrator.ts buildPromptArgs()` around the wiki-first context pack (`createAskContextPack` + `retrieveAskContextItems`). The dead `getCanonicalStoryMarkdown(storySlug)` call is absent from the new code. No more wasted Supabase round-trip on every Ask with a storySlug.

4. **Wiki-first Ask retrieval (Run 16): Correct reader-progress gating confirmed.** `ask-retrieval.ts` receives `readerProgress` and applies `storyIsVisible()` per item. The orchestrator pre-filters `visibleStories` before building retrieval sources. The new architecture is safer than the old one for spoiler gating (retrieval-layer filter, not just prompt-layer instruction). +13 new tests all pass.

5. **FIX-038 still open in new orchestrator.** The `journeyBeats` mapping in `buildPromptArgs()` (new orchestrator, line ~300) still does `.slice(0, N).map(...)` without a preceding `filter(b => isStoryUnlocked(b.chapterId, readerProgress))`. The beats path survived the rewrite unchanged. FIX-038 plan remains valid; add filter before the slice.

6. **FIX-042 still open.** `prompts.ts` `getCharacterArcContext()` lines 181-184 still include `unresolvedTensions` and `futureQuestions`. These were not touched by the wiki-first retrieval rewrite. FIX-042 two-line deletion plan remains valid.

7. **FIX-041 still open.** Both `/arcs/page.tsx` and `/arcs/[slug]/page.tsx` have zero auth checks — confirmed by reading the source. FIX-041 plan remains valid.

8. **`content/voice.md` and `content/decision-frameworks.md` remain stubs.** Neither commit touched these files. Ask quality depends on them. IDEA-024 (parked) flagged this — un-park explicitly when Paul is ready for voice authoring.

9. **Visuals corpus context does NOT apply reader-progress gating** — but this is acceptable since `buildVisualCorpusContext()` is only called from author-gated API routes. The visual director gets full corpus access by design (authorial perspective). No reader-facing spoiler risk.

10. **`EntityVisualsGallery` on entity pages is reader-facing but spoiler-safe.** Shows only approved/reference assets. Images are decorative visual content, not narrative text. `listEntityVisuals` uses `createAdminClient()` and filters to `approved=true OR provider=manual_upload`. No chapter gating needed — entity names/descriptions already visible to all readers.

### Plans Ready to Execute
- `docs/nightshift/plans/FIXPLAN-FIX-043-visuals-routes-keith-role.md` — **NEW Medium-High**: fix requireKeith() → author in 6 files (10 min)
- `docs/nightshift/plans/FIXPLAN-FIX-044-visual-migration-035-keith-rls.md` — **NEW Medium**: create migration 039 for visual table RLS (10 min)
- `docs/nightshift/plans/FIXPLAN-FIX-041-arcs-page-author-gating.md` — **P0**: gate arc pages (15 min)
- `docs/nightshift/plans/FIXPLAN-FIX-036-ask-story-slug-spoiler-gate.md` — **P0**: storySlug validation in Ask API (10 min)
- `docs/nightshift/plans/FIXPLAN-FIX-032-beat-timeline-chapter-gating.md` — **P0**: BeatTimeline gating on journey page (15 min)
- `docs/nightshift/plans/FIXPLAN-FIX-042-arc-context-spoiler-sections.md` — **P1**: Remove unresolvedTensions + futureQuestions from arc AI context (5 min)
- `docs/nightshift/plans/FIXPLAN-FIX-038-orchestrator-journey-beats-gating.md` — **P1**: filter journey beats in orchestrator (5 min)
- `docs/nightshift/plans/FIXPLAN-FIX-037-andes-glacial-lake-superset.md` — restores tests 127+131 (5 min)
- `docs/nightshift/plans/FIXPLAN-FIX-034-parables-status-field.md` — restores test 128 (5 min)
- `docs/nightshift/plans/DEVPLAN-IDEA-030-ask-evidence-citation-chips.md` — **NEW planned**: citation chips below Ask bubbles (45 min)
- `docs/nightshift/plans/DEVPLAN-IDEA-034-chapter-arc-progress-bar.md` — **ready**: progress bar on /stories (30 min)
- `docs/nightshift/plans/FIXPLAN-FIX-039-journey-context-prompt-story-gating.md` — P2: gate journey story summaries in AI prompt (20 min)

### Recommendations
- **If you have 20 min:** FIX-043 + FIX-044 (20 min combined). Unblocks the entire visuals system for author accounts — this is currently completely broken.
- **If you have 1 hour:** The 20-min batch above + FIX-041 (15 min P0) + FIX-036 (10 min P0) + FIX-042 (5 min P1) + FIX-037 + FIX-034 (5 min each). After this: visuals unblocked, 2 P0 spoiler gaps sealed, arc AI context cleaned, all 3 tests passing.
- **If you have 2 hours:** The 1-hour batch above + FIX-032 (15 min P0) + FIX-038 (5 min P1) + IDEA-030 (45 min). After this: all P0/P1 spoiler gaps sealed + Ask evidence chips live.

---

## Run: 2026-04-27 (Run 15)

### Summary
- Scanned: 1 code commit since Run 14 (`724d66b` — "updated arcs, working on vercel deploy", 62 files, 3640 insertions). Major additions: character arcs system (9 arc ledger files + `character-arcs.ts` parser + `/arcs` routes + AI context injection), character detail arc panel, `ask-answer-playbooks.md`, `publishing-and-launch-plan.md`.
- Issues: 2 new P0/P1 (FIX-041 P0: arcs pages ungated; FIX-042 P1: arc AI context leaks spoilers), 0 resolved. All prior open issues unchanged.
- Ideas: 2 new seeds (IDEA-038 enhance: per-chapter character state reveal; IDEA-039 new: character-scoped Ask), 1 advanced (IDEA-034 exploring→ready + dev plan written), 4 parked (IDEA-028, IDEA-023, IDEA-026, IDEA-029 — stale 3-5 days).
- Plans written: FIXPLAN-FIX-041, FIXPLAN-FIX-042, DEVPLAN-IDEA-034.

### Build & Lint & Test Results
- `npm install --prefer-offline`: clean
- `npx next build`: **PASSES** — ~98 routes (+2 new arcs routes). 1 expected Turbopack NFT warning.
- `npm run lint`: **PASSES** — 0 errors, 0 warnings
- `npm test`: **175 PASS / 3 FAIL** (178 total — up from 173; +5 new character-arcs tests all passing)
  - Test 114: `every location has Superset:` → FIX-037 still open (andes-glacial-lake had 2 lines added in `724d66b` but the Superset field was NOT added)
  - Test 115: `all parables carry Status` → FIX-034 still open
  - Test 118: `location Superset: matches canon parent` → FIX-037 still open

### Key Findings

1. **FIX-041 (P0 — NEW): `/arcs` and `/arcs/[slug]` are completely ungated.** Commit `724d66b` added 9 character arc ledger files in `content/wiki/arcs/characters/`, a `character-arcs.ts` parser, and two new pages — `/arcs/page.tsx` and `/arcs/[slug]/page.tsx`. Both pages have zero auth checks. The arc detail page renders `arc.markdown` unfiltered via `StoryMarkdown`, including the "Chapter Arc Entries" table (verbatim CH01-CH17 events), "Major Choices And Consequences", and "Current State By Chapter Boundary" — all of which spoil the entire Book I arc for a CH01 reader. Additionally, `/characters/[slug]/page.tsx` renders `CharacterArcPanel` (showing Starting State excerpt + link to full arc) for ALL authenticated readers, pointing them to the ungated page. Fix: gate both arc pages with `hasAuthorSpecialAccess()` (same pattern as `/beyond/page.tsx`). Remove `CharacterArcPanel` link for non-authors.

2. **FIX-042 (P1 — NEW): Character arc AI context leaks arc endpoints.** `getCharacterArcContext()` in `prompts.ts` (lines 171–200) injects four sections per character into every Ask prompt via `sharedContentBlock()`. The `unresolvedTensions` and `futureQuestions` sections contain spoilery framing — "Can a **merged** ALARA still refuse" (= CH17 merge), "once CAEDEN's occupation becomes visible" (= CH16+ event). The Reader Progress Gate is a prompt-level instruction, not a code-level gate. Fix: remove `unresolvedTensions` and `futureQuestions` from the AI context (two-line deletion in `getCharacterArcContext`); retain `startingState` and `askGuidance` which are safe.

3. **FIX-040 (Low-Medium): Dead `storyContextRaw` fetch still present.** `orchestrator.ts` lines 185/201 still include `storyContextRaw` in the `Promise.all` and `void storyContextRaw;`. The `8 lines changed` in orchestrator in `724d66b` added `getCharacterArcContext` import and the `characterArcContextIncluded` evidence flag — did not fix FIX-040.

4. **Character arcs system is well-structured but needs gating.** The `character-arcs.ts` parser is clean, the arc files use a consistent format with good `## ASK Guidance` sections, the `ask-answer-playbooks.md` doc is a solid addition for future AI quality work. The `character-arcs.test.ts` (4 tests, all passing) validates the parser. The architecture is sound; it just needs the two gating fixes (FIX-041 + FIX-042) before it's safe to ship.

5. **`andes-glacial-lake.md` still missing Superset field after `724d66b`.** The commit touched the file (+2 lines) but the 2 added lines appear to be minor content edits, NOT the `**Superset:** [[earth]]` field required by tests 114 and 118. FIX-037 remains open.

6. **`chapter_tags.json` regenerated — still all `reviewed: false`.** The `724d66b` commit regenerated all 17 chapter tag entries (+1571/-955 lines). Review status reset is expected behavior since `scripts/tag-chapter-entities.ts` always writes `reviewed: false`. IDEA-032 (quality gate) and IDEA-035 (review dashboard) remain relevant.

7. **4 ideas parked by 3-day stale rule.** IDEA-028 (Continuity Diff, planned 3 days), IDEA-023 (Explore Hub, planned 5 days), IDEA-026 (Open Threads page, planned 4 days), IDEA-029 (Reader Arc Progress, ready 5 days). All have dev plans that remain valid. FIX-032 must ship before IDEA-029 can be un-parked; FIX-030 must ship before IDEA-026.

8. **New docs added.** `docs/celestial/publishing-and-launch-plan.md` (237 lines — launch timeline), `docs/celestial/ask-answer-playbooks.md` (93 lines — question-type matrix), `docs/continuity/character-arc-review.md` (107 lines — arc review rubric). These are documentation artifacts, not nightshift outputs; no action needed.

### Plans Ready to Execute
- `docs/nightshift/plans/FIXPLAN-FIX-041-arcs-page-author-gating.md` — **NEW P0**: Gate `/arcs` + `/arcs/[slug]` with `hasAuthorSpecialAccess()`, remove arc link from character page for readers (15 min)
- `docs/nightshift/plans/FIXPLAN-FIX-036-ask-story-slug-spoiler-gate.md` — **P0**: storySlug validation in Ask API (10 min)
- `docs/nightshift/plans/FIXPLAN-FIX-032-beat-timeline-chapter-gating.md` — **P0**: BeatTimeline gating on journey page (15 min)
- `docs/nightshift/plans/FIXPLAN-FIX-042-arc-context-spoiler-sections.md` — **NEW P1**: Remove unresolvedTensions + futureQuestions from arc AI context (5 min)
- `docs/nightshift/plans/FIXPLAN-FIX-038-orchestrator-journey-beats-gating.md` — **P1**: filter journey beats in orchestrator (5 min)
- `docs/nightshift/plans/FIXPLAN-FIX-040-dead-story-context-raw-fetch.md` — **Low-Medium**: remove dead storyContextRaw DB fetch (5 min)
- `docs/nightshift/plans/FIXPLAN-FIX-037-andes-glacial-lake-superset.md` — restores tests 114+118 (5 min)
- `docs/nightshift/plans/FIXPLAN-FIX-034-parables-status-field.md` — restores test 115 (5 min)
- `docs/nightshift/plans/DEVPLAN-IDEA-034-chapter-arc-progress-bar.md` — **NEW ready**: progress bar on /stories (30 min)
- `docs/nightshift/plans/FIXPLAN-FIX-039-journey-context-prompt-story-gating.md` — P2: gate journey story summaries in AI prompt (20 min)

### Recommendations
- **If you have 30 min:** FIX-041 (15 min P0) + FIX-042 (5 min P1) + FIX-037 + FIX-034 (5 min each). Seals the two new arc gating issues and clears all 3 test failures.
- **If you have 1 hour:** The 30-min batch above + FIX-036 (10 min P0) + FIX-032 (15 min P0) + FIX-038 (5 min P1). After this: all P0/P1 spoiler gaps sealed.
- **If you have 2 hours:** The 1-hour batch above + FIX-040 (5 min) + IDEA-034 (30 min) + IDEA-032 Phase 1+2 (45 min). After this: all gating fixed, dead DB call removed, chapter progress bar live, chapter tag review CLI ready for Paul.

---

## Run: 2026-04-26 (Run 14)

### Summary
- Scanned: 0 new code commits since Run 13 (last commit is `20edb3d` nightshift). Focused deep scan on Ask API route, orchestrator internals, fiction entity pages, admin routes, timeline view, and Beyond API.
- Issues: 1 new (FIX-040 Low-Medium: dead `storyContextRaw` DB fetch in orchestrator), 0 resolved, all prior open issues unchanged
- Ideas: 2 new seeds (IDEA-036 enhance: wiki entity audit page; IDEA-037 new: chapter recall mode), 2 advanced (IDEA-034 seed→exploring; IDEA-033 seed→exploring), 1 parked (IDEA-031 vault discovery map — 3-day stale rule)
- Plans written: FIXPLAN-FIX-040

### Build & Lint & Test Results
- `npm install --prefer-offline`: clean
- `npx next build`: **PASSES** — clean, 96 routes, 1 expected Turbopack NFT warning
- `npm run lint`: **PASSES** — 0 errors, 0 warnings
- `npm test`: **170 PASS / 3 FAIL** (173 total) — unchanged from Run 13
  - Test 113: `every location has Superset:` → FIX-037 still open
  - Test 114: `all parables carry Status` → FIX-034 still open
  - Test 117: `location Superset: matches canon parent` → FIX-037 still open

### Key Findings

1. **FIX-040 (Low-Medium — NEW): Dead `storyContextRaw` DB fetch wastes Ask latency.** `orchestrator.ts buildPromptArgs()` at line 188 calls `getCanonicalStoryMarkdown(storySlug)` — an async Supabase DB call — and assigns the result to `storyContextRaw`. Line 197 immediately discards it with `void storyContextRaw;`. Meanwhile, the actual story context used in AI prompts comes from `getStoryContext(args.storySlug)` in `perspectives.ts sharedContentBlock()` — which reads from the **filesystem**, not the DB. Every Ask request with a `storySlug` makes this redundant DB round-trip. Secondary concern: if a story was edited via Beyond (content in Supabase), the AI context uses the stale on-disk copy, not the canonical DB version. Fix is 3 deleted lines; Option B (wiring through properly) is a future enhancement.

2. **All P0/P1 issues still open.** FIX-036 (storySlug validation), FIX-032 (BeatTimeline UI gating), FIX-038 (orchestrator beats gating), FIX-039 (journey context story summaries), FIX-031 (entity pages), FIX-035 (vault pages) — none fixed since Run 12. Plans are all written and ready to execute.

3. **FIX-028 (legacy Keith) confirmed in Beyond API routes.** Beyond API routes `questions/[id]/seed-session/route.ts`, `drafts/[id]/publish/route.ts`, `drafts/from-story/route.ts`, and `published-stories/route.ts` all contain Keith-specific comments. `session-wrap.ts SYSTEM_PROMPT` (line 139) directly addresses "Keith" in AI persona text. All cosmetic; no functional impact.

4. **IDEA-034 advanced to `exploring`.** `StoriesPageClient.tsx` already receives `currentChapterNumber` (lines 77–83) and `showAllContent` as props from the server component. A progress bar above the chapter grid is a pure UI addition — no new API, no DB. Total chapters derived from `stories.filter(s => /^CH\d+/i.test(s.storyId)).length`. All three reader paths handled: new reader (0/17), mid-reader (N/17), re-reader (`showAllContent: true` → "Full archive"). Estimated 0.5 hours.

5. **IDEA-033 advanced to `exploring`.** `TimelineView.tsx` (199 lines) confirmed as a pure Server Component that calls `getTimeline()` + `getPrologueTimeline()`. Neither sources mission log data or applies chapter gating. A third "Valkyrie Mission" section reading from `getMissionLogInventory()` and gating rows by `isStoryUnlocked(row.chapterId, progress)` would complete the mission timeline story. `TimelineView` would need to become an async Server Component to call `getReaderProgress()`. Estimated 1.5 hours.

6. **IDEA-031 parked (3-day rule).** Seeded 2026-04-23 with no advancement. Its prerequisite FIX-035 (vault story gating) has been open for 4 days. Un-park explicitly after FIX-035 ships.

7. **Confirmed: `getReaderProgress()` is used correctly in character detail pages.** `src/app/characters/[slug]/page.tsx` imports and applies `isStoryUnlocked` at lines 139 and 181 — `memoirStoryIds` and `interviewStoryIds` are filtered before rendering story link lists. This is the correct pattern that FIX-031 needs to replicate for factions/locations/artifacts and FIX-035 for vaults.

8. **Review queue stable.** `brain_lab/out/review-queue.md`: still 9 character files marked `reviewed: false` — unchanged since Run 9. `chapter_tags.json`: all 17 chapters still have `reviewed: false`.

### Plans Ready to Execute
- `docs/nightshift/plans/FIXPLAN-FIX-036-ask-story-slug-spoiler-gate.md` — **P0**: storySlug validation in Ask API (10 min)
- `docs/nightshift/plans/FIXPLAN-FIX-032-beat-timeline-chapter-gating.md` — **P0**: BeatTimeline gating on journey page (15 min)
- `docs/nightshift/plans/FIXPLAN-FIX-038-orchestrator-journey-beats-gating.md` — **P1**: filter journey beats in orchestrator (5 min)
- `docs/nightshift/plans/FIXPLAN-FIX-040-dead-story-context-raw-fetch.md` — **NEW Low-Medium**: remove dead storyContextRaw DB fetch (5 min)
- `docs/nightshift/plans/FIXPLAN-FIX-037-andes-glacial-lake-superset.md` — restores tests 113+117 (5 min)
- `docs/nightshift/plans/FIXPLAN-FIX-034-parables-status-field.md` — restores test 114 (5 min)
- `docs/nightshift/plans/FIXPLAN-FIX-039-journey-context-prompt-story-gating.md` — P2: gate journey story summaries in AI prompt (20 min)
- `docs/nightshift/plans/DEVPLAN-IDEA-032-chapter-tag-quality-gate.md` — chapter tag quality gate + review CLI (45 min)
- `docs/nightshift/plans/DEVPLAN-IDEA-028-continuity-diff-beyond-panel.md` — Continuity diff panel in Beyond (1.5 hrs)

### Recommendations
- **If you have 30 min:** FIX-036 (10 min P0) + FIX-032 (15 min P0) + FIX-038 (5 min P1). Three gating fixes seal all P0/P1 AI-path spoiler gaps.
- **If you have 1 hour:** The 30-min batch above + FIX-040 (5 min) + FIX-037 + FIX-034 (5 min each). After this: all P0/P1 gaps sealed + all 3 test failures cleared + wasted DB call removed.
- **If you have 2 hours:** The 1-hour batch above + FIX-039 (20 min) + IDEA-032 Phase 1+2 (45 min). After this: full Ask journey context gated end-to-end, chapter tag review CLI ready for Paul.

---

## Run: 2026-04-25 (Run 13)

### Summary
- Scanned: 0 new code commits since Run 12 (last commit is `7b2d1b9` nightshift). Full codebase audit of AI context paths, chapter-gating gaps, and idea maturity.
- Issues: 2 new (FIX-038 P1: orchestrator journey beats not gated; FIX-039 P2: journey context story summaries not gated), 0 resolved, all prior open issues unchanged
- Ideas: 2 new seeds (IDEA-034 enhance: chapter arc progress bar; IDEA-035 new: author chapter review dashboard), 1 promoted seed→planned (IDEA-032 + dev plan written), 1 promoted seed→exploring (IDEA-030), 2 parked (IDEA-024 voice guide stub stale 3 days, IDEA-027 CH17 milestone stale 3 days)
- Plans written: FIXPLAN-FIX-038, FIXPLAN-FIX-039, DEVPLAN-IDEA-032

### Build & Lint & Test Results
- `npm install --prefer-offline`: required — fresh sandbox clone, offline cache available
- `npx next build`: **PASSES** — clean, 96 routes, 1 expected Turbopack NFT warning
- `npm run lint`: **PASSES** — 0 errors, 0 warnings
- `npm test`: **170 PASS / 3 FAIL** (173 total) — unchanged from Run 12
  - Test 113: `every location has Superset:` → FIX-037 still open
  - Test 114: `all parables carry Status` → FIX-034 still open
  - Test 117: `location Superset: matches canon parent` → FIX-037 still open

### Key Findings

1. **FIX-038 (P1 — NEW): Journey beats injected into AI prompts without reader progress filter.** In `src/lib/ai/orchestrator.ts` `buildPromptArgs()`, `listBeatsByJourney()` is called at line ~194 and the resulting beats are mapped into `PersonaPromptArgs.beats` without any `isStoryUnlocked` filter. Any reader passing `journeySlug` to the `/api/ask` endpoint receives all beats (including locked-chapter `whyItMatters` narrative) in the AI system prompt. `readerProgress` and `isStoryUnlocked` are already imported — the fix is one filter chain before the `.map()`. Note: STATUS.md previously said "FIX-032 in Ask path too" but FIXPLAN-FIX-032 only covered the journey page rendering, not the orchestrator. New plan FIXPLAN-FIX-038 covers the orchestrator path specifically.

2. **FIX-039 (P2 — NEW): `getJourneyContextForPrompt` injects all journey story summaries without progress gate.** `src/lib/ai/prompts.ts` lines 413–428: iterates ALL `journey.storyIds` and injects each story's `title` and `summary` (opening paragraph). Called in `perspectives.ts` `sharedContentBlock` at line 122 when `args.journeySlug` is set. Story summaries are opening paragraphs (not full body), so severity is P2 vs P1 for beats. Fix: add `readerProgress?` parameter to `getJourneyContextForPrompt` and filter by `isStoryUnlocked`. Update call site in `perspectives.ts` to pass `args.readerProgress`. Legacy `buildSystemPrompt` call at `prompts.ts:459` unaffected (optional param, dead code path anyway).

3. **IDEA-032 advanced to `planned`.** Confirmed `content/raw/chapter_tags.json` has 0 reviewed entries (all 17 `reviewed: false`). `StoryDetailsDisclosure.tsx` line 86 renders `{chapterTags && chapterTags.summary && ...}` without checking `chapterTags.reviewed`. If the quality gate shipped today, all summaries would be hidden until Paul runs the review CLI. Dev plan written: Phase 1 is a single `chapterTags.reviewed &&` addition; Phase 2 is `scripts/review-chapter-tags.ts` interactive CLI. Themes tag display is intentionally NOT gated (structural tags, not narrative prose).

4. **IDEA-030 advanced to `exploring`.** Confirmed the data path: `AskMessageEvidence.linksInAnswer` is already extracted and returned to the client as a final SSE event. Each link has `{ text, href, resolvedKind }`. Rendering 1–3 chips below the assistant message bubble is a pure UI change in `ask/page.tsx`. No additional gating needed — links come from AI-generated text that was already filtered through `visibleStories`. Estimated 1 hour.

5. **IDEA-024 and IDEA-027 parked.** Both were seeds since 2026-04-22 with no action for 3 days. IDEA-024 (voice guide) is P1 author content work, not code — un-park when Paul is ready to draft. IDEA-027 (CH17 overlay) remains P3 until CH17 content is complete.

6. **ASK_VERIFIER_STRICTNESS at `warn` by default means verifier never blocks responses.** `shouldBlock = strictness === "fail" && hasError` — at `warn` (default) this is always false. The verifier's `spoiler_story_link` detection is purely diagnostic. The actual spoiler protection relies on source-level gating (FIX-036, FIX-038, FIX-039). Noted in STATUS.md.

7. **All prior P0 issues still open.** FIX-036 (storySlug bypass), FIX-032 (BeatTimeline on journey pages) — neither was fixed in the zero-commit window since Run 12.

8. **FIX-028: 45 Keith/Cobb references confirmed in 20+ src/ files.** Grepped `src/` with case-insensitive pattern — count is 45 (higher than the "14+" noted previously; that was file count not occurrence count). Key functional surfaces: `session-wrap.ts` system prompt line 139 explicitly addresses "Keith" in the AI persona; `AskDemo.tsx` demo copy; `AskAboutStory.tsx` "Write to Keith" UI.

### Plans Ready to Execute
- `docs/nightshift/plans/FIXPLAN-FIX-036-ask-story-slug-spoiler-gate.md` — **P0**: storySlug validation in Ask API (10 min)
- `docs/nightshift/plans/FIXPLAN-FIX-032-beat-timeline-chapter-gating.md` — **P0**: BeatTimeline gating on journey page (15 min)
- `docs/nightshift/plans/FIXPLAN-FIX-038-orchestrator-journey-beats-gating.md` — **P1** NEW: filter journey beats in orchestrator (5 min)
- `docs/nightshift/plans/FIXPLAN-FIX-037-andes-glacial-lake-superset.md` — restores tests 113+117 (5 min)
- `docs/nightshift/plans/FIXPLAN-FIX-034-parables-status-field.md` — restores test 114 (5 min)
- `docs/nightshift/plans/FIXPLAN-FIX-039-journey-context-prompt-story-gating.md` — P2: gate journey story summaries in AI prompt (20 min)
- `docs/nightshift/plans/DEVPLAN-IDEA-032-chapter-tag-quality-gate.md` — chapter tag quality gate + review CLI (45 min)
- `docs/nightshift/plans/DEVPLAN-IDEA-028-continuity-diff-beyond-panel.md` — Continuity diff panel in Beyond (1.5 hrs)

### Recommendations
- **If you have 30 min:** FIX-036 (10 min P0) + FIX-032 (15 min P0) + FIX-038 (5 min P1). After this: both AI-path spoiler gates sealed, journey beats gated on both the page and the AI prompt.
- **If you have 45 min:** The 30-min batch above + FIX-037 + FIX-034 (5 min each). After this: all P0/P1 issues patched on the AI context side and all 3 test failures cleared.
- **If you have 2 hours:** The 45-min batch above + FIX-039 (20 min) + IDEA-032 Phase 1+2 (45 min). After this: full Ask journey context gated, chapter tag review CLI ready for Paul to use.

---

## Run: 2026-04-24 (Run 12)

### Summary
- Scanned: 3 commits since Run 11 (fddb8c0 → 49ccf15): `145a753` continuity improvements (9 new rules, 4 new locations, new timeline content, canon entity updates, `ingest-bible-rules.ts`, `getMissionLogsForChapter` + `getMissionTimelineContext` added to Ask context), `631dc5b` new color scheme (53 files, CSS overhaul, character content cleanup), `49ccf15` added artifacts (`tag-chapter-entities.ts`, `chapter-tags.ts`, `chapter_tags.json`, `enrich-artifact-dossier.ts`, chapter summary in StoryDetailsDisclosure)
- Issues: 2 new (FIX-036 P0 storySlug spoiler leak, FIX-037 Low andes-glacial-lake Superset), 1 resolved (FIX-033 vault probe order symptom resolved by content fix), 1 unchanged (FIX-034 still failing test 114)
- Ideas: 2 new seeds (IDEA-032 chapter tag quality gate, IDEA-033 mission timeline enhancement), 1 promoted (IDEA-028 exploring → planned), IDEA-025 budget cap noted
- Plans written: FIXPLAN-FIX-036, FIXPLAN-FIX-037, DEVPLAN-IDEA-028

### Build & Lint & Test Results
- `npx next build`: **PASSES** — clean, 96 routes (up from 95; +/timeline redirect). 1 expected Turbopack NFT warning.
- `npm run lint`: **PASSES** — 0 errors, 0 warnings
- `npm test`: **170 PASS / 3 FAIL** (173 total, up from 160 in Run 11; 13 new tests added by these commits). Failing:
  - Test 113: `every location has Superset: or is on root allow-list` — `andes-glacial-lake.md` missing `**Superset:** [[earth]]` (FIX-037)
  - Test 114: `all parables carry Status in Lore metadata` — `parables-of-resonance.md` still missing `**Status:**` (FIX-034, renumbered from 110 due to new tests)
  - Test 117: `wiki: location Superset: line matches canon parent when canon has one` — same root as Test 113 (FIX-037)
  - Test 108 (vault probe order): **NOW PASSING** — vault duplicates removed from `artifacts/` in commit `145a753`. FIX-033 resolved.

### Key Findings

1. **FIX-036 (P0 — NEW): `storySlug` not validated against reader progress in `/api/ask/route.ts`.** A reader at CH01 can POST `{ storySlug: "CH17" }` to the Ask API and receive: (a) the first 3 000 chars of CH17 story body via `getStoryContext()` in `sharedContentBlock`, (b) CH17 mission log entries (up to 600 chars each) via `getMissionLogsForChapter()` added in commit `145a753`, (c) CH17 scene data via `getScenesForChapter()`. The `visibleStories` story catalog is correctly gated, but the per-chapter context block bypasses it entirely. Fix: `route.ts` — after `getReaderProgress()`, check `isStoryUnlocked(storySlug, readerProgress)` and strip storySlug if false. 10-minute fix. Note: `getChapterTagsPromptBlock` (chapter summary) is in the dead-code `buildSystemPrompt` from `prompts.ts` — not active in the multi-persona orchestrator path, so not an active leak, but should be cleaned up.

2. **FIX-033 RESOLVED: Vault duplicate files removed.** Commit `145a753` deleted `content/wiki/artifacts/giza-vault.md`, `vault-002.md`, `vault-003.md`, `vault-006.md` — the duplicates that caused the slug resolver to find vaults in the artifacts/ directory first. Test 108 now passes. PROBE_ORDER in `slug-resolver.ts` still has `"artifacts"` before `"vaults"` (latent risk), but no active test failure.

3. **FIX-037 (Low — NEW — 2 tests fail): `andes-glacial-lake.md` missing `**Superset:**`.** Commit `145a753` seeded 4 new location files. Three (asteroid-belt, europa, ganymede) have empty `parent=""` in their canon dossier — no superset required. But `andes-glacial-lake` has `parent="earth"` in the canon dossier, so the canon-hubs and canon-integrity tests require a matching `**Superset:** [[earth]]` in the Lore metadata. One-line content fix.

4. **FIX-034 still open (test 114): `parables-of-resonance.md`** Lore metadata still has `**Subkind:** concept` and still missing `**Status:**`. Renumbered from test 110 to 114 by the 13 new tests added in these commits. Plan ready; no code changes needed — direct content edit.

5. **9 new Series Bible rules added.** `scripts/ingest-bible-rules.ts` (474 lines) seeded ancients-philosophy, conscious-machines, containment-morality, earth-2050, moral-questions, prologue-timeline, spiritual-symbols, technology-limits, vault-network into `content/wiki/rules/`. Total rules: 25 (up from 16). `RULES_CONTEXT_MAX_CHARS` raised from 18k to 60k in `prompts.ts` to accommodate all 25 rules in the Ask system prompt (previous cap was alphabetically truncating technology-limits and vault-network).

6. **New chapter tagging infrastructure.** `scripts/tag-chapter-entities.ts` produced `content/raw/chapter_tags.json` (2413 lines) — AI-generated entity + summary tags for all 17 chapters. `src/lib/wiki/chapter-tags.ts` provides typed access. `StoryDetailsDisclosure.tsx` now shows chapter summary and themes from chapter_tags when available. `ask-verifier.ts` cross-checks wiki links in Ask answers against the chapter's approved entity list (`off_chapter_entity_link` issue at warn severity). ⚠️ IDEA-032: `reviewed` flag on `ChapterTagRecord` is not checked before showing the summary to readers.

7. **Major color scheme overhaul (commit `631dc5b`).** 53 files changed. New `sci-panel`, `sci-card-link` CSS classes used across entity index pages. `TimelineView.tsx` significantly refactored. Character content cleaned up (8 characters had dossier data reset/simplified). No functional regressions detected in build or tests.

8. **FIX-028 (Keith UI copy) unchanged.** Color scheme commit did not address any Keith references. Still 14+ files.

9. **New artifacts: harmonic-drive.md added; echo-core.md and harmonic-key.md deleted.** Artifact count reduced from 7 to 5. No broken cross-references found in wiki or src/.

### Plans Ready to Execute
- `docs/nightshift/plans/FIXPLAN-FIX-036-ask-story-slug-spoiler-gate.md` — **P0**: storySlug validation in Ask API (10 min)
- `docs/nightshift/plans/FIXPLAN-FIX-037-andes-glacial-lake-superset.md` — content fix, unblocks tests 113+117 (5 min)
- `docs/nightshift/plans/FIXPLAN-FIX-034-parables-status-field.md` — content fix, unblocks test 114 (5 min)
- `docs/nightshift/plans/FIXPLAN-FIX-032-beat-timeline-chapter-gating.md` — **P0** BeatTimeline gating (15 min)
- `docs/nightshift/plans/DEVPLAN-IDEA-028-continuity-diff-beyond-panel.md` — Continuity diff panel in Beyond (1.5 hrs)

### Recommendations
- **If you have 10 min:** FIX-036 (P0, 10 min alone). The new `getMissionLogsForChapter` call added in this batch of commits makes the storySlug bypass significantly more dangerous — readers can now extract mission log bodies for locked chapters. Single import + one-line validation.
- **If you have 30 min:** FIX-036 (10 min) + FIX-037 (5 min) + FIX-034 (5 min) + FIX-032 (15 min P0). After this: two P0s patched, all tests passing, the most critical spoiler surfaces sealed.
- **If you have 2 hours:** The 30-min batch above + DEVPLAN-IDEA-028 (1.5 hrs). After this: both P0s gone, tests clean, and the Beyond workspace has a live continuity health check for the author.

---

## Run: 2026-04-23 (Run 11)

### Summary
- Scanned: 1 commit since Run 10 (8f2771d → 0ff28dd): "fixing characters. still not sure vaults and locations are correct" — 150 files changed, 6153 insertions. Massive content + feature commit: 10 new vault entities, 2 new rules, vault routes, ExploreHubTabs, ask-evidence/verifier system, fast/deep mode toggle, migrations 030–034, new audit scripts, character content fixes.
- Issues found: 3 new (FIX-033 test failure: vault slug probe order, FIX-034 test failure: parables Status field, FIX-035 P1: vault detail story gating)
- Issues existing: FIX-032 (P0) still NOT fixed; FIX-031, FIX-030, FIX-027, FIX-026 (needs migration 035 not 030) all still open
- Ideas: IDEA-025 marked SHIPPED; IDEA-026 advanced exploring → planned (dev plan written); IDEA-028 advanced seed → exploring; IDEA-030 and IDEA-031 seeded
- Plans written: FIXPLAN-FIX-033, FIXPLAN-FIX-034, FIXPLAN-FIX-035, DEVPLAN-IDEA-026

### Build & Lint & Test Results
- `npm install --prefer-offline`: required — node_modules not present in fresh clone (offline cache available)
- `npx next build`: **PASSES** — clean, 95 routes (up from 93). 1 expected Turbopack NFT warning.
- `npm run lint`: **PASSES** — 0 errors, 0 warnings
- `npm test`: **158 PASS / 2 FAIL** (160 total, up from 147 in Run 10). **Two new test failures introduced by commit 0ff28dd:**
  - Test 108: `martian-resonance-vault alias resolves to vault-002` — slug resolver returns `kind: "artifacts"` instead of `"vaults"` (probe order bug, FIX-033)
  - Test 110: `all parables carry Status in Lore metadata` — `parables-of-resonance.md` missing `**Status:**` (FIX-034)

### Key Findings

1. **FIX-032 (P0) STILL NOT FIXED.** `src/app/journeys/[slug]/page.tsx` unchanged since Run 10 — `listBeatsByJourney()` called without `getReaderProgress()` filter, beats passed unfiltered to `BeatTimeline`. The plan is ready; a 3-line fix is all that's needed. Priority #3 after the two test failures.

2. **FIX-033 (Low — test 108 fails): Vault slug probe order bug.** `slug-resolver.ts` PROBE_ORDER has `"artifacts"` before `"vaults"`. Four vault entity files (`giza-vault.md`, `vault-002.md`, `vault-003.md`, `vault-006.md`) exist in BOTH `artifacts/` and `vaults/` directories (duplicated, not moved, in commit 0ff28dd). Resolver hits artifacts first. 1-line fix: swap order in PROBE_ORDER array. Plan written.

3. **FIX-034 (Low — test 110 fails): `parables-of-resonance.md` content gap.** Lore metadata has `**Subkind:** concept` but canon dossier says `subkind="parable"`. Missing `**Status:**` field. All other parable rule files have this. Content-only fix; no `<!-- generated:ingest -->` marker. Plan written.

4. **FIX-035 (P1): Vault detail pages inherit FIX-031 gating gap.** New `/vaults/[slug]/page.tsx` uses `FictionEntityDetailPage` without `readerProgress`. Vault entities have `memoirStoryIds` extracted from `## Appearances` via `(CH0X)` patterns — e.g., vault-002 has CH06 and CH11. A CH01 reader sees these story links. Plan written; coordinate with FIX-031 since both touch `FictionEntityViews.tsx`.

5. **IDEA-025 SHIPPED: Rules wired into Ask.** `getRulesContext()` added to `prompts.ts` (lines 147–196), injected in `perspectives.ts` (lines 89–90). All 16 rules now in every Ask system prompt with a 10,000-character budget cap. New test `rules-context.test.ts` confirms. Ask answers about world mechanics (consent-threshold, directive-cn-24, vault parables, etc.) are now grounded in actual rule definitions.

6. **Major new AI infrastructure (Run 11):** `ask-evidence.ts` defines structured evidence schema (context sources, links in answer, verification result). `ask-verifier.ts` post-processes Ask answers: extracts in-answer links, checks story links against `isStoryUnlocked()` (spoiler_story_link issue code), checks wiki links against filesystem. Controlled by `ASK_VERIFIER_STRICTNESS` env (`warn` default). Evidence panel in `ask/page.tsx` shows debug info. Fast/Deep mode toggle persisted in localStorage.

7. **10 new vault entities in `content/wiki/vaults/`.** First-class wiki entity type: `getAllVaults()`, `getVaultBySlug()`, `/vaults`, `/vaults/[slug]` routes. `ExploreHubTabs.tsx` adds a sticky tab bar across all explore-section pages. `authored-body.ts` extracts hand-authored body from wiki files, stripping managed blocks.

8. **Migrations 030–034 address multiple previously unflagged gaps.** Notably: `033_cel_conversations_messages_rls.sql` adds missing RLS policies to `cel_conversations` and `cel_messages` (since `LIKE INCLUDING ALL` doesn't copy policies — conversations were RLS-on with zero policies, silently denying all writes). `034_cel_ai_interactions_insert_policy.sql` adds INSERT policy for AI ledger. **FIX-026 (stale keith role) still unaddressed — now needs migration 035.**

9. **15 characters in `content/wiki/characters/` (down from 16).** `elara-varen.md` deleted in this commit. No broken refs found in `src/` or other `content/wiki/` files — deletion appears clean. Review queue still 9 files.

### Plans Ready to Execute
- `docs/nightshift/plans/FIXPLAN-FIX-033-vault-slug-probe-order.md` — 1-line PROBE_ORDER fix, unblocks test 108 (5 min)
- `docs/nightshift/plans/FIXPLAN-FIX-034-parables-status-field.md` — content fix, unblocks test 110 (5 min)
- `docs/nightshift/plans/FIXPLAN-FIX-032-beat-timeline-chapter-gating.md` — **P0** BeatTimeline gating (15 min)
- `docs/nightshift/plans/FIXPLAN-FIX-035-vault-detail-story-gating.md` — vault story ID gating, coordinate with FIX-031 (30 min)
- `docs/nightshift/plans/DEVPLAN-IDEA-026-open-threads-mysteries-page.md` — mysteries reader page (1.2 hrs, after FIX-030)

### Recommendations
- **If you have 10 min:** FIX-033 (5 min) + FIX-034 (5 min). Two content/config fixes that restore all tests to passing. Zero risk.
- **If you have 30 min:** The 10-min batch above + FIX-032 (15 min P0). After this: tests pass, BeatTimeline is gated, no locked reader can see future chapter beats on journey pages.
- **If you have 1.5 hours:** The 30-min batch above + FIX-031 + FIX-035 (40 min combined). After this: every entity detail page (characters, factions, locations, artifacts, vaults) properly gates story links by reader progress. Full chapter-gating coverage on wiki entity pages.

---

## Run: 2026-04-22 (Run 10)

### Summary
- Scanned: 6 commits since Run 9 (884ac08 → 9b8bae4): Phase E (open threads admin API), Phase F (beats + BeatTimeline + seed script), Phase G (continuity-diff + review:ingestion CLI + snapshot), Phase H (session-wrap reflection + cache), wiki canon dossier rendering (CanonDossierCard, FictionEntityViews), canon entity seeding from lore sources
- Issues found: 3 new (FIX-030 threads route keith role, FIX-031 fiction entity story gating, FIX-032 **P0** BeatTimeline leaks locked chapter content)
- Issues existing: FIX-026, FIX-027, FIX-028 (scope expanded — 14+ Keith references including Phase E-H additions), FIX-029 all still open
- Ideas: IDEA-025 advanced exploring → ready (dev plan written), IDEA-026 advanced seed → exploring, IDEA-028 seeded (enhance), IDEA-029 seeded + immediately → ready (dev plan written)
- Plans written:
  - `FIXPLAN-FIX-030-threads-route-keith-role.md`
  - `FIXPLAN-FIX-031-fiction-entity-story-gating.md`
  - `FIXPLAN-FIX-032-beat-timeline-chapter-gating.md`
  - `DEVPLAN-IDEA-025-rules-in-ask.md`
  - `DEVPLAN-IDEA-029-reader-arc-progress.md`

### Build & Lint & Test Results
- `npx next build`: **PASSES** — clean, 93 routes (up from 37 in Run 9). 1 expected Turbopack NFT warning on `prompts.ts` filesystem reads.
- `npm run lint`: **PASSES** — 0 errors, 0 warnings.
- `npm test`: **147 PASS** (up from 96). New test files cover canon-dossier, continuity-diff, beats/repo, threads/repo, session-wrap, and reflections.

### Key Findings

1. **FIX-032 (P0): BeatTimeline leaks locked chapter content.** `src/app/journeys/[slug]/page.tsx` fetches ALL beats via `listBeatsByJourney()` and passes them unfiltered to `BeatTimeline`. The `directive-14` journey has beats tied to CH08/CH11/CH13/CH14 with summaries that contain actual story events — including a verbatim story quote from CH11. A reader at CH01 sees this content. Fix: 3-line change to call `getReaderProgress()` and filter beats by `isStoryUnlocked(beat.chapterId, progress)` in the journey page. Plan written.

2. **FIX-031 (P1): Faction/location/artifact detail pages show future chapter IDs.** `FictionEntityViews.tsx`'s `FictionEntityDetailPage` renders `memoirStoryIds` and `interviewStoryIds` without `isStoryUnlocked()` filtering. Character detail page correctly filters; the shared entity view component doesn't. Example: `/factions/council-of-orbits` at CH01 shows links to CH04 and CH07. Plan written.

3. **FIX-030 (Medium): New `/api/admin/threads` route checks stale `'keith'` role.** Phase E introduced the threads admin API but the `requireAdmin()` helper checks `["admin", "keith"]` instead of `["admin", "author"]`. Author accounts get 403 from all thread CRUD operations. Same bug as FIX-027, different file. Plan written.

4. **FIX-028 scope expanded.** 6 new "Keith" references found in Phase E-H code: `session-wrap.ts` system prompt, journey page fallback text, admin drafts page, principles page, themes page, welcome flow (2 locations). Total Keith references now 14+ files.

5. **Phase E-H architectural additions confirmed clean.** Open threads repository (`threads/repo.ts`), beats repository (`beats/repo.ts`), continuity diff module (`continuity-diff.ts`), session-wrap reflection generator (`session-wrap.ts`), and reflection cache (`reflections.ts`) all build cleanly, lint 0 errors, and have full test coverage. The beats are wired into the Ask orchestrator (`sharedContentBlock` injects them when `journeySlug` is set). Open threads are correctly chapter-gated in the Ask context via `listUnresolvedThroughChapter()`.

6. **Rules directory grew from 3 to 14 entries.** `content/wiki/rules/` now has 14 rule files (consent-threshold, directive-cn-24, memory-imprint, resonance-field, + 10 new including the-inheritance, vault-parables, the-pattern, etc.). None are in the Ask system prompt yet. IDEA-025 advanced to `ready` with a 35-minute dev plan.

7. **Ask beats context has the same gap as FIX-032.** The orchestrator's `buildPromptArgs()` calls `listBeatsByJourney()` without a reader-progress cutoff. If the user has `journeySlug` set in their Ask call, they receive beat content from locked chapters in the AI context. This is a lower-priority Ask-specific instance of the same gating gap — the AI might cite future-chapter beats in its answers.

8. **93 routes** (up from 37). New routes include `/api/admin/threads`, and the BeatTimeline and CanonDossierCard are now integrated into existing routes.

### Plans Ready to Execute
- `docs/nightshift/plans/FIXPLAN-FIX-032-beat-timeline-chapter-gating.md` — **P0 fix**: 3-line change, gating beats on journey pages (15 min)
- `docs/nightshift/plans/FIXPLAN-FIX-031-fiction-entity-story-gating.md` — Pass readerProgress to FictionEntityDetailPage (30 min)
- `docs/nightshift/plans/FIXPLAN-FIX-030-threads-route-keith-role.md` — 1-line fix in threads route (5 min)
- `docs/nightshift/plans/DEVPLAN-IDEA-025-rules-in-ask.md` — Add getRulesContext() to Ask (35 min)
- `docs/nightshift/plans/DEVPLAN-IDEA-029-reader-arc-progress.md` — Reader arc progress chip on journey pages (1.25 hrs, after FIX-032)

### Recommendations
- **If you have 15 min:** FIX-032 (P0, 15 min) alone. A reader at CH01 can currently see CH11 story content on the journey page. This is the app's only active P0. It is a 3-line change — add `getReaderProgress()` import, run both fetches in parallel, filter beats before passing to BeatTimeline.
- **If you have 1 hour:** FIX-032 (15 min) + FIX-031 (30 min) + FIX-030 (5 min). All three gating/auth issues cleared. After this: locked readers are fully gated on all entity pages, and the author can use the threads admin API.
- **If you have 2 hours:** The 1-hour batch above + IDEA-025 (35 min). After this: journey pages are gated, fiction entities are gated, author can manage threads, AND Ask answers about world rules (consent-threshold, directive-cn-24, etc.) are grounded in actual rule definitions.

---

## Run: 2026-04-22 (Run 9)

### Summary
- Scanned: 9 commits since Run 8 (e565702 → c678a6e): brain_lab rename, Phase 1 Celestial migration (brand + routes + gating), db namespace (cel_*), author role, reader show_all_content, 5 new migrations (025–029), persona registry + router + orchestrator, AI ledger + admin endpoint, chapter scenes ingest + reader page integration
- Issues found: 4 new (FIX-026 stale RLS keith role, FIX-027 ai-activity route, FIX-028 legacy keith UI copy, FIX-029 age mode UI exposed)
- Issues resolved: FIX-014 read badge confirmed shipped in StoriesPageClient; FIX-023/024/025 confirmed resolved (Run 8)
- Ideas: IDEA-014 marked shipped; IDEA-021/022 parked (memoir-specific); IDEA-023 advanced from exploring → planned (dev plan written); IDEA-024/025/026/027 seeded
- Plans written:
  - `FIXPLAN-FIX-026-stale-keith-role-rls.md`
  - `FIXPLAN-FIX-027-ai-activity-route-keith-role.md`
  - `DEVPLAN-IDEA-023-explore-hub-celestial.md`
- STATUS.md rewritten from scratch for Celestial context (was still describing Keith Cobb memoir app)
- BACKLOG.md reset for Celestial: all memoir-specific ideas parked, new Celestial ideas seeded

### Build & Lint & Test Results
- `npm run build`: **PASSES** — clean, 37 routes. 1 Turbopack NFT warning on `prompts.ts` filesystem reads (expected behavior, not an error).
- `npm run lint`: **PASSES** — 0 errors, 0 warnings.
- `npm test`: **96 PASS** — up from 41 in Run 8. New test files: `scene-parser.test.ts`, `ledger.test.ts`, `personas.test.ts`, `router.test.ts`, and others.

### Key Findings

1. **STATUS.md was completely stale — described the Keith Cobb memoir app, not Celestial.** The last 9 commits are a wholesale Phase 1 migration: renamed brain_lab, purged memoir content/assets, created cel_* DB namespace, introduced author role, reader progress gating, and 5 new tables. STATUS.md has been fully rewritten.

2. **FIX-026 (MEDIUM): Stale `role = 'keith'` in 4 migrations.** Migration 021 renamed the author role but migrations 025–028 were written after 021 and still check `role = 'keith'` in RLS policies. Author accounts cannot write to `cel_open_threads`, `cel_chapter_scenes`, or `cel_beats`. Fix: new migration 030 recreates affected policies with `role = 'author'`. Plan written.

3. **FIX-027 (MEDIUM): `/api/admin/ai-activity` also checks stale `'keith'` role.** Code-layer check on line 31: `["admin", "keith"].includes(profile.role)`. One-line fix; plan written.

4. **Major architecture additions (Phase C + D):** Persona registry (`personas.ts`) with 6 named personas; router (`router.ts`) mapping question depth to persona plans; multi-persona orchestrator (parallel sub-persona calls → synthesizer); AI call ledger (`ledger.ts`) recording tokens/cost/latency for every Anthropic call; chapter scene ingestion into `cel_chapter_scenes`; scene-aware AI context in `sharedContentBlock()`.

5. **Chapter gating is solid.** `getReaderProgress()` + `isStoryUnlocked()` applied correctly to: story library (silhouette cards), story detail page (hard lock + friendly error), mission logs (filtered list). Ask orchestrator filters `visibleStories` before building the story catalog and injects "Reader Progress Gate" rule into every persona system prompt. Re-reader mode (`show_all_content`) honored throughout.

6. **FIX-028 (LOW): Legacy "Keith" UI copy in 6+ files.** `AskAboutStory.tsx` says "Write to Keith"; `StoryContributionWorkspace.tsx` says "Share a memory about Keith"; `beyond/page.tsx` metadata says "Keith's dedicated space". These are Phase 1 copy cleanup gaps. No functional impact.

7. **FIX-029 (LOW-MEDIUM): Age mode system UI exposed for adult fiction.** `AgeModeSwitcher` visible in Nav, Header, and HomePageClient. `JourneyProgressBar`, `JourneyReflection`, `JourneyCompleteSummary` render age-aware copy branches including `young_reader` mode. Adult fiction only per Celestial spec. Flagged as legacy remnant.

8. **`content/voice.md` and `content/decision-frameworks.md` are stub placeholders.** Both files contain template text only. Every Ask persona prompt calls these via `getVoiceGuide()` / `getDecisionFrameworks()`. Voice guide quality is the single highest-impact improvement available. No code needed — author work only (IDEA-024).

9. **IDEA-014 confirmed SHIPPED.** `StoriesPageClient.tsx` line ~285: `{readSet.has(story.storyId) && <ReadBadgeAgeAware />}` — read badges render on unlocked story cards in the chapter library. Marked shipped.

10. **Review queue: 9 character files.** `brain_lab/out/review-queue.md` lists 9 characters with `reviewed: false`. These are AI-extracted stubs awaiting human editorial review before they can be considered stable wiki content.

### Plans Ready to Execute
- `docs/nightshift/plans/FIXPLAN-FIX-026-stale-keith-role-rls.md` — New migration 030 fixes 4 RLS policies across 4 tables (30 min + migration apply)
- `docs/nightshift/plans/FIXPLAN-FIX-027-ai-activity-route-keith-role.md` — 1-line fix in api/admin/ai-activity/route.ts (5 min)
- `docs/nightshift/plans/DEVPLAN-IDEA-023-explore-hub-celestial.md` — `/explore` page with 3-tab fiction entity hub (2.5 hours)

### Recommendations
- **If you have 10 min:** FIX-026 + FIX-027 together. Create `030_fix_author_role_in_rls.sql`, apply it, and change one line in `api/admin/ai-activity/route.ts`. Unblocks all author-level DB operations for open_threads, chapter_scenes, beats, and the AI activity dashboard.
- **If you have 1 hour:** The 10-min fixes above + fill in `content/voice.md` with actual Celestial narrative voice guidance. Zero code, maximum Ask quality improvement. The current stub makes every persona prompt inject template text.
- **If you have 2–3 hours:** FIX-026/027 (10 min) + voice guide content (30 min) + IDEA-023 Explore Hub Phase 1+2 (1.5 hrs). After this session: author writes are unblocked, Ask sounds like Celestial, and readers have a visual chapter map.

---

## Run: 2026-04-19 (Run 8)

### Summary
- Scanned: 5 new commits (9700ec4 → 0f8758f): copy updates, profile gallery, principles as first-class items, expanded principles matching, wiki mirror system; all new source files (principles/page.tsx, principles/[slug]/page.tsx, PrincipleFormationTimeline.tsx, StorySankey.tsx, ThemePrincipleMatrix.tsx, wiki-mirror.ts, corpus.ts, graph.ts expansion, StoriesPageClient.tsx, 3 new migrations), build + lint + tests
- Issues found: 3 new (FIX-023 wiki mirror atomicity, FIX-024 corpus cache doc, FIX-025 paragraph key) — all planned
- Issues resolved: FIX-019/020/021 (lint sweep, commit `1bf9147`), confirmed from last run plans
- Ideas: IDEA-018 + IDEA-019 marked shipped; IDEA-022 seeded → ready same night (principles in Ask); IDEA-023 seeded → exploring (Explore Hub); IDEA-015 + IDEA-002 parked (stale 3 days)
- Plans written:
  - `FIXPLAN-FIX-023-wiki-mirror-atomicity.md`
  - `FIXPLAN-FIX-024-corpus-cache-serverless.md`
  - `FIXPLAN-FIX-025-principle-detail-key.md`
  - `DEVPLAN-IDEA-022-principles-in-ask-keith.md`

### Build & Lint & Test Results
- `npm run build`: **PASSES** — clean, 54 routes (up from 44). New routes: `/principles`, `/principles/[slug]` and 8 new API routes.
- `npm run lint`: **PASSES** — 0 errors, 0 warnings. Clean since `1bf9147`.
- `npm test`: **41 PASS** — Node built-in test runner. New test files: `graph.test.ts` (10 tests), `parser.test.ts` (7 tests), `layout.test.ts` (2 tests). All pass on first run.

### Key Findings

1. **Principles as first-class items — major new feature.** Paul shipped 12 canonical principles with rich `aiNarrative` narratives, a `PrincipleFormationTimeline` SVG matrix, and `/principles` + `/principles/[slug]` routes. Each principle links to "Ask About This" — the `?prompt=` URL param added to the Ask page powers this. `StorySankey` and `ThemePrincipleMatrix` are now on the Themes page. The principles have full test coverage (graph.test.ts confirms all 12 canonical principles, era ordering, etc.).

2. **Wiki mirror system ships.** `wiki-mirror.ts` + `corpus.ts` + migration 020. When Keith publishes a Beyond story, it compiles into `sb_wiki_documents` (versioned, with derived theme/timeline/index docs). Ask Keith's orchestrator now calls `getCanonicalWikiSummaries()` from the corpus — Beyond stories are immediately searchable by Ask after publish. This closes the long-standing gap where family-contributed stories were invisible to the AI.

3. **IDEA-018 (Ask from passage) + IDEA-019 (people bios in Ask) SHIPPED.** The highlights page has "Ask about this passage →" links (migration 018 adds `passage_ask_conversation_id`). People biographical context is in the Ask system prompt. Both IDEA-018 and IDEA-019 are now confirmed shipped.

4. **Tests added (41 passing).** `npm test` uses Node's built-in test runner with `tsx`. Tests cover graph layout, parser principles, polish helpers, and profile reflection logic. This is a meaningful addition for a codebase that has grown significantly. **Important:** run `npm test`, not `npx jest` — there is no Jest config.

5. **FIX-023 (LOW-MEDIUM): Wiki mirror publish is non-atomic.** `publishStoryToWikiMirror` supersedes the old doc before inserting the new one (required by unique partial index). If the insert fails, there's a brief window with no active doc — the story goes dark. Recovery block (re-activate superseded doc on insert failure) would fix this. Low probability in practice but high impact when it happens.

6. **FIX-024 (VERY LOW): `invalidateWikiCorpusCache()` is misleading in serverless.** Module-level cache invalidation only affects the calling Lambda instance. Other instances serve stale data until the 30s TTL expires naturally. Documentation-only fix needed.

7. **FIX-025 (VERY LOW): Paragraph text as React key.** `principles/[slug]/page.tsx:46` uses aiNarrative paragraph text as key. One-line fix to use index instead.

8. **IDEA-022 identified and planned.** The 12 canonical principles exist in the parser but are NOT in the Ask system prompt. Adding `getPrinciplesContext()` (analogous to `getPeopleContext()`) would directly improve answers about values, leadership, and life lessons. 30-minute pure prompt enhancement. Highest-value quick win currently available.

### Plans Ready to Execute
- `docs/nightshift/plans/DEVPLAN-IDEA-022-principles-in-ask-keith.md` — Add principles context to Ask Keith system prompt (30 min)
- `docs/nightshift/plans/FIXPLAN-FIX-025-principle-detail-key.md` — One-line key fix (1 min)
- `docs/nightshift/plans/FIXPLAN-FIX-023-wiki-mirror-atomicity.md` — Recovery block on wiki publish failure (15 min)
- `docs/nightshift/plans/FIXPLAN-FIX-024-corpus-cache-serverless.md` — Documentation comment only (5 min)
- `docs/nightshift/plans/DEVPLAN-IDEA-014-story-read-progress-ui.md` — Story card read badges, Phase 2 (~45 min, still outstanding)

### Recommendations
- **If you have 30 min:** IDEA-022 alone (principles in Ask Keith). The principles page shipped tonight but Ask doesn't know about them yet. After this, asking "What did Keith believe about leadership?" returns a named principle. Zero risk, pure quality improvement.
- **If you have 1 hour:** IDEA-022 (30 min) + FIX-025 + FIX-023 + FIX-024 in a single commit (20 min) + `npm test` to verify (2 min). Principles in Ask, wiki publish is safer, docs are accurate. Clean sweep of all new Run 8 findings.
- **If you have 2 hours:** The 1-hour batch above + IDEA-014 (story card read badges, Phase 2 only, ~45 min). After this session: Ask knows all 12 principles by name, publish failures are recoverable, and family members can see read badges on story cards in the library.

---

## Run: 2026-04-18 (Run 7)

### Summary
- Scanned: 9 commits since Run 6 (4fa9d60 through 43cfb4b), all new source files (PhotoFrameOverlay, TipTapEditor, BeyondEditMode, BeyondDraftEditor, BeyondPeopleMode, BeyondModeTabs, MediaGallery, MentionSuggestion, PersonLink, PersonEditDrawer, PersonMediaPanel, StoryAudioControls + ElevenLabs lib, CorrectionActions, people routes, media routes, audio routes), 5 new migrations (013_story_corrections through 017_media), 58 new wiki people pages, build + lint
- Issues found: 2 new (FIX-021 — 4 lint errors, FIX-022 — dual 013 migration prefix) — both planned
- Issues resolved: 0 this run (all prior open issues unchanged)
- Ideas: IDEA-017 marked shipped; IDEA-012 parked (3-day stale); IDEA-019 seeded and advanced to `planned` same night; IDEA-021 seeded (reading milestone celebration)
- Plans written:
  - `FIXPLAN-FIX-021-beyond-lint-errors.md`
  - `FIXPLAN-FIX-022-dual-013-migration.md`
  - `DEVPLAN-IDEA-019-people-in-ask-keith.md`

### Build & Lint Results
- `npm run build`: **PASSES** — clean, 44 routes. New routes: `/people`, `/people/[slug]`, `/profile/admin`, `/admin/media`, plus audio/corrections/media/people API routes.
- `npm run lint`: **4 errors, 3 warnings** — regression from Run 6 (0 errors, 3 warnings). Errors: `prefer-const` in `compile-wiki.ts:564` + `react-hooks/set-state-in-effect` in `MediaGallery.tsx:269` + `MentionSuggestion.tsx:33` + `react-hooks/immutability` in `TipTapEditor.tsx:185`. All fixable in 2 minutes per FIXPLAN-FIX-021. Warnings: FIX-019 + FIX-020 (unchanged).

### Key Findings

1. **9 commits — massive Beyond + People + Audio feature wave.** Paul shipped: photo frame mode (IDEA-017), ElevenLabs server-side TTS with Supabase Storage caching, Beyond Edit Mode with TipTap WYSIWYG editor, people inventory as first-class entities with wiki pages + DB, media attachment system, story corrections, and Beyond mode tabs. The app has expanded from 38 to 44 routes.

2. **IDEA-017 (Photo Frame) SHIPPED** — `PhotoFrameOverlay.tsx` confirmed in `be2d3fd`. Full Fullscreen API, crossfade, preload, pause-on-tap. Exactly as designed.

3. **People Inventory is a major new feature.** 58 people pages compiled from `content/raw/people_inventory.json` into `content/wiki/people/`. Full biographical write-ups for Tier A subjects (Bayne Cobb, Frances Cobb, etc.) via `<!-- ai-draft -->` blocks. `/people` directory + `/people/[slug]` detail with Keith-editable drawer and media panel. `sb_people` (DB) + `sb_story_people` (link table) + `PersonLink` for @mention chips. This is the most substantial structural addition since stories themselves.

4. **Beyond is now a full authoring workspace.** Three mode tabs: QA (existing), Edit (new TipTap editor), People (new). `sb_story_drafts.session_id` is now nullable — Keith can write directly without a chat session. `origin = 'write' | 'edit'` distinguishes new drafts from story revisions. Warning gate prevents accidental overwrites of published chapters. TipTap @mention autocomplete links people via `/api/people` search.

5. **ElevenLabs TTS fully implemented.** Migration 014 creates `sb_story_audio` ledger + `story-audio` public Storage bucket. `StoryAudioControls` now defaults to `mode="elevenlabs"` and falls back to Web Speech API. Rate limited at 5/15min to bound API spend. Requires `ELEVENLABS_API_KEY` + `ELEVENLABS_VOICE_ID` in env.

6. **FIX-021 (MEDIUM): 4 new lint errors** in Beyond components. All are correct-behavior code that simply needs a `const` fix or targeted eslint-disable comment. Should be fixed ASAP to restore clean lint output. Group with FIX-019/020 for a complete 5-minute lint sweep.

7. **FIX-022 (LOW): Dual `013_` migration prefix.** Two migrations start with `013_`: `013_onboarding_flags.sql` and `013_story_corrections.sql`. Alphabetical ordering means they apply consistently (`onboarding_flags` before `story_corrections`) and Supabase tracks by full filename. Low risk but confusing. Fix: add a comment in `013_story_corrections.sql` noting the naming situation. New migrations should start at `018_`.

8. **IDEA-019 seeded and planned.** The Ask Keith system prompt includes the wiki index (which lists people names) but NOT the detailed biographical content from `content/wiki/people/`. Confirmed: `content/wiki/people/bayne-cobb.md` has a 300-word bio with notable moments and a representative quote. Adding `getPeopleContext()` to `prompts.ts` would directly improve AI response quality for the most emotionally resonant family questions. Estimated 1 hour. Dev plan written.

9. **Interview stories (IV_S01–IV_S10) are in the wiki and surfaced.** Stories page has an "Interview" filter. Wiki index updated to show "49 stories (39 memoir + 10 interview)". Timeline expanded to 43 events. Static data confirms interview story integration.

### Plans Ready to Execute
- `docs/nightshift/plans/FIXPLAN-FIX-021-beyond-lint-errors.md` — 4 eslint fixes (2 min)
- `docs/nightshift/plans/FIXPLAN-FIX-019-classifier-lint.md` + `FIXPLAN-FIX-020-storymarkdown-img-warnings.md` — 3 more lint comments (2 min) — do all 3 plans together in one commit for a full lint sweep
- `docs/nightshift/plans/DEVPLAN-IDEA-019-people-in-ask-keith.md` — people bio context in Ask system prompt (1 hr)
- `docs/nightshift/plans/DEVPLAN-IDEA-018-ask-from-passage.md` — "Ask Keith about this" from highlights (1 hr)
- `docs/nightshift/plans/DEVPLAN-IDEA-014-story-read-progress-ui.md` — story card read badges, Phase 2 only (~45 min)

### Recommendations
- **If you have 5 min:** FIX-021 + FIX-019 + FIX-020 together (7 total eslint fixes across 4 files) — restores completely clean lint output. Group as one commit: "fix: clear all ESLint warnings and errors".
- **If you have 1 hour:** IDEA-019 alone (people bio context in Ask Keith). Highest AI quality improvement available. People pages are shipped, wiki bios exist, system prompt just needs one new loader function. Before/after test: ask "Who was Bayne Cobb?" — the improvement will be immediately obvious.
- **If you have 2 hours:** Lint sweep (5 min) + IDEA-019 (1 hr) + IDEA-018 (1 hr). After this session: lint clean, Ask knows who people are, highlights connect to live conversations. Three quality improvements that build on each other.

---

## Run: 2026-04-17 (Run 6)

### Summary
- Scanned: 3 new commits (c7ebef7, d8af9cc, 5dd3116), all new source files (StoryMarkdown.tsx, StoryBodyWithHighlighting.tsx, FavoriteButton.tsx, ProfileReadingDashboard.tsx, OnboardingStepper.tsx + demos, profile/favorites, profile/highlights, welcome, onboarding API, highlights API, favorites API, proxy.ts onboarding gate), 3 new migrations (011–013)
- Issues found: 1 new (FIX-020 `<img>` warnings in StoryMarkdown.tsx) — planned
- Issues resolved: FIX-018 (KeithProfileHero + classifier committed in c7ebef7)
- Ideas: IDEA-004, IDEA-011, IDEA-016 shipped; IDEA-013 fully shipped; IDEA-014 partially shipped (profile dashboard done, story card badges remain); IDEA-008 + IDEA-010 parked (3-day stale); IDEA-017 + IDEA-018 seeded and advanced to `ready` same night
- Plans written:
  - `FIXPLAN-FIX-020-storymarkdown-img-warnings.md`
  - `DEVPLAN-IDEA-017-photo-gallery.md`
  - `DEVPLAN-IDEA-018-ask-from-passage.md`

### Build & Lint Results
- `npm run build`: **PASSES** — clean, 38+ routes. New routes: `/profile/favorites`, `/profile/highlights`, `/welcome`, plus 6 new API routes.
- `npm run lint`: **3 warnings** — `_history` in `classifier.ts:43` (FIX-019, existing) + 2 `@next/next/no-img-element` in `StoryMarkdown.tsx:34,100` (FIX-020, new). No errors.

### Key Findings

1. **Massive shipment since Run 5 — 3 commits, 100+ files.** Three features fully landed: story favorites (IDEA-004), passage highlights (IDEA-016), and original book photos with lightbox (IDEA-011). Also: `ProfileReadingDashboard.tsx` for user reading stats, and a complete welcome/onboarding tour for new family members.

2. **IDEA-004 (Favorites) SHIPPED** — `FavoriteButton.tsx` with optimistic toggle, `sb_story_favorites` (migration 011), `/profile/favorites` grid, ProfileHero link. Clean implementation.

3. **IDEA-016 (Highlights) SHIPPED** — `StoryBodyWithHighlighting.tsx` uses the `selectionchange` DOM event to position a floating save button above the selection, within the story body container. `sb_story_highlights` (migration 012), `/profile/highlights` reading-journal view, `DeleteHighlightButton.tsx`. Rate limited at 30/min.

4. **IDEA-011 (Story Photos) SHIPPED** — Paul extracted 35 original memoir photos and created `StoryMarkdown.tsx` with a full lightbox (Escape to close, Fit to Screen / Actual Size / Open Original controls). 17 story wiki files updated with inline `![...]` image refs. Not just inline images — these are high-quality scanned photos from the physical book.

5. **Welcome/Onboarding flow SHIPPED** — `/welcome` with `OnboardingStepper.tsx` (4 steps, age-aware). New users are automatically redirected to `/welcome` by an onboarding gate in `proxy.ts` (cookie fast-path via `sb_onboarded` cookie, DB fallback via `has_onboarded` column). Existing users pre-seeded as `has_onboarded=true` in migration 013. Replay link in ProfileHero. This is a thoughtful, complete onboarding implementation.

6. **FIX-018 RESOLVED** — `KeithProfileHero.tsx` and `classifier.ts` changes committed in `c7ebef7`. Working tree is clean.

7. **FIX-020 (VERY LOW): New lint regression in StoryMarkdown.tsx.** 2 new `@next/next/no-img-element` warnings at lines 34 and 100. Raw `<img>` is intentional here (dynamic sources from markdown, unknown dimensions). Fix: 2 targeted eslint-disable-next-line comments. Should be paired with FIX-019 (1 comment) for a clean lint sweep.

8. **IDEA-017 + IDEA-018 seeded and ready.** The photo gallery is a natural next step now that 35 images are in place — a dedicated browsing experience without requiring reading specific stories. Ask from passage is the highest-value quick win — transforms the highlights page from a static archive into an active conversation launcher.

### Plans Ready to Execute
- `docs/nightshift/plans/FIXPLAN-FIX-019-classifier-lint.md` + `FIXPLAN-FIX-020-storymarkdown-img-warnings.md` — 3 total lint comments across 2 files; do together (5 min)
- `docs/nightshift/plans/DEVPLAN-IDEA-018-ask-from-passage.md` — "Ask Keith about this" from highlights (1 hr)
- `docs/nightshift/plans/DEVPLAN-IDEA-014-story-read-progress-ui.md` — story card read badges, Phase 2 only (~45 min)
- `docs/nightshift/plans/DEVPLAN-IDEA-017-photo-gallery.md` — original photos gallery at `/gallery` (2–2.5 hrs)

### Recommendations
- **If you have 10 min:** FIX-019 + FIX-020 together (3 eslint comments across 2 files) — clears all 3 lint warnings and restores clean lint output.
- **If you have 1 hour:** IDEA-018 alone (Ask from passage). Both dependencies are shipped (highlights + Ask). Immediate family value — especially meaningful for grandchildren who save a quote and want to talk about it.
- **If you have 2 hours:** IDEA-018 (1 hr) + IDEA-014 Phase 2 story card badges (~45 min) + FIX-019/020 lint sweep (5 min). After this session: lint is clean, passages connect to conversation, story cards show read history.

---

## Run: 2026-04-16 (Run 5 — addendum, Paul request)

### Summary
- Paul requested two new features: bookmark a story as a favorite + highlight a paragraph to save
- IDEA-004 unparked and advanced to `ready` (was parked 2026-04-15)
- IDEA-016 seeded and advanced to `ready` in one session
- Plans written:
  - `DEVPLAN-IDEA-004-story-favorites.md` — heart icon, `/profile/favorites`, migration 011
  - `DEVPLAN-IDEA-016-passage-highlights.md` — text selection, floating save button, `/profile/highlights`, migration 012

### Plans Ready to Execute
- `docs/nightshift/plans/DEVPLAN-IDEA-004-story-favorites.md` — Favorite stories (1.5–2 hrs)
- `docs/nightshift/plans/DEVPLAN-IDEA-016-passage-highlights.md` — Save passages (2–2.5 hrs)

### Recommended order
1. **IDEA-004 first** (favorites) — simpler, no complex DOM event handling. Introduces the profile subpage pattern (`/profile/favorites`) that IDEA-016 reuses.
2. **IDEA-016 second** (highlights) — builds on the profile page pattern, then adds the text-selection client component on story pages.

---

## Run: 2026-04-16 (Run 5)

### Summary
- Scanned: 20 commits since Run 4, all new route files (beyond, profile/questions, api/beyond/*, api/stories/*/questions, api/notifications/count), components (StoryAudioControls, ReadTracker, AnsweredQuestionsList, AskAboutStory, KeithProfileHero, KeithDashboard, ProfileNavLink), AI orchestration layer (orchestrator.ts, classifier.ts, perspectives.ts), 10 migrations, build + lint
- Issues found: 2 new (FIX-018, FIX-019) — both planned
- Issues resolved: 0 this run (FIX-013–015 all resolved in prior session)
- Ideas: 2 new `ready` (IDEA-014, IDEA-015), 2 shipped (IDEA-009, IDEA-013 infra), 2 parked (IDEA-005, IDEA-006 — 3-day stale)
- Plans written:
  - `FIXPLAN-FIX-018-uncommitted-changes.md`
  - `FIXPLAN-FIX-019-classifier-lint.md`
  - `DEVPLAN-IDEA-014-story-read-progress-ui.md`
  - `DEVPLAN-IDEA-015-deep-ask-activation.md`

### Build & Lint Results
- `npm run build`: **PASSES** — clean, 34 routes (up from 26 last run). New routes: `/beyond`, `/profile/questions`, `/journeys/[slug]/narrated`, `/stories/timeline`, and 8 new API routes.
- `npm run lint`: **1 warning** — `_history` unused in `classifier.ts:43`. No errors. (lint was previously clean — this is a regression tracked as FIX-019)

### Key Findings

1. **Massive feature wave since Run 4 (20 commits).** The app has grown substantially. Major additions: Beyond workspace (Keith's private story studio), reader Q&A system (ask-about-story → Keith triage → answer → public display), multi-perspective Ask orchestrator (3-call deep path, feature-flagged), story audio TTS (Web Speech API), story read tracking infrastructure, hub navigation, profile notifications.

2. **IDEA-009 (Story Voice Playback) SHIPPED** — `StoryAudioControls.tsx` is fully built with Web Speech API. Play/Pause/Stop, estimated listen time, aria-live status, SSR-safe. No server cost. Paul implemented without a dev plan — marking shipped.

3. **IDEA-013 (Story Reading Progress) — infra SHIPPED, UI still needed.** `sb_story_reads` table, `ReadTracker` component (fires silently on story visit), `/api/stories/[storyId]/read` endpoint, and Keith's analytics dashboard are all live. The user-facing UI (progress bar on profile, read badges on story cards) is NOT yet built. Created IDEA-014 as the UI completion task.

4. **Beyond workspace is comprehensive.** Keith has a dedicated `/beyond` page (keith role-gated) that reuses `StoryContributionWorkspace` with `contributionMode="beyond"`. The workspace shows pending reader questions in a triage strip — Keith can quick-answer (text, public/private), seed a full Beyond session, or dismiss. Session → draft → publish pipeline works identically to Tell. This closes the reader feedback loop elegantly.

5. **Multi-perspective Ask orchestrator built but not yet active in prod.** `orchestrator.ts` + `classifier.ts` + `perspectives.ts` are all confirmed in the codebase. The classifier was just inverted (defaults to "deep" for all non-factual questions). Activation requires setting `ENABLE_DEEP_ASK=true` in Vercel env. The quality improvement for reflective questions is significant. Created IDEA-015 as the activation plan.

6. **FIX-018 (MEDIUM): Two uncommitted working-tree changes.** `KeithProfileHero.tsx` (2 quick links removed, grid simplified) and `classifier.ts` (logic inversion) are both modified but not committed. A `git add + commit` resolves this in under 5 minutes. Risk: Vercel deploy from a fresh clone would lose both.

7. **FIX-019 (VERY LOW): Lint warning regression.** `classifier.ts` `_history` parameter causes `@typescript-eslint/no-unused-vars` warning. Lint was clean after FIX-012; this is a 1-line eslint-disable comment away from clean again.

8. **IDEA-005 + IDEA-006 parked** — Reading time estimate (IDEA-005, seeded 2026-04-13) and Featured Story of the Week (IDEA-006, seeded 2026-04-13) both 3 days without action. Parked per stale rule.

### Plans Ready to Execute
- `docs/nightshift/plans/FIXPLAN-FIX-018-uncommitted-changes.md` — Commit KeithProfileHero + classifier (5 min, prevents silent deploy loss)
- `docs/nightshift/plans/FIXPLAN-FIX-019-classifier-lint.md` — Fix _history lint warning (1 min, pairs with FIX-018)
- `docs/nightshift/plans/DEVPLAN-IDEA-014-story-read-progress-ui.md` — Profile progress bar + story card read badges (1–1.5 hrs)
- `docs/nightshift/plans/DEVPLAN-IDEA-015-deep-ask-activation.md` — Enable deep Ask in production (30 min eval + env var set)

### Recommendations
- **If you have 10 min:** FIX-018 (commit working tree, 5 min) + FIX-019 (lint disable comment, 1 min) back-to-back. Two lines of work that eliminate all medium/low deployment risk.
- **If you have 2 hours:** The 10-min batch above + IDEA-015 (review perspective prompts, test locally, enable `ENABLE_DEEP_ASK=true` in Vercel) + IDEA-014 (profile progress bar). After this session: the app is fully clean and the Ask feature has meaningful qualitative depth for reflective questions.
- **If you want the biggest visual win:** IDEA-014 alone (1–1.5 hrs). Family members immediately see their reading progress on their profile and know which story cards they've already visited. Closes the loop on the read tracking already silently in production.

---

## Run: 2026-04-15 (Run 4)

### Summary
- Scanned: tell/page.tsx, api/tell/draft/update, ask/page.tsx, signup/page.tsx, app-url.ts, middleware.ts, admin/drafts, api/ask, ai/prompts.ts, ai/tell-prompts.ts, home page, git history (3 post-nightshift commits)
- Issues found: 3 new (FIX-013 already had plan, FIX-014, FIX-015 new) — all `planned`
- Issues resolved: FIX-008–012 confirmed resolved (commit 2c00b5d, verified in code)
- Ideas: 2 parked (IDEA-003, IDEA-004 — 3-day stale), 2 new (IDEA-012 seed, IDEA-013 seed → planned)
- Plans written:
  - `FIXPLAN-FIX-014-tell-double-submit.md`
  - `FIXPLAN-FIX-015-submit-draft-no-guard.md`
  - `DEVPLAN-IDEA-013-story-reading-progress.md`

### Build & Lint Results
- `npm run build`: **PASSES** — clean, no warnings. 26 routes (added `/api/tell/draft/update`). Turbopack build in 4.3s.
- `npm run lint`: **PASSES** — 0 warnings, 0 errors. FIX-012 confirmed resolved.

### Key Findings

1. **FIX-008–012 all resolved in one session** (commit `2c00b5d`) — Paul shipped all 5 planned fixes same day they were written. Tell draft persistence, rate limiting, wiki cache, dead params, and lint warning all resolved. The nightshift-to-execution cycle is working.

2. **Major content update (commit `4b209d3`)** — All 39 story wiki files were substantially rewritten/improved. 14 new timeline photos added to `public/timeline/`. Ask page received significant improvements (sendInFlightRef double-submit guard, useCallback, SSE text batching for React Strict Mode safety, journey-aware context, markdown hyperlinks to story pages).

3. **FIX-013 (MEDIUM): Auth redirect changes uncommitted** — Four files in the working tree fix Vercel auth redirect URLs via a new `getAuthRedirectOrigin()` utility (`src/lib/app-url.ts`). A plan file was written manually but not committed. A fresh clone or Vercel deployment would silently lose this fix. The `NEXT_PUBLIC_SITE_URL` env var isn't yet in the example file either. A 5-minute commit resolves this.

4. **FIX-014 (LOW): Tell page missing sendInFlightRef** — Paul's ask/page.tsx commit added `sendInFlightRef` to prevent double-submit race conditions. The fix was not ported to `tell/page.tsx`, which still uses the weaker `loading` state guard. 5-minute port.

5. **FIX-015 (LOW): submitDraft() has no submitting guard** — "Submit Story" button has no `disabled` prop or in-progress state. Double-click fires two PATCH requests. No data loss risk, but adds `submitting` state for UX quality. 10-minute fix.

6. **IDEA-003 + IDEA-004 parked** — Age-aware chips (IDEA-003) and bookmarks (IDEA-004) both 3+ days with no related commits. Parked per stale rule. IDEA-003's plan remains valid for a 20-minute pickup if prioritized.

7. **IDEA-013 (Reading Progress) advanced to `planned` same night** — Clear technical path: Supabase migration 004 (`sb_story_reads`), `ReadTracker` client component on story pages, read badges in library, progress bar on profile. Estimated 1.5 hours. No dependencies.

### Plans Ready to Execute
- `docs/nightshift/plans/FIXPLAN-FIX-013-uncommitted-signup-changes.md` — Commit the auth redirect changes (5 min, prevents silent loss)
- `docs/nightshift/plans/DEVPLAN-IDEA-007-resume-tell-session.md` — Resume in-progress Tell sessions (1.5-2 hrs)
- `docs/nightshift/plans/DEVPLAN-IDEA-013-story-reading-progress.md` — Story reading progress tracking (1.5 hrs, needs migration 004)
- `docs/nightshift/plans/FIXPLAN-FIX-014-tell-double-submit.md` — Port sendInFlightRef to Tell (5 min)
- `docs/nightshift/plans/FIXPLAN-FIX-015-submit-draft-no-guard.md` — submitDraft in-progress guard (10 min)

### Recommendations
- **If you have 15 min:** FIX-013 (commit auth changes, 5 min) + FIX-014 + FIX-015 back-to-back. Three clean fixes that close all open issues.
- **If you have 2 hours:** The 15-min batch above, then IDEA-007 (Resume Tell session, 1.5 hrs). After this: Tell pipeline is fully polished and zero open bugs remain.
- **If you have a full session:** Everything above + IDEA-013 (Reading Progress, 1.5 hrs). The app gains tracking infrastructure and the family sees their journey through the archive.

---

## Run: 2026-04-14 (Run 3)

### Summary
- Scanned: new `/tell` feature (tell/page.tsx, /api/tell, /api/tell/draft), /admin/drafts, supabase-stories.ts, migration 003, journeys routes, ask/page.tsx updates, build + lint
- Issues found: 5 new (FIX-008 through FIX-012) — all `found` → `planned` same night
- Issues resolved: 0 this run (7 total already resolved from prior runs)
- Ideas: IDEA-001 marked `shipped`, IDEA-002 advanced to `planned`, 2 new seeds (IDEA-007, IDEA-008), IDEA-007 immediately advanced to `ready`
- Plans written:
  - `FIXPLAN-FIX-008-submit-draft-ignores-edits.md`
  - `FIXPLAN-FIX-009-tell-draft-rate-limiting.md`
  - `FIXPLAN-FIX-010-tell-prompts-wiki-cache.md`
  - `FIXPLAN-FIX-011-dead-generatestaticparams-journeys.md`
  - `FIXPLAN-FIX-012-unused-node-lint-warning.md`
  - `DEVPLAN-IDEA-007-resume-tell-session.md`

### Build & Lint Results
- `npm run build`: **PASSES** — clean, no warnings. All 25 routes render as ƒ (Dynamic). New routes: `/tell`, `/admin/drafts`, `/api/tell`, `/api/tell/draft`.
- `npm run lint`: **1 warning** (not an error) — `_node` unused in `ask/page.tsx:10`. No errors.

### Key Findings

1. **IDEA-001 (Guided Journeys) SHIPPED** — Paul implemented the full journeys feature as part of the `3d56213` + `85356d4` commits. Four journeys live at `/journeys`. Routes include intro, step-by-step reader with reflection prompts, journey connectors, and completion page. Progress tracked via localStorage. This was the P1 backlog item.

2. **IDEA-002 (Story Workshop) Track 1 SHIPPED as `/tell`** — The `cad049d` commit implements a full story contribution pipeline: AI interviewer chat → draft composition → admin review → publish. Family members can tell stories at `/tell`; Paul reviews and publishes at `/admin/drafts`. Story IDs generalized to `P{n}_S{nn}` for multi-volume support.

3. **FIX-008 (HIGH): submitDraft ignores user edits** — `tell/page.tsx` `submitDraft()` just sets `submitted: true` without persisting `editTitle`/`editBody` back to Supabase. Users can edit the AI-composed draft but those edits are silently lost. A PATCH endpoint + 5-line change in `submitDraft()` fixes this.

4. **FIX-009 (MEDIUM): /api/tell/draft has no rate limit** — This is the most expensive Claude call in the app (4096 tokens). Unlike `/api/tell` (20/min) and `/api/ask` (20/min), the draft endpoint is unguarded. Also: on parse error, returns `{ raw: rawText }` leaking Claude's response.

5. **FIX-010: getWikiSummaries() reads disk on every /api/tell call** — `parser.ts` exports an uncached `getWikiSummaries()`. `tell-prompts.ts` calls it on every chat turn. The Ask system already caches this. One-line fix in `tell-prompts.ts`.

6. **FIX-011: Dead generateStaticParams reintroduced in journeys** — Same issue as FIX-006 (resolved for stories/themes) but the journey routes export it again. Both `journeys/[slug]/page.tsx` and `journeys/[slug]/[step]/page.tsx` affected. Dead code, 5-min cleanup.

7. **Ask page significantly improved** — `ask/page.tsx` now has: `sendInFlightRef` for double-submit prevention, `useCallback` memoization, `journeySlug` awareness in prompt, batch SSE text accumulation (immutable updater for React Strict Mode), and markdown hyperlinks to story pages.

### Plans Ready to Execute
- `docs/nightshift/plans/FIXPLAN-FIX-008-submit-draft-ignores-edits.md` — Save user edits on Tell draft submission (30 min, HIGH priority)
- `docs/nightshift/plans/FIXPLAN-FIX-009-tell-draft-rate-limiting.md` — Rate limit /api/tell/draft, remove raw leak (15 min)
- `docs/nightshift/plans/DEVPLAN-IDEA-003-age-aware-suggestion-chips.md` — Age-aware chips in Ask (20 min, no deps)
- `docs/nightshift/plans/DEVPLAN-IDEA-007-resume-tell-session.md` — Resume in-progress Tell sessions (1.5-2 hrs)
- `docs/nightshift/plans/FIXPLAN-FIX-010-tell-prompts-wiki-cache.md` — Cache wiki summaries in tell-prompts (10 min)
- `docs/nightshift/plans/FIXPLAN-FIX-011-dead-generatestaticparams-journeys.md` — Remove dead params from journeys (5 min)

### Recommendations
- **If you have 30 min:** FIX-008 + FIX-009 back-to-back. FIX-008 prevents data loss (user edits disappear), FIX-009 is a financial safety fix. Both are small, targeted changes.
- **If you have 2 hours:** The 30-min batch above, then IDEA-003 (age chips, 20 min) and IDEA-007 (resume Tell session, 1.5 hrs). After this batch: the Tell pipeline is production-quality and the Ask experience is fully age-aware.

---

## Run: 2026-04-13 (Run 2)

### Summary
- Scanned: all routes, hooks, API handlers, AI prompts, build output, lint results
- Issues found: 2 new (`found` → `planned` same night), 5 existing (all still open, no code commits since Run 1), 0 resolved
- Ideas: 2 new seeds (IDEA-005, IDEA-006), 1 promoted (IDEA-003: seed → ready), all others holding
- Plans written:
  - `FIXPLAN-FIX-006-dead-generatestaticparams.md`
  - `FIXPLAN-FIX-007-sse-chunk-fragility.md`
  - `DEVPLAN-IDEA-003-age-aware-suggestion-chips.md`

### Build & Lint Results
- `npm run build`: **PASSES** — 1 deprecation warning (FIX-001 still open: middleware → proxy). All routes Dynamic (ƒ). Build took ~17 min.
- `npm run lint`: **FAILS** — same 2 errors, 3 warnings in `scripts/compile-wiki.ts` (FIX-002 still open). No new lint errors.

### Key Findings
1. **No code changes since Run 1** — All 5 fixes from last night are still open. Paul hasn't had a session yet. Plans are queued and ready.
2. **SSE stream parsing fragility** (FIX-007, new) — `ask/page.tsx` splits stream chunks on `\n` without buffering. TCP packet boundaries can split SSE lines, causing `JSON.parse()` to throw and killing the stream mid-response. Fix: accumulate a buffer across chunks, parse only complete lines, per-line try/catch. Plan written.
3. **Dead `generateStaticParams`** (FIX-006, new) — Story/theme detail pages define `generateStaticParams` but render dynamically due to the auth layout reading cookies. The exports are dead code. Low severity — app works correctly — but they add noise and a few extra seconds to the build. Plan written (5-min fix).
4. **Suggestion chips confirmed hardcoded** — Verified in `ask/page.tsx` lines 143-148. The `useAgeMode()` hook IS imported, `ageMode` IS available. The fix is exactly as IDEA-003 described. Advanced to `ready`, dev plan written (20-min change).
5. **AI prompt is solid** — `buildSystemPrompt` in `src/lib/ai/prompts.ts` is well-constructed. Voice guide, wiki index, story context, and age mode instructions are all assembled cleanly. File caching (`cachedWikiSummaries`, `cachedVoiceGuide`) prevents repeated disk reads. No issues.

### Plans Ready to Execute
- `docs/nightshift/plans/FIXPLAN-FIX-001-middleware-to-proxy.md` — Rename middleware.ts → proxy.ts (5 min)
- `docs/nightshift/plans/FIXPLAN-FIX-003-story-fulltext-markdown.md` — Use ReactMarkdown for story text (10 min)
- `docs/nightshift/plans/DEVPLAN-IDEA-003-age-aware-suggestion-chips.md` — Age-aware suggestion chips in Ask (20 min, no deps)
- `docs/nightshift/plans/FIXPLAN-FIX-007-sse-chunk-fragility.md` — Robust SSE stream parsing (30 min)
- `docs/nightshift/plans/FIXPLAN-FIX-004-ask-api-rate-limiting.md` — Per-user rate limiting on /api/ask (30 min)
- `docs/nightshift/plans/DEVPLAN-IDEA-001-guided-journeys.md` — Full Guided Journeys feature (4–6 hours, do FIX-003 first)

### Recommendations
- **If you have 30 min:** FIX-001 + FIX-003 + IDEA-003 — eliminate the build warning, fix markdown rendering, and make suggestion chips age-aware. Three separate plan files, all self-contained, can be done back-to-back.
- **If you have 2 hours:** The 30-min batch above, then FIX-007 (SSE buffering) and FIX-004 (rate limiting). Clears the medium-severity backlog entirely.

---

## Run: 2026-04-12 (Run 1 — First Full Scan)

### Summary
- Scanned: all 31 source files (routes, components, hooks, lib, scripts, migration, wiki content)
- Issues found: 5 new (`found` → `planned` same night), 0 existing, 0 resolved
- Ideas: 2 new seeds (IDEA-003, IDEA-004), 1 promoted (IDEA-001: seed → ready), 1 advanced (IDEA-002: seed → exploring)
- Plans written:
  - `FIXPLAN-FIX-001-middleware-to-proxy.md`
  - `FIXPLAN-FIX-002-compile-wiki-lint-errors.md`
  - `FIXPLAN-FIX-003-story-fulltext-markdown.md`
  - `FIXPLAN-FIX-004-ask-api-rate-limiting.md`
  - `FIXPLAN-FIX-005-orphaned-user-messages.md`
  - `DEVPLAN-IDEA-001-guided-journeys.md`

### Build & Lint Results
- `npm run build`: **PASSES** — 1 deprecation warning (FIX-001: middleware → proxy)
- `npm run lint`: **FAILS** — 2 errors, 3 warnings in `scripts/compile-wiki.ts` (FIX-002)
- All routes render as Dynamic (ƒ) — correct for auth-dependent app

### Key Findings
1. **Next.js 16 middleware deprecation** — `src/middleware.ts` needs to become `src/proxy.ts`. The build warns on every run. Easy 5-minute fix.
2. **Story full text missing markdown rendering** — `stories/[storyId]/page.tsx` splits text on newlines manually instead of using `ReactMarkdown`. The package is already installed and used in Ask. Quick fix with visible UX benefit.
3. **No rate limiting on /api/ask** — Any authenticated user can fire unlimited Claude API calls. In-memory sliding window limiter would cost <30min and prevent surprise bills.
4. **RLS is solid** — All three tables have proper policies. No auth gaps found. `sb_profiles.role` field exists for admin use but admin-gated routes don't exist yet.
5. **Age mode affects AI prompt only** — The system prompt adapts well by mode. But suggestion chips in Ask are hardcoded for adults, and story UI doesn't vary by mode at all. IDEA-003 addresses this.

### Plans Ready to Execute
- `docs/nightshift/plans/FIXPLAN-FIX-001-middleware-to-proxy.md` — Rename middleware.ts → proxy.ts (5 min)
- `docs/nightshift/plans/FIXPLAN-FIX-003-story-fulltext-markdown.md` — Use ReactMarkdown for story text (10 min)
- `docs/nightshift/plans/FIXPLAN-FIX-004-ask-api-rate-limiting.md` — Add per-user rate limit to /api/ask (30 min)
- `docs/nightshift/plans/DEVPLAN-IDEA-001-guided-journeys.md` — Full Guided Journeys feature (4–6 hours)

### Recommendations
- **If you have 15 min:** Do FIX-001 and FIX-003 back to back — eliminates the build warning and improves story rendering with minimal effort.
- **If you have 2 hours:** FIX-004 (rate limiting) + start Phase 1 of IDEA-001 (create journey content files and parser). Phase 1 is just markdown files and a TypeScript parser — no UI yet.

---

## Run: 2026-04-12 (Initial Setup)

### Summary
- Nightshift system initialized
- Baseline docs created: STATUS.md, BACKLOG.md, FIXES.md, NIGHTLOG.md
- Plans directory created at `docs/nightshift/plans/`
- Scheduled task configured for nightly 1:00 AM runs

### Recommendations
- **First real scan will run tonight at 1 AM**
