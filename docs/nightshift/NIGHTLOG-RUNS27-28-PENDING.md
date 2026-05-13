# NIGHTLOG Runs 27–28 — Pending Merge

> NIGHTLOG.md has grown beyond the size limit for automated inline updates.
> These two entries must be **prepended** to `docs/nightshift/NIGHTLOG.md`
> (insert after the `---` header line, before the Run 24 entry).
> Once merged, delete this file.
>
> **Note:** Runs 25 and 26 were also too large to push to NIGHTLOG.md at the time.
> Their changes are fully reflected in BACKLOG.md, FIXES.md, and STATUS.md.
> The NIGHTLOG history gap (Runs 25–26) is acknowledged — no recovery action needed.

---

## Run: 2026-05-13 (Run 28)

### Summary
- Scanned: 0 new code commits since Run 27 nightshift (`bf0bbd9` was docs-only). Codebase state unchanged.
- Issues: 0 new. 0 resolved. 0 spoiler-leak P0. All open planned issues unchanged: FIX-026, 027, 028, 029, 030, 045, 046, 047, 048, 049, 050, 051, 052.
- Ideas (by theme): ask-forward 1 seed (IDEA-075 — Ask Pinned Q&A) / 1 promoted to `planned` (IDEA-072 — chapter quick-facts panel, dev plan written); genmedia 1 seed (IDEA-076 — World Visual Glossary) / 0 promoted; post-read-world 1 seed (IDEA-077 — re-reader highlight fingerprint) / 0 promoted; parked 0.
- Plans written: `DEVPLAN-IDEA-072-chapter-quick-facts-panel.md`.

### Build & Lint & Test Results
- `npm install` required (fresh clone). `node_modules/.bin/next build`: **PASSES** — ~106 routes, 1 Turbopack warning on `next.config.ts` (unchanged).
- `npm run lint`: **PASSES** — 0 errors, 4 warnings (unchanged: `VisualsAdminConsole.tsx` lines 230/394, `EntityVisualsGallery.tsx` lines 64/118).
- `npm test`: **192 PASS / 0 FAIL** (unchanged).

### Key Findings

1. **No new code commits.** Codebase is identical to Run 27. All prior open issues and parked issues remain in last-known state. FIX-049 (requireKeith naming), FIX-050 (ask-intent next pattern), and FIX-047 (12 stale model IDs) all confirmed still open via grep.

2. **IDEA-072 promoted to `planned` and dev plan written.** Chapter Quick-Facts Panel: a collapsible `<details>` card above the chat thread on Ask pages opened via `?story=`. Shows mission day range (from `mission_logs_inventory.json` — same source as `getMissionTimelineContext()`), primary location slug (from `chapter_tags.json` `locations[0]`, linked to `/locations/{slug}`), and top 3 characters (sorted by `presence: lead > supporting > mentioned`). Key implementation insight: data for all three fields already exists in files the server already reads; no new infrastructure needed. The IDEA-057 dependency is soft — both ideas extend `/meta` with independent JSON fields and can ship in either order. 3-file change: `meta/route.ts` + `ask/page.tsx` + new `ChapterQuickFactsPanel.tsx`. Estimated 1.5 hours.

3. **Three new ideas seeded.** IDEA-075 (ask-forward: Ask Pinned Q&A — star individual assistant messages to `/profile/questions`; needs migration 042 for `pinned` column on `cel_messages`; 2.5 hr estimate), IDEA-076 (genmedia: World Visual Glossary — 3 abstract canonical texture/mood cards one per visual world; author batch; ~$0.18 total; no spoiler risk; grounded in WORLD A/B/C vocabulary from `synthesize-prompt.ts`), IDEA-077 (post-read-world: Re-Reader Highlight Fingerprint — 17-tile chapter intensity mosaic on `/profile/highlights` gated by `show_all_content`; uses existing `cel_story_highlights` count query; 1.5 hr estimate).

4. **NIGHTLOG-RUN27-PENDING.md merged locally and deleted from remote.** The Run 27 entry was incorporated into the local NIGHTLOG.md. This RUNS27-28 pending file carries it forward since the full NIGHTLOG.md (154KB) remains too large to push inline.

5. **No new spoiler-leak or auth issues found.** `src/app/journeys/[slug]/narrated/page.tsx` has no reader progress gate but renders no content (journeys directory does not exist — page returns `notFound()`). The `src/app/admin/media/page.tsx` is a `"use client"` component without a server-level auth check, but the API endpoints it calls correctly gate on `profile?.role !== "admin"` — no security gap.

6. **FIX-047 count confirmed at 12.** 13th grep match (`entity-dossier.test.ts`) is fixture HTML data, not an API call argument. Count unchanged.

### Plans Ready to Execute
- `docs/nightshift/plans/DEVPLAN-IDEA-072-chapter-quick-facts-panel.md` — **NEW**: Chapter quick-facts panel on Ask page (ask-forward). 1.5 hours. 3-file change, zero new infra.
- `docs/nightshift/plans/DEVPLAN-IDEA-069-entity-level-ask-cta.md` — Ask CTAs on all entity detail pages + entity breadcrumb + type-specific chips (ask-forward). 2 hours.
- `docs/nightshift/plans/DEVPLAN-IDEA-066-cross-session-ask-resume.md` — "Continue where you left off" localStorage-backed Ask resume (ask-forward). 1.5 hours.
- `docs/nightshift/plans/DEVPLAN-IDEA-062-re-reader-hindsight-panel.md` — Re-reader hindsight panel on chapter pages (post-read-world). 2 hours.
- `docs/nightshift/plans/DEVPLAN-IDEA-057-context-aware-ask-welcome.md` — Context-aware Ask welcome with chapter chips (ask-forward). 45 minutes.
- `docs/nightshift/plans/DEVPLAN-IDEA-051-scene-level-ask-affordance.md` — Scene-level "Ask →" hover on `### Scene` headings (ask-forward). 30 minutes.
- `docs/nightshift/plans/DEVPLAN-IDEA-048-ask-cta-top-of-story-page.md` — Ask CTA after chapter summary (ask-forward). 15 minutes.
- `docs/nightshift/plans/FIXPLAN-FIX-050-ask-intent-next-pattern.md` — Remove overly broad `/\bnext\b/` from ask-intent. 5 minutes.
- `docs/nightshift/plans/FIXPLAN-FIX-049-requirekeith-function-name.md` — Rename `requireKeith()` to `requireAuthor()`. 10 minutes.

### Recommendations
- **If you have 30 min:** IDEA-048 (15 min) + FIX-050 (5 min) + FIX-049 (10 min). Three clean quick wins.
- **If you have 2 hours:** IDEA-048 + IDEA-057 (45 min context-aware welcome) + IDEA-072 (1.5 hr quick-facts panel). Ask gets a smart empty state AND a persistent reference card for story sessions.
- **If you have 3 hours:** The 2-hour batch above + IDEA-063 (30 min entity hover-cards) + IDEA-069 (2 hr entity-level Ask CTAs). Ask becomes the primary surface for the entire wiki.

---

## Run: 2026-05-12 (Run 27)

### Summary
- Scanned: 0 new code commits since Run 26 nightshift (`db25e39` was docs-only). Codebase state unchanged.
- Issues: 0 new. 0 resolved. 0 spoiler-leak P0. All open planned issues unchanged: FIX-026, 027, 028, 029, 030, 045, 046, 047, 048, 049, 050, 051, 052. Note: FIX-047 file count clarified as 12 (not 13); `entity-dossier.test.ts` contains `claude-sonnet-4-5` in test fixture HTML data only — excluded from FIX-047 scope.
- Ideas (by theme): ask-forward 1 seed (IDEA-072 — chapter quick-facts panel in Ask) / 1 promoted to `planned` (IDEA-069 — entity-level Ask CTAs, dev plan written); genmedia 1 seed (IDEA-073 — batch chapter cinematic stills) / 0 promoted; post-read-world 1 seed (IDEA-074 — crew cross-reference card for re-readers) / 0 promoted; parked 2 (IDEA-067, IDEA-068 — 3-day stale).
- Plans written: `DEVPLAN-IDEA-069-entity-level-ask-cta.md`.

### Build & Lint & Test Results
- No code commits since Run 26. Build, lint, and test status unchanged: **PASSES** / 0 errors, 4 img warnings / 192 PASS.

### Key Findings

1. **No new code commits.** Codebase identical to Run 26. All prior issues unchanged.

2. **FIX-047 count clarified at 12.** 13th result in grep (`entity-dossier.test.ts`) is fixture HTML comment data — `model="claude-sonnet-4-5"` representing a historical annotation, not an API call. Not in scope.

3. **IDEA-069 promoted to `planned` and dev plan written.** Entity-level Ask CTA on all entity detail pages. `FictionEntityDetailPage` in `FictionEntityViews.tsx` already has `entity.slug` and `entity.entityType` in scope — single change covers factions/locations/artifacts/vaults. Characters and Rules need separate changes. `entityName` passed as URL param to avoid any server fetch. Entity breadcrumb mirrors story-context breadcrumb at ~line 636. Entity-specific chips replace generic `SUGGESTIONS_BY_AGE_MODE` when `entitySlug` present. 3-file change, zero new API routes, zero DB, zero npm packages. Estimated 2 hours.

4. **Two ideas parked (3-day stale rule).** IDEA-067 (genmedia: Ask auto-illustration toggle — superseded by IDEA-043) and IDEA-068 (post-read-world: Re-Reader Deep Archive Mode — progress gate ceremonial under companion-first).

5. **Three new ideas seeded.** IDEA-072 (ask-forward: chapter quick-facts panel), IDEA-073 (genmedia: batch chapter cinematic stills — needs `sequence_index` schema on `cel_visual_assets`), IDEA-074 (post-read-world: crew cross-reference card — `show_all_content`-gated, uses arc ledger data).

6. **Review queue unchanged.** `brain_lab/out/review-queue.md` still shows 1 entry with `reviewed: false`. Timestamp 2026-04-26 — fresh brain_lab run needed.

### Plans Ready to Execute
- `docs/nightshift/plans/DEVPLAN-IDEA-069-entity-level-ask-cta.md` — **NEW**: Ask CTAs on all entity detail pages (ask-forward). 2 hours.
- `docs/nightshift/plans/DEVPLAN-IDEA-066-cross-session-ask-resume.md` — "Continue where you left off" localStorage resume (ask-forward). 1.5 hours.
- `docs/nightshift/plans/DEVPLAN-IDEA-062-re-reader-hindsight-panel.md` — Re-reader hindsight panel (post-read-world). 2 hours.
- `docs/nightshift/plans/DEVPLAN-IDEA-057-context-aware-ask-welcome.md` — Context-aware Ask welcome (ask-forward). 45 minutes.
- `docs/nightshift/plans/DEVPLAN-IDEA-051-scene-level-ask-affordance.md` — Scene-level Ask affordance (ask-forward). 30 minutes.
- `docs/nightshift/plans/DEVPLAN-IDEA-048-ask-cta-top-of-story-page.md` — Ask CTA top of story page (ask-forward). 15 minutes.

### Recommendations
- **If you have 30 min:** IDEA-048 (15 min) + FIX-050 (5 min) + FIX-049 (10 min).
- **If you have 2 hours:** IDEA-048 + IDEA-069 (entity-level Ask CTAs). Every wiki page gets an Ask CTA.
- **If you have 3 hours:** 2-hour batch + IDEA-063 (entity hover-cards) + IDEA-057 (context-aware welcome).

---
