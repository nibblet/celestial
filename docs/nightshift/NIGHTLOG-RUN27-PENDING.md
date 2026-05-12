# NIGHTLOG Run 27 — Pending Merge

> NIGHTLOG.md has grown to 148KB and cannot be updated in a single automated push.
> The Run 27 entry below must be **prepended** to `docs/nightshift/NIGHTLOG.md`
> (insert after the `---` header line, before the Run 24 entry).
> Once merged, delete this file.

---

## Run: 2026-05-12 (Run 27)

### Summary
- Scanned: 0 new code commits since Run 26 nightshift (`db25e39` was docs-only). Codebase state unchanged.
- Issues: 0 new. 0 resolved. 0 spoiler-leak P0. All open planned issues unchanged: FIX-026, 027, 028, 029, 030, 045, 046, 047, 048, 049, 050, 051, 052. Note: FIX-047 file count clarified as 12 (not 13); `entity-dossier.test.ts` contains `claude-sonnet-4-5` in test fixture HTML data only, not an API call argument — excluded from FIX-047 scope.
- Ideas (by theme): ask-forward 1 seed (IDEA-072 — chapter quick-facts panel in Ask) / 1 promoted to `planned` (IDEA-069 — entity-level Ask CTAs, dev plan written); genmedia 1 seed (IDEA-073 — batch chapter cinematic stills) / 0 promoted; post-read-world 1 seed (IDEA-074 — crew cross-reference card for re-readers) / 0 promoted; parked 2 (IDEA-067 genmedia — 3-day stale, IDEA-068 post-read-world — 3-day stale).
- Plans written: `DEVPLAN-IDEA-069-entity-level-ask-cta.md`.

### Build & Lint & Test Results
- No code commits since Run 26. Build, lint, and test status unchanged: **PASSES** / 0 errors, 4 img warnings / 192 PASS.
- `node_modules/.bin/next build`: **PASSES** — ~106 routes, same as Run 26.
- `npm run lint`: **PASSES** — 0 errors, 4 warnings (unchanged: `VisualsAdminConsole.tsx` lines 230/394, `EntityVisualsGallery.tsx` lines 64/118).
- `npm test`: **192 PASS / 0 FAIL** (unchanged).

### Key Findings

1. **No new code commits.** Codebase is identical to Run 26. All prior open issues and parked issues remain in last-known state.

2. **FIX-047 count clarified at 12.** Run 27 grep with `claude-sonnet-4-20250514\|claude-sonnet-4-5` returned 13 results. Investigation: 13th result (`src/lib/wiki/entity-dossier.test.ts`) uses `claude-sonnet-4-5` in test fixture HTML comment data — `model="claude-sonnet-4-5"` in a `<!-- ai-dossier:... -->` tag representing a historical annotation, not an API call argument. Not in scope for FIX-047. The 12-file count in FIX-047 is correct and unchanged.

3. **IDEA-069 promoted to `planned` and dev plan written.** Entity-level Ask CTA on all entity detail pages. Key implementation insight from codebase read: `FictionEntityDetailPage` in `FictionEntityViews.tsx` already has `entity.slug` and `entity.entityType` in scope — a single change covers factions, locations, artifacts, and vaults. Characters page needs a separate change; Rules (`RuleDetailPage`) needs a separate change. In `ask/page.tsx`, `entityName` is passed as a URL param (avoiding any fetch) alongside `entitySlug` and `entityType`. The entity breadcrumb mirrors the existing story-context breadcrumb at ~line 636. Entity-specific suggestion chips replace the generic `SUGGESTIONS_BY_AGE_MODE` chips when `entitySlug` is present. 3-file change, zero new API routes, zero DB changes, zero npm packages. Estimated 2 hours. Dev plan: `DEVPLAN-IDEA-069-entity-level-ask-cta.md`.

4. **Two ideas parked (3-day stale rule).** IDEA-067 (genmedia: Ask auto-illustration toggle — seeded 2026-05-09, 3 days old; superseded by IDEA-043 which covers the explicit "show me" path first) and IDEA-068 (post-read-world: Re-Reader Deep Archive Mode — seeded 2026-05-09, 3 days old; under companion-first the progress gate is already ceremonial, making this low-value for the current product direction).

5. **Three new ideas seeded.** IDEA-072 (ask-forward: chapter quick-facts panel in Ask — persistent collapsible card showing mission date, primary location, and 3 key entities from `chapter_tags.json` when `?story=` param is set; depends on IDEA-057 meta route extension), IDEA-073 (genmedia: batch chapter cinematic stills — 3 Imagen 4 stills per chapter at opening/midpoint/closing atmosphere; needs `sequence_index` schema on `cel_visual_assets`; blocks on IDEA-052 batch workflow proof), IDEA-074 (post-read-world: crew cross-reference card on character detail pages — `show_all_content`-gated list of co-character connections + final relationship state from arc ledger data; new `crew-cross-ref.ts` utility, new `<CrewCrossRefCard>` component; 2 hours).

6. **Review queue unchanged.** `brain_lab/out/review-queue.md` still shows 1 entry with `reviewed: false`. File timestamp still 2026-04-26 — a fresh brain_lab run is needed for accurate count.

7. **IDEA-069 is now the second-highest ask-forward quick win after IDEA-048.** It extends the established `?story=` CTA pattern to every entity page, creating a consistent "Ask about this →" affordance across the entire wiki. 3-file change, no new infrastructure, ready to execute immediately after IDEA-048.

### Plans Ready to Execute
- `docs/nightshift/plans/DEVPLAN-IDEA-069-entity-level-ask-cta.md` — **NEW**: Ask CTAs on all entity detail pages + entity breadcrumb + type-specific chips in Ask empty state (ask-forward). 2 hours. 3-file change, zero new infra.
- `docs/nightshift/plans/DEVPLAN-IDEA-066-cross-session-ask-resume.md` — "Continue where you left off" localStorage-backed Ask resume (ask-forward). 1.5 hours.
- `docs/nightshift/plans/DEVPLAN-IDEA-062-re-reader-hindsight-panel.md` — Re-reader hindsight panel on chapter pages (post-read-world). 2 hours.
- `docs/nightshift/plans/DEVPLAN-IDEA-057-context-aware-ask-welcome.md` — Context-aware Ask welcome with chapter chips (ask-forward). 45 minutes.
- `docs/nightshift/plans/DEVPLAN-IDEA-051-scene-level-ask-affordance.md` — Scene-level "Ask →" hover on `### Scene` headings (ask-forward). 30 minutes.
- `docs/nightshift/plans/DEVPLAN-IDEA-048-ask-cta-top-of-story-page.md` — Ask CTA after chapter summary (ask-forward). 15 minutes.
- `docs/nightshift/plans/FIXPLAN-FIX-051-dangerouslysetinnerhtml-admin.md` — HTML sanitization for admin dangerouslySetInnerHTML. 1 hour.
- `docs/nightshift/plans/FIXPLAN-FIX-050-ask-intent-next-pattern.md` — Remove overly broad `/\bnext\b/` from ask-intent. 5 minutes.
- `docs/nightshift/plans/FIXPLAN-FIX-049-requirekeith-function-name.md` — Rename `requireKeith()` to `requireAuthor()`. 10 minutes.
- `docs/nightshift/plans/DEVPLAN-IDEA-063-entity-hover-card.md` — Entity hover-card tooltips in Ask answers (ask-forward). 30 minutes.
- `docs/nightshift/plans/DEVPLAN-IDEA-042-follow-up-chips.md` — Follow-up chips in Ask (ask-forward). 2 hours.
- `docs/nightshift/plans/DEVPLAN-IDEA-043-on-demand-scene-visualization.md` — On-demand scene visualization via Ask (genmedia). 5 hours.

### Recommendations
- **If you have 30 min:** IDEA-048 (15 min — Ask CTA after story summary, 6 lines JSX) + FIX-050 (5 min — delete 1 line in ask-intent) + FIX-049 (10 min — rename requireKeith in 5 files). Three quick wins.
- **If you have 2 hours:** IDEA-048 (15 min) + IDEA-069 (2 hr — Ask CTAs on all entity pages + entity-aware empty state). After this, every wiki page and every story page has an Ask CTA — the companion is reachable from everywhere in the UI.
- **If you have 3 hours:** The 2-hour batch above + IDEA-063 (30 min — entity hover-cards in Ask) + IDEA-057 (45 min — context-aware welcome). After this, Ask has rich contextual entry points and a smart empty state.

---
