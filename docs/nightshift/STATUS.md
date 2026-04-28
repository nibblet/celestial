# STATUS — Celestial Interactive Book Companion

> Last updated: 2026-04-28 (Nightshift Run 16)

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

- **38 migrations** (last: `038_beyond_media_video_mime.sql`). Next new migration: **039**.
- **⚠️ FIX-026**: Migrations 025–028 still have RLS write policies checking `role = 'keith'`. Fix requires new migration **039** (was 035 — now taken by visuals).
- **⚠️ FIX-044 (NEW Run 16)**: Migration 035 RLS policies on `cel_visual_prompts` and `cel_visual_assets` check `role = 'keith'` in 4 INSERT/UPDATE policies. Fix requires new migration **039**.
- Migrations added in commit `af27957` (Run 16):
  - `035_visual_prompts_assets.sql` — `cel_visual_prompts` + `cel_visual_assets` tables, RLS (⚠️ FIX-044: keith role in 4 policies)
  - `036_cel_profiles_self_read.sql` — profiles self-read policy
  - `037_visual_assets_vision.sql` — vision fingerprint column on visual assets
  - `038_beyond_media_video_mime.sql` — video mime type support for beyond-media bucket
- See Run 11 STATUS.md for full migration list (001–034)

### Routing

**Reader-facing:**
- `/` — Home (nav cards, `AgeModeSwitcher` — ⚠️ FIX-029)
- `/stories` — Chapter library (17 CH chapters + legacy; silhouette lock for unread chapters)
- `/stories/[storyId]` — Chapter detail (gated; scene TOC; chapter tags summary + themes shown ⚠️ IDEA-032 quality gate pending)
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

### Chapter Gating

- `cel_story_reads` + `celestial_ch` guest cookie → `getReaderProgress()` → `ReaderProgress`
- `isStoryUnlocked(storyId, progress)` returns true if `chapterNumber ≤ currentChapterNumber` or `showAllContent = true`
- **Correctly applied:** story detail page, story library card (silhouette), mission logs, character detail page story refs
- **⚠️ NOT applied (FIX-031):** faction/location/artifact detail pages — story appearance IDs shown unfiltered
- **⚠️ NOT applied (FIX-035):** vault detail pages — same gap as FIX-031
- **⚠️ NOT applied (FIX-032 P0):** BeatTimeline on journey pages — beat content from locked chapters visible
- **⚠️ NOT applied (FIX-036 P0):** Ask API `storySlug` — caller can inject locked chapter content into AI context

### AI / Ask Companion

- Multi-persona orchestrator: `src/lib/ai/orchestrator.ts`
- Router: `src/lib/ai/router.ts`
- **Wiki-first single-call path (Run 16 — NEW)**: `ask_answerer` persona is now the default route for all Ask traffic. Legacy multi-persona synthesis requires both `ENABLE_DEEP_ASK=true` AND `ENABLE_MULTI_PERSONA_ASK=true`. New modules: `ask-intent.ts` (intent classifier), `ask-context.ts` (context pack builder), `ask-retrieval.ts` (wiki-first lexical retriever with reader progress gating). The retriever passes `readerProgress` through correctly and pre-filters `visibleStories` before building retrieval sources.
- Personas: celestial_narrator, lorekeeper, archivist, finder, synthesizer, editor[placeholder], **ask_answerer (NEW Run 16)**
- Kill-switches: `ENABLE_DEEP_ASK=true` (multi-persona), `ENABLE_MULTI_PERSONA_ASK=true` (legacy synthesis path)
- Spoiler protection:
  1. `visibleStories` filtered by `isStoryUnlocked()` before building story catalog ✓
  2. Wiki-first retrieval (`ask-retrieval.ts`): `readerProgress` passed; `storyIsVisible()` applied per item ✓
  3. "Reader Progress Gate" block injected into every persona system prompt ✓
  4. Open threads: `listUnresolvedThroughChapter()` gates threads to current chapter ✓
  5. Journey beats in orchestrator: **NOT gated (⚠️ FIX-038 P1)** — `listBeatsByJourney()` in `buildPromptArgs` returns all beats; sliced without progress filter
  6. Journey story summaries: **NOT gated (⚠️ FIX-039 P2)** — `getJourneyContextForPrompt` injects all journey `storyIds` summaries; fix in FIXPLAN-FIX-039
  7. **`storySlug` NOT validated against reader progress (⚠️ FIX-036 P0)** — story body + mission logs for any chapter injectable
  8. **Character arc context: NOT progress-filtered (⚠️ FIX-042 P1)** — `getCharacterArcContext()` still injects Unresolved Tensions + Future Questions for all 9 arcs. These fields survive the Run 16 orchestrator rewrite unchanged.
- Character arc AI context: `getCharacterArcContext()` in `prompts.ts` (lines 171–200) → injected by `sharedContentBlock()` in `perspectives.ts`. Injects Starting State, Unresolved Tensions, Future Questions, and ASK Guidance per character. **⚠️ FIX-042 P1**: Unresolved Tensions + Future Questions leak arc endpoints without progress filter.
- Dead `storyContextRaw` DB fetch: **RESOLVED (FIX-040)** — removed in commit `3ffc33c`. New orchestrator uses wiki-first context pack instead of filesystem + DB round-trip.
- Ask verifier: post-processes responses; checks story links against `isStoryUnlocked`, wiki links against filesystem, off-chapter entity links against chapter tags. Controlled by `ASK_VERIFIER_STRICTNESS` env (`off|warn|fail`, default `warn`). **At default `warn`, verifier NEVER blocks responses** — only `fail` strictness blocks.
- Chapter tags (`chapter_tags.json`): AI-generated per-chapter entity list + summary. **All 17 chapters still have `reviewed: false`** — `StoryDetailsDisclosure` shows the summary without checking this flag (⚠️ IDEA-032 planned).
- Mission timeline: `getMissionTimelineContext()` injects compact chapter→Mission Day/date index into all persona prompts.
- Mission logs: `getMissionLogsForChapter(storySlug)` injects chapter-specific log bodies — gated only by `storySlug` presence, not reader progress (**part of FIX-036**).
- Rules context: `getRulesContext()` with 60 000-char budget cap (25 rules injected into all prompts)
- AI ledger: all Anthropic calls recorded in `cel_ai_interactions`
- **Gap:** `content/voice.md` and `content/decision-frameworks.md` are stub placeholders

### Visuals Pipeline (NEW — Run 16)

- **Corpus-grounded visual prompt synthesis**: `src/lib/visuals/` — 11 modules
  - `corpus-context.ts` — builds wiki-first context from entity/story/scene (reuses Ask retriever)
  - `synthesize-prompt.ts` — calls `visual_director` persona (Sonnet) to produce structured `VisualPrompt`
  - `hash.ts` + `corpus-version.ts` — deterministic seed hash for prompt caching
  - `generate-asset.ts` — orchestrates Imagen 4 / Runway Gen-4 generation + storage
  - `extract-vision.ts` — vision fingerprint extracted from reference uploads
  - `continuity.ts` — cross-style identity continuity via approved-asset anchors
  - `style-presets.ts` — 4 presets: `cinematic_canon`, `painterly_lore`, `noir_intimate`, `mythic_wide`
  - `providers/`: `imagen.ts`, `runway.ts`, `index.ts`, `types.ts`
  - `list-entity-assets.ts` — fetches approved + reference assets for entity pages (uses admin client, bypasses RLS)
- **API routes**: 6 new at `/api/visuals/` — all mutation routes use `requireKeith()` (**⚠️ FIX-043**)
- **Admin console**: `src/app/profile/admin/visuals/VisualsAdminConsole.tsx` (459 lines) + page
- **Gallery component**: `src/components/visuals/EntityVisualsGallery.tsx` — rendered on character, artifact, location, faction, vault detail pages via `FictionEntityDetailPage`
- **New tables**: `cel_visual_prompts`, `cel_visual_assets` (migration 035); `vision_fingerprint` column added (migration 037)
- **Spoiler note**: Visual images on entity pages are decorative and don't expose narrative text. Gallery shows approved/reference assets only; `listEntityVisuals` filters to `approved=true OR provider=manual_upload`. No chapter gating on gallery (entity description already visible; images add no new narrative spoiler). Author-only generation/management is currently broken for `role='author'` accounts (FIX-043, FIX-044).
- **Lint**: 4 new warnings (`<img>` tags in `VisualsAdminConsole.tsx` lines 226/374 and `EntityVisualsGallery.tsx` lines 64/118) — these are warnings, not errors.

### Content Pipeline (brain_lab/ + scripts/)

- Python pipeline for EPUB ingest + entity extraction
- `brain_lab/out/review-queue.md`: **8 character files** still marked `reviewed: false` (down from 9 — one entry resolved in commit `724d66b`)
- **Run 15 additions:**
  - `content/wiki/arcs/characters/` — 9 arc ledger files + template (manually authored, not generated; no `<!-- generated:ingest -->` marker)
  - `docs/celestial/ask-answer-playbooks.md` — question-type → context-source matrix for Ask quality
  - `docs/celestial/publishing-and-launch-plan.md` — launch timeline/checklist (new)
  - `docs/continuity/character-arc-review.md` — arc review rubric
- **Run 12 scripts** (unchanged): `ingest-bible-rules.ts`, `tag-chapter-entities.ts` (updated in Run 15 commit), `enrich-artifact-dossier.ts`
- `scripts/tag-chapter-entities.ts` updated (+75 lines in Run 15) — `chapter_tags.json` regenerated; all 17 chapters still `reviewed: false`
- Existing audit scripts: `scripts/audit-canon-namespaces.ts`, `scripts/audit-policies-from-migrations.mjs`, `scripts/patch-location-supersets.ts`, `scripts/retier-characters.ts`
- Canon inventory: `content/raw/canon_entities.json` + `content/raw/canon_inventory.json` + `content/raw/lore_inventory.json`
- `content/raw/mission_logs_inventory.json` — updated in Run 15 commit (+72 lines)

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

- **Build:** PASSES — clean, ~106 routes (+1 admin visuals page, +6 visuals API routes). 1 expected Turbopack NFT warning on `prompts.ts` filesystem reads.
- **Lint:** PASSES — 0 errors, **4 warnings** (`<img>` tags in visuals components — `VisualsAdminConsole.tsx` lines 226/374, `EntityVisualsGallery.tsx` lines 64/118). New since Run 15.
- **Tests:** **191 total / 188 PASS / 3 FAIL** (Run 16: +13 new tests from wiki-first retrieval implementation — `ask-context.test.ts`, `ask-evidence.test.ts`, `ask-intent.test.ts`, `orchestrator-routing.test.ts`, `ask-retrieval.test.ts`; all 13 pass). Same 3 failures as Run 15:
  - Test 127 (`every location has Superset: or is on root allow-list`) → FIX-037 (andes-glacial-lake)
  - Test 128 (`all parables carry Status in Lore metadata`) → FIX-034
  - Test 131 (`wiki: location Superset: line matches canon parent when canon has one`) → FIX-037

## Known Issues (See FIXES.md)

- **FIX-044 (Medium — NEW Run 16):** Migration 035 RLS policies on `cel_visual_prompts` + `cel_visual_assets` check `role = 'keith'` — author accounts blocked at DB layer. Fix: new migration **039**.
- **FIX-043 (Medium-High — NEW Run 16):** All 5 visuals mutation API routes + admin console page use `requireKeith()` with `["admin", "keith"]` — author accounts get 403 from entire visuals system.
- **FIX-041 (P0 — Run 15):** `/arcs` and `/arcs/[slug]` pages expose full arc spoilers to any authenticated reader — zero auth gate.
- **FIX-036 (P0):** `storySlug` not validated in Ask API — locked chapter body + mission logs injectable
- **FIX-032 (P0):** BeatTimeline on journey pages shows locked chapter content
- **FIX-042 (P1 — Run 15):** `getCharacterArcContext()` still injects Unresolved Tensions + Future Questions into ALL Ask prompts (unresolvedTensions + futureQuestions in prompts.ts lines ~181–184)
- **FIX-038 (P1):** Journey beats in orchestrator not filtered by reader progress — `journeyBeats` sliced without progress filter in new orchestrator (line ~300 in orchestrator.ts)
- **FIX-039 (P2):** `getJourneyContextForPrompt` injects all journey story summaries without reader progress gate
- **FIX-037 (Low — test failure):** `andes-glacial-lake.md` missing `**Superset:**` → tests 127 + 131 fail
- **FIX-034 (Low — test failure):** `parables-of-resonance.md` missing `**Status:**` → test 128 fails
- **FIX-035 (P1):** Vault detail pages show story IDs from locked chapters
- **FIX-031 (P1):** Fiction entity detail pages (factions/locations/artifacts) show future chapter IDs
- **FIX-030 (Medium):** `/api/admin/threads` checks `'keith'` role
- FIX-027 (Medium): `/api/admin/ai-activity` checks `'keith'` role
- FIX-026 (Medium): RLS policies in migrations 025–028 check `role = 'keith'` — fix requires migration **039**
- FIX-028 (Low): Legacy "Keith" UI copy in 45+ locations across 20+ src/ files
- FIX-029 (Low-Medium): Age mode system exposed in UI (adult fiction only)
- FIX-013, FIX-014, FIX-016, FIX-017: Tell pipeline defensive coding

## Next Actions (Priority Order)

1. **FIX-043 + FIX-044 (20 min combined):** Fix `requireKeith()` → `["admin", "author"]` in 5 visuals routes + admin page (10 min); create migration 039 for RLS fix (10 min). Entire visuals system broken for authors.
2. **FIX-041 (P0, 15 min):** Gate `/arcs` and `/arcs/[slug]` with `hasAuthorSpecialAccess()`. Remove arc panel link from character page for non-authors. Three-file change.
3. **FIX-036 (P0, 10 min):** Add `isStoryUnlocked` gate to `storySlug` in `/api/ask/route.ts`.
4. **FIX-032 (P0, 15 min):** Filter beats by reader progress in `journeys/[slug]/page.tsx`.
5. **FIX-042 (P1, 5 min):** Remove `unresolvedTensions` + `futureQuestions` from `getCharacterArcContext()` in `prompts.ts`. Two-line deletion.
6. **FIX-038 (P1, 5 min):** Add progress filter to `journeyBeats` in `orchestrator.ts buildPromptArgs` — one filter chain before the slice.
7. **FIX-037 (5 min):** Add `**Superset:** [[earth]]` to `andes-glacial-lake.md` — restores tests 127 + 131.
8. **FIX-034 (5 min):** Fix `parables-of-resonance.md` Lore metadata — restores test 128.
9. **FIX-039 (P2, 20 min):** Add `readerProgress` param to `getJourneyContextForPrompt`; update call site.
10. **IDEA-034 (30 min):** Chapter progress bar on `/stories` — dev plan written and ready.
11. **IDEA-030 (45 min):** Ask evidence citation chips — dev plan written. Phase 1 is a 20-line JSX insertion.
12. **IDEA-032 (45 min):** Chapter tag quality gate + review CLI — Phase 1 is 1-line fix in `StoryDetailsDisclosure`.
13. **FIX-031 + FIX-035 (40 min combined):** Gate story IDs on fiction entity + vault detail pages.
14. **FIX-026 + FIX-027 + FIX-030 (30 min combined):** Three stale `'keith'` role fixes.
15. **FIX-028 (30 min + author copy decisions):** Legacy Keith UI sweep.
16. **FIX-029 (1 hr):** Remove AgeModeSwitcher from Nav/Header.
