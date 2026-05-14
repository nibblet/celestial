# STATUS — Celestial Interactive Book Companion

> Last updated: 2026-05-14 (Nightshift Run 29)

## App Summary

**Celestial** is a sci-fi interactive book companion — a reader's shell around a fiction manuscript. Readers progress through chapters (CH01–CH17), unlock wiki/lore entities as they read, and ask grounded questions of an in-world AI assistant without receiving spoilers.

**Stack:** Next.js 16.2.3 (App Router), TypeScript 5, React 19.2, Tailwind 4, Supabase, Anthropic SDK (Claude Sonnet 4), react-markdown, TipTap 3.

---

## Architecture

### Wiki-First Content

- All fiction chapters (CH01–CH17) live in `content/wiki/stories/` as markdown files
- Fiction entities: `content/wiki/characters/`, `content/wiki/factions/`, `content/wiki/locations/`, `content/wiki/artifacts/`, `content/wiki/rules/`
- Mission logs in `content/wiki/mission-logs/` (extracted from chapters)
- **25 rules** in `content/wiki/rules/` (Run 12: +9 new Series Bible rules from `scripts/ingest-bible-rules.ts`: ancients-philosophy, conscious-machines, containment-morality, earth-2050, moral-questions, prologue-timeline, spiritual-symbols, technology-limits, vault-network)
- **5 artifacts** in `content/wiki/artifacts/` (Run 12: echo-core + harmonic-key deleted; giza-vault/vault-002/003/006 moved to vaults/ only; harmonic-drive added)
- Compiled by `scripts/compile-wiki.ts` + `scripts/generate-static-data.ts` → `src/lib/wiki/static-data.ts`
- Canon dossier blocks (`<!-- canon:dossier ... --> ... <!-- canon:end -->`) seeded by `scripts/seed-canon-entities.ts` — parsed by `src/lib/wiki/canon-dossier.ts`
- Continuity snapshots: `content/raw/.continuity/last-snapshot.json` — updated by `scripts/review-ingestion.ts` (Phase G)
- Canon inventory: `content/raw/canon_entities.json`, `content/raw/canon_inventory.json`, `content/raw/lore_inventory.json`
- **Chapter tags**: `content/raw/chapter_tags.json` — AI-generated entity + summary tags for all 17 chapters, produced by `scripts/tag-chapter-entities.ts`. Read by `src/lib/wiki/chapter-tags.ts`.
- **10 vault entities** in `content/wiki/vaults/` (giza-vault, vault-002 through vault-010)
- **26 locations** in `content/wiki/locations/` (Run 12: +4 new: andes-glacial-lake, asteroid-belt, europa, ganymede)
- **Timeline content**: `content/wiki/timeline/prologue.md` (pre-Valkyrie world events, ~12000 BCE → 2050 CE) + `career-timeline.md` (legacy)
- **Character arc ledgers**: `content/wiki/arcs/characters/` — 9 authored arcs (alara, aven-voss, evelyn-tran, galen-voss, jax-reyes, jonah-revas, lena-osei, marco-ruiz, thane-meric) + `_template.md`. Parsed by `src/lib/wiki/character-arcs.ts`. Covers full Book I arc CH01–CH17 per character. **Author-only content** (⚠️ FIX-041 P0: currently ungated). ASK guidance doc at `docs/celestial/ask-answer-playbooks.md`.
- `content/wiki/characters/tiers.override.yaml` — character tier overrides
- Voice guide: `content/voice.md` (**currently a stub placeholder**)
- Decision frameworks: `content/decision-frameworks.md` (**currently a stub placeholder**)
- Foundational lore from `content/foundational-lore/manifest.json`
- Legacy people content: `content/wiki/people/` (58 entries carried from memoir shell)
- NO content in DB — all content is markdown in the repo
- Audit doc: `docs/continuity/mission-log-audit.md` (Run 12)
- Derived artifacts roadmap: `docs/celestial/derived-artifacts-roadmap.md` (Run 12)

### Database (Supabase)

- **39 migrations** (last: `039_visual_rls_keith_to_author.sql`). Next new migration: **040**.
- **⚠️ FIX-026**: Migrations 025–028 still have RLS write policies checking `role = 'keith'`. Fix requires new migration **040**.
- Migrations added in commit `0e60b8c` (Run 17):
  - `039_visual_rls_keith_to_author.sql` — drops 4 "Keith admin" policies on `cel_visual_prompts`/`cel_visual_assets` (migration 035), recreates them with `'author' or 'admin'`. NOTE: the app-layer route guards were updated to `["admin", "author", "keith"]` (commit `58b2527`) for backward compat with existing `role='keith'` accounts; the DB layer only allows `author` or `admin`.
- See Run 16 STATUS.md for migrations 035–038 (added in commit `af27957`)

### Routing

**Reader-facing:**
- `/` — Home (nav cards, `AgeModeSwitcher` — ⚠️ FIX-029)
- `/stories` — Chapter library (17 CH chapters + legacy; silhouette lock for unread chapters)
- `/stories/[storyId]` — Chapter detail (gated; scene TOC; chapter tags summary + themes shown ⚠️ IDEA-032 quality gate pending; "Chat about this story (AI)" bottom CTA → `/ask?story={id}` ✓ **SHIPPED (IDEA-040)**)
- `/stories/timeline` — Timeline view (Run 12: `TimelineView.tsx` updated for color scheme)
- `/timeline` — **Redirect** → `/stories/timeline` (permanent)
- `/characters` — Character directory
- `/characters/[slug]` — Character detail (story refs filtered by reader progress ✓; shows `CharacterArcPanel` linking to arc detail — ⚠️ FIX-041 gap; now shows `EntityVisualsGallery` for approved assets)
- `/arcs` — **New (Run 15)**: Character arc ledger index — (**⚠️ FIX-041 P0**: ungated, any reader can access)
- `/arcs/[slug]` — **New (Run 15)**: Full character arc detail with CH01–CH17 spoilers — (**⚠️ FIX-041 P0**: ungated)
- `/factions/[slug]` — Faction detail (**⚠️ FIX-031**: story IDs not gated; now shows `EntityVisualsGallery`)
- `/locations/[slug]` — Location detail (**⚠️ FIX-031**: story IDs not gated; now shows `EntityVisualsGallery`)
- `/artifacts/[slug]` — Artifact detail (**⚠️ FIX-031**: story IDs not gated; now shows `EntityVisualsGallery`)
- `/rules` — Rules/concepts index (25 entries)
- `/vaults/[slug]` — Vault detail (**⚠️ FIX-035**: story IDs not gated; now shows `EntityVisualsGallery`)
- `/journeys/[slug]` — Journey intro (BeatTimeline) (**⚠️ FIX-032 P0**: beats not gated)
- `/ask` — In-world AI companion (spoiler-safe; **⚠️ FIX-036 P0**: storySlug not validated; wiki-first context pack active since Run 16)
- All other routes per Run 11 STATUS.md

**Author-only (new Run 16):**
- `/profile/admin/visuals` — Visual assets admin console (**⚠️ FIX-043**: checks `'keith'` role instead of `'author'`)

**API:**
- `/api/ask` — Streaming AI companion (**⚠️ FIX-036 P0**: storySlug bypass; wiki-first single-call path as default since Run 16)
- `/api/admin/ai-activity` — AI ledger (**⚠️ FIX-027**: checks `'keith'` role)
- `/api/admin/threads` — Open threads CRUD (**⚠️ FIX-030**: checks `'keith'` role)
- `/api/visuals/prompt` — Synthesize visual prompt (**⚠️ FIX-043**: checks `'keith'` role)
- `/api/visuals/generate` — Generate asset via Imagen 4 / Runway Gen-4 (**⚠️ FIX-043**: checks `'keith'` role)
- `/api/visuals/approve` — Toggle asset approval (**⚠️ FIX-043**: checks `'keith'` role)
- `/api/visuals/asset/[id]` — Delete asset (**⚠️ FIX-043**: checks `'keith'` role)
- `/api/visuals/reference` — Upload/delete reference images (**⚠️ FIX-043**: checks `'keith'` role)
- `/api/visuals/preferred` — Public GET: approved asset for a (target × style) combo (no auth — intentional)

**Total routes: ~106** (Run 16: +1 admin page + 6 new visuals API routes)

### Auth / Middleware

- Auth via `src/proxy.ts` (Next.js 16 format)
- Author routes gated by `hasAuthorSpecialAccess()` — checks `role = 'author'` OR `AUTHOR_SPECIAL_EMAILS` env
- Onboarding gate in `proxy.ts` redirects non-onboarded users to `/welcome`
- Re-reader mode: `cel_profiles.show_all_content = true` reveals full corpus

### Chapter Gating — Companion-First (NEW Run 17)

- **⚠️ PRODUCT DIRECTION SHIFT (commit `0e60b8c`):** `getReaderProgress()` in `reader-progress.ts` now defaults ALL users (unauthenticated + authenticated with 0 DB reads) to `currentChapterNumber = max(CH17)` and `readStoryIds = all CH01–CH17`. Authenticated users with existing reads use `max(theirProgress, CH17)` for `currentChapterNumber`. In effect: `isStoryUnlocked()` returns `true` for every story for every user under normal conditions.
- `cel_story_reads` + `celestial_ch` guest cookie → `getReaderProgress()` → `ReaderProgress` (still functional; `readStoryIds` still tracks which chapters a user has explicitly read for the "Read" badge UI)
- `isStoryUnlocked(storyId, progress)` still defined; returns true when `chapterNumber ≤ currentChapterNumber` or `showAllContent = true`. With companion-first defaults, this is always true for CH01–CH17.
- **`showAllContent`:** `cel_profiles.show_all_content` toggle still functions. Since all content is unlocked by default, this flag is now effectively redundant for chapter gating, but it may still drive other UX signals.
- **Dead code:** `stories/[storyId]/page.tsx:42–60` — `if (!unlocked)` block cannot execute under companion-first defaults (⚠️ FIX-046).
- **Previously open gating issues** (FIX-031, FIX-032, FIX-035, FIX-036, FIX-038, FIX-041, FIX-042): All parked after companion-first shift. The code infrastructure remains in place; gating is simply inert because `currentChapterNumber` is always max.

### AI / Ask Companion

- Multi-persona orchestrator: `src/lib/ai/orchestrator.ts`
- Router: `src/lib/ai/router.ts`
- **Wiki-first single-call path (Run 16 — NEW)**: `ask_answerer` persona is now the default route for all Ask traffic. Legacy multi-persona synthesis requires both `ENABLE_DEEP_ASK=true` AND `ENABLE_MULTI_PERSONA_ASK=true`. New modules: `ask-intent.ts` (intent classifier), `ask-context.ts` (context pack builder), `ask-retrieval.ts` (wiki-first lexical retriever with reader progress gating). The retriever passes `readerProgress` through correctly and pre-filters `visibleStories` before building retrieval sources.
- Personas: celestial_narrator, lorekeeper, archivist, finder, synthesizer, editor[placeholder], **ask_answerer (NEW Run 16)**
- Kill-switches: `ENABLE_DEEP_ASK=true` (multi-persona), `ENABLE_MULTI_PERSONA_ASK=true` (legacy synthesis path)
- Spoiler protection (note: companion-first means all content is unlocked for all users; gating infrastructure remains in code):
  1. `visibleStories` filtered by `isStoryUnlocked()` before building story catalog ✓ (always returns all stories under companion-first)
  2. Wiki-first retrieval (`ask-retrieval.ts`): `readerProgress` passed; `storyIsVisible()` applied per item ✓
  3. "Reader Progress Gate" block injected into every persona system prompt ✓
  4. Open threads: `listUnresolvedThroughChapter()` gates threads to current chapter ✓
  5. Journey beats in orchestrator: gating code absent (FIX-038 parked) — moot under companion-first
  6. Journey story summaries: `getJourneyContextForPrompt` now accepts `readerProgress` (FIX-039 resolved, commit `0e60b8c`) — gate code in place but inert under companion-first
  7. `storySlug` validation: FIX-036 parked — moot under companion-first
  8. Character arc context: FIX-042 parked — arc spoiler sections remain in prompts; moot under companion-first
- Character arc AI context: `getCharacterArcContext()` in `prompts.ts` (lines 171–200) → injected by `sharedContentBlock()` in `perspectives.ts`. Injects Starting State, Unresolved Tensions, Future Questions, and ASK Guidance per character. **⚠️ FIX-042 P1**: Unresolved Tensions + Future Questions leak arc endpoints without progress filter.
- Dead `storyContextRaw` DB fetch: **RESOLVED (FIX-040)** — removed in commit `3ffc33c`. New orchestrator uses wiki-first context pack instead of filesystem + DB round-trip.
- Ask verifier: post-processes responses; checks story links against `isStoryUnlocked`, wiki links against filesystem, off-chapter entity links against chapter tags. Controlled by `ASK_VERIFIER_STRICTNESS` env (`off|warn|fail`, default `warn`). **At default `warn`, verifier NEVER blocks responses** — only `fail` strictness blocks.
- Chapter tags (`chapter_tags.json`): AI-generated per-chapter entity list + summary. **All 17 chapters still have `reviewed: false`** — `StoryDetailsDisclosure` shows the summary without checking this flag (⚠️ IDEA-032 planned).
- Mission timeline: `getMissionTimelineContext()` injects compact chapter→Mission Day/date index into all persona prompts.
- Mission logs: `getMissionLogsForChapter(storySlug)` injects chapter-specific log bodies — gated only by `storySlug` presence, not reader progress (**part of FIX-036**)
- Rules context: `getRulesContext()` with 60 000-char budget cap (25 rules injected into all prompts)
- AI ledger: all Anthropic calls recorded in `cel_ai_interactions`
- **Gap:** `content/voice.md` and `content/decision-frameworks.md` are stub placeholders

### Visuals Pipeline (Run 16 + updated Run 17 + Run 18 catch-up)

- **Corpus-grounded visual prompt synthesis**: `src/lib/visuals/` — 13 modules
  - `corpus-context.ts` — builds wiki-first context from entity/story/scene (reuses Ask retriever)
  - `synthesize-prompt.ts` — calls `visual_director` persona (Sonnet) to produce structured `VisualPrompt`; `SYNTH_PROMPT_VERSION = "v9"` (bumped in commit `58b2527`). System prompt includes **3-world canonical vocabulary** (NEW commit `74aeae5`, missed by Run 17):
    - **WORLD A — alien_organic**: bio-crystalline, petal apertures, subdermal vein emission — for Valkyrie-1, alien artifacts
    - **WORLD B — earth_2050**: brushed aluminum, riveted seams, practicals — for Mars, Earth offices, military, Rigel
    - **WORLD C — ancient_vault**: carved stone, glyph reliefs, candle-warm interior — for Vault 002, Giza, pre-human structures
  - `hash.ts` + `corpus-version.ts` — deterministic seed hash for prompt caching
  - `generate-asset.ts` — orchestrates Imagen 4 / Runway Gen-4 generation + storage
  - `extract-vision.ts` — vision fingerprint extracted from reference uploads
  - `continuity.ts` — cross-style identity continuity via approved-asset anchors
  - `style-presets.ts` — **8 Celestial-specific presets (NEW Run 17, commit `58b2527`):** `valkyrie_shipboard`, `vault_threshold`, `mars_excavation`, `earth_institutional`, `giza_archaeological`, `noncorporeal_presence`, `intimate_crew`, `mythic_scale`. Replaced 4 generic presets (`cinematic_canon`, `painterly_lore`, `noir_intimate`, `mythic_wide`). Anchors quote/paraphrase Celestial canon.
  - **`specs/loader.ts`** (NEW commit `03d7d20`, missed by Run 17): `composeEntitySpec()` — loads and merges layered JSON spec files from `content/wiki/specs/{slug}/`. Commit `74aeae5` added **parent_entity inheritance** with cycle detection and 6-level depth limit. Render order: parent.master → parent.features → parent.state → child.master → child.features → child.view → child.state. `renderSpecForPrompt()` emits a `# Visual Spec — CANON OVERRIDE` block.
  - **`specs/types.ts`** (NEW commit `03d7d20`): `SpecLayer`, `ComposedSpec`, `SpecCompositionRequest`.
  - `providers/`: `imagen.ts`, `runway.ts`, `index.ts`, `types.ts`
  - `list-entity-assets.ts` — fetches approved + reference assets for entity pages (uses admin client, bypasses RLS)
- **Visual spec content** (`content/wiki/specs/`): **17 entity directories**, 14 with `master.json`, 25 total JSON files (NEW commits `03d7d20` + `74aeae5`, missed by Run 17). Seeded entities: `valkyrie-1` (full: master + 3 features + 5 states + 2 views), `command-dome`, `resonant-pad`, 11 Valkyrie interior locations (each with `parent_entity: "valkyrie-1"`). Interior locations inherit Valkyrie WORLD A vocabulary via `parent_entity` chain.
  - **5 harmonic states for Valkyrie-1**: `dormant`, `wake`, `active`, `alignment`, `harmonic_jump` — each with a `states/{name}.json` that overrides vein color and intensity.
  - **11 interior locations** each have a stub `master.json` with `parent_entity: "valkyrie-1"`.
- **`view` and `state` params** added to `/api/visuals/prompt` POST body and `VisualsAdminConsole.tsx` (commit `03d7d20`). Allows specifying which spec view/state to use for generation.
- **Committed test renders** in `public/images/` (~15MB, ⚠️ **FIX-048**): 14 image files from spec development (5 harmonic state renders, 8 exterior/interior renders, 1 portrait). No functional breakage but repo bloat.
- **All model IDs stale** (⚠️ **FIX-047**): `synthesize-prompt.ts`, `extract-vision.ts`, and 6 other files still use `claude-sonnet-4-20250514` — should be `claude-sonnet-4-6`.
- **API routes**: 6 at `/api/visuals/` — mutation routes accept `["admin", "author", "keith"]` (keith kept for backward compat; DB-layer RLS only allows `author` or `admin` — see migration 039)
- **Admin console**: `src/app/profile/admin/visuals/VisualsAdminConsole.tsx` + page — now accessible to `role='author'` and `role='admin'` accounts
- **Gallery component**: `src/components/visuals/EntityVisualsGallery.tsx` — rendered on character, artifact, location, faction, vault detail pages
- **New tables**: `cel_visual_prompts`, `cel_visual_assets` (migration 035); `vision_fingerprint` column (migration 037); RLS fixed to `author/admin` (migration 039)
- **Visuals integration plan**: `docs/celestial/visuals-integration-plan.md` (348 lines, added commit `58b2527`) — phased plan for reader-facing visuals in Ask. **⚠️ FIX-045**: plan's anchor seeding table uses obsolete preset names; update before executing.
- **Spoiler note**: Visual images on entity pages are decorative and don't expose narrative text. Gallery shows approved/reference assets only. No chapter gating on gallery needed (companion-first: all content accessible to all users).
- **Lint**: 4 warnings (`<img>` tags in `VisualsAdminConsole.tsx` lines 230/394 and `EntityVisualsGallery.tsx` lines 64/118).

### Content Pipeline (brain_lab/ + scripts/)

- Python pipeline for EPUB ingest + entity extraction
- `brain_lab/out/review-queue.md`: **8 character files** still marked `reviewed: false` (down from 9 — one entry resolved in commit `724d66b`)
- **Run 17 additions (commits `0e60b8c`, `58b2527`):**
  - `docs/celestial/visuals-integration-plan.md` — 348-line phased plan for reader-facing visuals integration (**⚠️ FIX-045**: stale preset names in anchor table)
- **Run 15 additions:**
  - `content/wiki/arcs/characters/` — 9 arc ledger files + template (manually authored, not generated; no `<!-- generated:ingest -->` marker)
  - `docs/celestial/ask-answer-playbooks.md` — question-type → context-source matrix for Ask quality
  - `docs/celestial/publishing-and-launch-plan.md` — launch timeline/checklist
  - `docs/continuity/character-arc-review.md` — arc review rubric
- **Run 12 scripts** (unchanged): `ingest-bible-rules.ts`, `tag-chapter-entities.ts`, `enrich-artifact-dossier.ts`
- `brain_lab/out/review-queue.md` generated 2026-04-26T20:05:34Z — shows **9 character files** marked `reviewed: false` (amar-cael, aven-voss, evelyn-tran, galen-voss, jax-reyes, jonah-revas, lena-osei, marco-ruiz, thane-meric). STATUS Run 16 claimed "8" after commit `724d66b` resolved one; Run 17 count is 9 in the on-disk file — needs a pipeline re-run to get accurate count.
- Existing audit scripts: `scripts/audit-canon-namespaces.ts`, `scripts/audit-policies-from-migrations.mjs`, `scripts/patch-location-supersets.ts`, `scripts/retier-characters.ts`
- Canon inventory: `content/raw/canon_entities.json` + `content/raw/canon_inventory.json` + `content/raw/lore_inventory.json`

### Color Scheme (Run 12)

- Major CSS overhaul in `src/app/globals.css` (53 files changed, commit `631dc5b`)
- New design tokens: `sci-panel`, `sci-card-link` classes used across entity index pages
- `TimelineView.tsx` significantly refactored for new color scheme

### Legacy / Carried Content (from Memoir Shell)

- `content/wiki/people/` — 58 legacy people pages
- Age mode system (`useAgeMode`, `AgeModeSwitcher`) still UI-exposed — see FIX-029
- 12 canonical principles in `src/config/canonical-principles.ts` — memoir-era
- Various UI copy still references "Keith" — see FIX-028 (14+ files)

---

## Build / Test Status

- **Build:** PASSES — clean, ~106 routes. 1 Turbopack warning on `next.config.ts`. (Requires `npm install` before `node_modules/.bin/next build` in a fresh clone.) Verified Run 29.
- **Lint:** PASSES — 0 errors, **4 warnings** (`<img>` tags in visuals components — `VisualsAdminConsole.tsx` lines 230/394, `EntityVisualsGallery.tsx` lines 64/118). Unchanged since Run 17.
- **Tests:** **192 total / 192 PASS / 0 FAIL** (unchanged since Run 17). All green. Verified Run 29.

## Known Issues (See FIXES.md)

- **FIX-052 (Low — planned Run 25):** In-memory rate limiter in `src/lib/rate-limit.ts` not effective across serverless lambda instances. 8 routes affected; highest cost risk is `/api/ask` and `/api/stories/[storyId]/audio/stream`. Fix: Supabase-backed `cel_rate_limits` table + `upsert_rate_limit` PG function for the two expensive routes; in-memory limiter kept as secondary local guard. Requires migration 041 (after FIX-026's migration 040). Plan: `FIXPLAN-FIX-052-serverless-rate-limit.md`.
- **FIX-051 (Low — planned Run 22):** `dangerouslySetInnerHTML` without HTML sanitization in two author-only admin surfaces (`BeyondDraftEditor.tsx:420`, `admin/drafts/page.tsx:185`). TipTap Image extension does not restrict `javascript:` or `data:` URIs. Fix: install `isomorphic-dompurify`, create `src/lib/sanitize-html.ts`, wrap both call sites, add Image src scheme validation in `TipTapEditor.tsx`. Plan: `FIXPLAN-FIX-051-dangerouslysetinnerhtml-admin.md`.
- **FIX-050 (Low — planned Run 21):** `/\bnext\b/i` in `FUTURE_PATTERNS` in `ask-intent.ts` (line 35) overly broad — misclassifies factual "next" questions as `future_speculation`. Fix: 1-line deletion + 1 regression test. Plan: `FIXPLAN-FIX-050-ask-intent-next-pattern.md`.
- **FIX-049 (Low — planned Run 21):** `requireKeith()` function in 5 visuals API routes is misleadingly named — the function body checks `["admin", "author", "keith"]`. Rename to `requireAuthor()`. Plan: `FIXPLAN-FIX-049-requirekeith-function-name.md`.
- **FIX-048 (Low — planned Run 18):** ~15MB of binary test renders in `public/images/`. Repo bloat; add `.gitignore` pattern to prevent future additions. Plan: `FIXPLAN-FIX-048-committed-images-public.md`.
- **FIX-047 (Low — planned Run 18):** 12 files use stale `claude-sonnet-4-20250514` model ID (Run 29 grep reconfirmed 12: `personas.ts`, `synthesize-prompt.ts`, `extract-vision.ts`, `session-wrap.ts`, `profile-reflection.ts`, `ledger.ts`, 3 API routes, + 3 test files `ledger.test.ts` / `reflections.test.ts` / `profile-reflection.test.ts`). Note: `src/lib/wiki/entity-dossier.test.ts` contains `claude-sonnet-4-5` in test fixture HTML data — that is historical metadata in a fixture, not an API call argument; it is NOT in scope for this fix. Update to `claude-sonnet-4-6`; bump SYNTH_PROMPT_VERSION to v10. Plan: `FIXPLAN-FIX-047-stale-model-id.md` (plan written for 9 files — update count to 12 when executing; test files need updating too). FIXES.md corrected from "9 files" to "12 files" in Run 29.
- **FIX-046 (Low — planned Run 17, unexecuted):** Stale "unlock as you progress" UI copy in 3 places. `HomePageClient.tsx:16`, `StoriesPageClient.tsx:217`, dead code in `stories/[storyId]/page.tsx:42–60`. Plan: `FIXPLAN-FIX-046-companion-first-stale-copy.md`.
- **FIX-045 (Low — planned Run 17, unexecuted):** `docs/celestial/visuals-integration-plan.md` uses obsolete preset names. Docs fix only; update before executing the plan. Plan: `FIXPLAN-FIX-045-visuals-plan-stale-presets.md`.
- **FIX-041 (parked):** `/arcs` and `/arcs/[slug]` pages have zero auth gate. Parked after companion-first shift.
- **FIX-036 (parked):** `storySlug` not validated in Ask API. Parked after companion-first shift.
- **FIX-032 (parked):** BeatTimeline on journey pages. Parked after companion-first shift.
- **FIX-042 (parked):** Arc context in Ask prompts has spoilery sections. Parked after companion-first shift.
- **FIX-038 (parked):** Journey beats in orchestrator not progress-filtered. Parked after companion-first shift.
- **FIX-035 (parked):** Vault detail pages show story IDs. Parked after companion-first shift.
- **FIX-031 (parked):** Fiction entity pages show future chapter IDs. Parked after companion-first shift.
- **FIX-030 (Medium — planned):** `/api/admin/threads` checks `'keith'` role
- **FIX-027 (Medium — planned):** `/api/admin/ai-activity` checks `'keith'` role
- **FIX-026 (Medium — planned):** RLS policies in migrations 025–028 check `role = 'keith'` — fix requires migration **040**
- **FIX-028 (Low — planned Run 22):** Legacy "Keith" UI copy in 20+ src/ files (includes `AskAboutStory.tsx` "Write to Keith" widget on story pages). Plan: `FIXPLAN-FIX-028-keith-ui-copy-sweep.md`.
- **FIX-029 (Low-Medium — planned Run 22):** Age mode system exposed in UI (adult fiction only). 3-phase removal: Phase 1 (9 files, UI-safe), Phase 2 (DB migration 040), Phase 3 (prompts/API). Plan: `FIXPLAN-FIX-029-remove-age-mode-system.md`.
- **FIX-013, FIX-014, FIX-016, FIX-017:** Tell pipeline defensive coding

## Next Actions (Priority Order)

1. **IDEA-048 (15 min):** Add Ask CTA near top of story page (after summary, before scene navigation) — 6 lines JSX in `stories/[storyId]/page.tsx` between lines 166–168. Dev plan `DEVPLAN-IDEA-048-ask-cta-top-of-story-page.md` ready.
2. **IDEA-072 (1.5 hr):** Chapter quick-facts panel on Ask page — collapsible card showing mission day range, primary location, and top 3 characters when `?story=` is set. Extends `/meta` endpoint (same change as IDEA-057). Dev plan `DEVPLAN-IDEA-072-chapter-quick-facts-panel.md` ready.
3. **IDEA-069 (2 hr):** Ask CTA on all entity detail pages — `FictionEntityDetailPage` + `characters/[slug]/page.tsx` + `RuleDetailPage` CTAs + entity breadcrumb + type-specific chips in `ask/page.tsx`. Dev plan `DEVPLAN-IDEA-069-entity-level-ask-cta.md` ready.
4. **IDEA-057 (45 min):** Context-aware welcome message on Ask page — extend `meta` API to return chapter-specific suggestions, add `chapterWelcome` state to Ask page, conditional empty-state render. Dev plan `DEVPLAN-IDEA-057-context-aware-ask-welcome.md` ready.
5. **IDEA-063 (30 min):** Entity hover-card tooltips on wiki links in Ask answers — new `EntityHoverCard` component, 2-file change. No fetch, no API, no DB. Dev plan `DEVPLAN-IDEA-063-entity-hover-card.md` ready.
6. **IDEA-066 (1.5 hr):** "Continue where you left off" in Ask empty state — localStorage-backed prior session card for story-specific sessions. 1 state var + 2 useEffects + 1 callback + ~25 JSX lines in `ask/page.tsx` only. Dev plan `DEVPLAN-IDEA-066-cross-session-ask-resume.md` ready.
7. **IDEA-062 (2 hr):** Re-Reader Hindsight Panel — new `chapter-hindsight.ts` server utility + `HindsightPanel.tsx` component. Gated by `show_all_content`. Zero new content or DB changes. Dev plan `DEVPLAN-IDEA-062-re-reader-hindsight-panel.md` ready.
8. **IDEA-077 (1.5 hr):** Re-Reader Highlight Fingerprint — 17-tile chapter intensity mosaic on `/profile/highlights`, gated by `show_all_content`. Uses existing `cel_story_highlights` count query. Dev plan `DEVPLAN-IDEA-077-highlight-fingerprint.md`. *(NEW Run 29)*
9. **IDEA-051 (30 min):** Scene-level "Ask →" hover affordance on `### Scene` headings. 2-file change: extend `StoryMarkdown` props, modify h3 renderer, pass `storyId` from `StoryBodyWithHighlighting`. Dev plan `DEVPLAN-IDEA-051-scene-level-ask-affordance.md` ready.
10. **FIX-051 (1 hr):** HTML sanitization for `dangerouslySetInnerHTML` in admin surfaces. Install `isomorphic-dompurify`, wrap 2 call sites, add TipTap Image src validation. Plan: `FIXPLAN-FIX-051-dangerouslysetinnerhtml-admin.md`.
11. **FIX-050 (5 min):** Remove `/\bnext\b/i` from FUTURE_PATTERNS in `ask-intent.ts` line 35 + add 1 regression test. Plan: `FIXPLAN-FIX-050-ask-intent-next-pattern.md`.
12. **FIX-049 (10 min):** Rename `requireKeith()` to `requireAuthor()` in 5 visuals API routes (naming-only, no logic changes). Plan: `FIXPLAN-FIX-049-requirekeith-function-name.md`.
13. **IDEA-052 (3 hr author time, 0 code):** Author seeds 9 character spec JSONs, runs batch portrait generation, approves via admin console. Plan: `DEVPLAN-IDEA-052-canonical-character-portraits.md`.
14. **IDEA-042 (2 hr):** Suggested follow-up chips after Ask answers — dev plan `DEVPLAN-IDEA-042-follow-up-chips.md` ready.
15. **IDEA-043 (5 hr):** On-demand scene visualization via Ask — dev plan `DEVPLAN-IDEA-043-on-demand-scene-visualization.md`. Extends visuals pipeline to reader-triggered image generation.
16. **FIX-052 (45 min):** Supabase-backed rate limit for `/api/ask` and audio stream. New migration 041 + `rate-limit-db.ts` module. Plan: `FIXPLAN-FIX-052-serverless-rate-limit.md`.
17. **FIX-047 (15 min):** Update all 12 files (9 source + 3 test) with stale `claude-sonnet-4-20250514` to `claude-sonnet-4-6`; bump SYNTH_PROMPT_VERSION to v10. Plan: `FIXPLAN-FIX-047-stale-model-id.md`.
18. **FIX-045 (10 min):** Update `docs/celestial/visuals-integration-plan.md` preset names before executing Phase 0 of the visuals plan. Docs-only fix.
19. **FIX-046 (20 min):** Update stale "unlock as you progress" copy in 3 files; remove dead `!unlocked` code block.
20. **FIX-026 + FIX-027 + FIX-030 (30 min combined):** Three stale `'keith'` role fixes. FIX-026 migration **040** conflicts with IDEA-043 Phase 5 (041) — FIX-026 goes first.
21. **FIX-048 (5 min):** Add `.gitignore` pattern for `public/images/`.
22. **FIX-028 (30 min + copy decisions):** Legacy "Keith" UI sweep including `AskAboutStory.tsx`. Plan: `FIXPLAN-FIX-028-keith-ui-copy-sweep.md`.
23. **FIX-029 Phase 1 (1 hr):** Remove AgeModeSwitcher from Nav/Header/Home; flatten age mode branches in 9 files. Plan: `FIXPLAN-FIX-029-remove-age-mode-system.md`.
24. **FIX-013, FIX-014, FIX-016, FIX-017:** Tell pipeline defensive coding — low priority.
