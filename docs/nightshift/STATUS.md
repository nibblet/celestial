# STATUS — Celestial Interactive Book Companion

> Last updated: 2026-04-27 (Nightshift Run 15)

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

- **34 migrations** (last: `034_cel_ai_interactions_insert_policy.sql`). Next new migration: **035**.
- **⚠️ FIX-026**: Migrations 025–028 still have RLS write policies checking `role = 'keith'`. Fix requires new migration **035**.
- See Run 11 STATUS.md for full migration list (001–034)

### Routing

**Reader-facing:**
- `/` — Home (nav cards, `AgeModeSwitcher` — ⚠️ FIX-029)
- `/stories` — Chapter library (17 CH chapters + legacy; silhouette lock for unread chapters)
- `/stories/[storyId]` — Chapter detail (gated; scene TOC; chapter tags summary + themes shown ⚠️ IDEA-032 quality gate pending)
- `/stories/timeline` — Timeline view (Run 12: `TimelineView.tsx` updated for color scheme)
- `/timeline` — **Redirect** → `/stories/timeline` (permanent)
- `/characters` — Character directory
- `/characters/[slug]` — Character detail (story refs filtered by reader progress ✓; shows `CharacterArcPanel` linking to arc detail — ⚠️ FIX-041 gap)
- `/arcs` — **New (Run 15)**: Character arc ledger index — (**⚠️ FIX-041 P0**: ungated, any reader can access)
- `/arcs/[slug]` — **New (Run 15)**: Full character arc detail with CH01–CH17 spoilers — (**⚠️ FIX-041 P0**: ungated)
- `/factions/[slug]` — Faction detail (**⚠️ FIX-031**: story IDs not gated by progress)
- `/locations/[slug]` — Location detail (**⚠️ FIX-031**: story IDs not gated)
- `/artifacts/[slug]` — Artifact detail (**⚠️ FIX-031**: story IDs not gated)
- `/rules` — Rules/concepts index (25 entries)
- `/vaults/[slug]` — Vault detail (**⚠️ FIX-035**: story IDs not gated)
- `/journeys/[slug]` — Journey intro (BeatTimeline) (**⚠️ FIX-032 P0**: beats not gated)
- `/ask` — In-world AI companion (spoiler-safe; **⚠️ FIX-036 P0**: storySlug not validated)
- All other routes per Run 11 STATUS.md

**API:**
- `/api/ask` — Streaming AI companion (**⚠️ FIX-036 P0**: storySlug bypass)
- `/api/admin/ai-activity` — AI ledger (**⚠️ FIX-027**: checks `'keith'` role)
- `/api/admin/threads` — Open threads CRUD (**⚠️ FIX-030**: checks `'keith'` role)

**Total routes: ~98** (Run 15: +2 from `/arcs` and `/arcs/[slug]`; old `/arcs/[slug]/[step]`, `/arcs/[slug]/complete`, `/arcs/[slug]/narrated` are from memoir-era journey shell)

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
- Personas: celestial_narrator, lorekeeper, archivist, finder, synthesizer, editor[placeholder]
- Kill-switch: `ENABLE_DEEP_ASK=true` env var (default: Finder only)
- Spoiler protection:
  1. `visibleStories` filtered by `isStoryUnlocked()` before building story catalog ✓
  2. "Reader Progress Gate" block injected into every persona system prompt ✓
  3. Open threads: `listUnresolvedThroughChapter()` gates threads to current chapter ✓
  4. Journey beats in orchestrator: **NOT gated (⚠️ FIX-038 P1)** — `listBeatsByJourney()` in `buildPromptArgs` returns all beats; filter added to FIXPLAN-FIX-038
  5. Journey story summaries: **NOT gated (⚠️ FIX-039 P2)** — `getJourneyContextForPrompt` injects all journey `storyIds` summaries; fix in FIXPLAN-FIX-039
  6. **`storySlug` NOT validated against reader progress (⚠️ FIX-036 P0)** — story body + mission logs for any chapter injectable
  7. **Character arc context: NOT progress-filtered (⚠️ FIX-042 P1)** — `getCharacterArcContext()` injects Unresolved Tensions + Future Questions for all 9 arcs into every prompt, containing arc-endpoint hints (CH16/CH17 events framed as open questions). Fix: remove these two sections; keep only Starting State + ASK Guidance.
- Character arc AI context: `getCharacterArcContext()` in `prompts.ts` (lines 171–200) → injected by `sharedContentBlock()` in `perspectives.ts` (line 109–110). Injects Starting State, Unresolved Tensions, Future Questions, and ASK Guidance per character. Budget cap: `CHARACTER_CONTEXT_MAX_CHARS`. **⚠️ FIX-042 P1**: Unresolved Tensions + Future Questions leak arc endpoints without progress filter.
- Ask verifier: post-processes responses; checks story links against `isStoryUnlocked`, wiki links against filesystem, off-chapter entity links against chapter tags. Controlled by `ASK_VERIFIER_STRICTNESS` env (`off|warn|fail`, default `warn`). **At default `warn`, verifier NEVER blocks responses** — only `fail` strictness blocks. The verifier is a diagnostic tool, not an active spoiler blocker.
- Chapter tags (`chapter_tags.json`): AI-generated per-chapter entity list + summary (regenerated in commit `724d66b`). **All 17 chapters still have `reviewed: false`** — `StoryDetailsDisclosure` shows the summary without checking this flag (⚠️ IDEA-032 planned).
- Mission timeline: `getMissionTimelineContext()` injects compact chapter→Mission Day/date index into all persona prompts. Prompt instruction tells model to treat future chapter rows as spoilers.
- Mission logs: `getMissionLogsForChapter(storySlug)` injects chapter-specific log bodies (up to 600 chars each) — gated only by `storySlug` presence, not reader progress (**part of FIX-036**).
- Rules context: `getRulesContext()` with 60 000-char budget cap (25 rules injected into all prompts)
- AI ledger: all Anthropic calls recorded in `cel_ai_interactions`
- **Gap:** `content/voice.md` and `content/decision-frameworks.md` are stub placeholders

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

- **Build:** PASSES — clean, ~98 routes (+2 new `/arcs` routes). 1 expected Turbopack NFT warning on `prompts.ts` filesystem reads.
- **Lint:** PASSES — 0 errors, 0 warnings
- **Tests:** **178 total / 175 PASS / 3 FAIL** (Run 15: +5 new tests from `character-arcs.test.ts`, all passing). Failing:
  - Test 114 (`every location has Superset: or is on root allow-list`) → FIX-037 (andes-glacial-lake — commit `724d66b` added 2 lines but did not add the Superset field)
  - Test 115 (`all parables carry Status in Lore metadata`) → FIX-034
  - Test 118 (`wiki: location Superset: line matches canon parent when canon has one`) → FIX-037

## Known Issues (See FIXES.md)

- **FIX-041 (P0 — NEW Run 15):** `/arcs` and `/arcs/[slug]` pages expose full character arc spoilers (CH01–CH17) to any authenticated reader — zero auth gate. Fix: add `hasAuthorSpecialAccess()` gate.
- **FIX-036 (P0):** `storySlug` not validated in Ask API — locked chapter body + mission logs injectable
- **FIX-032 (P0):** BeatTimeline on journey pages shows locked chapter content (UI path; FIX-038 = AI context path)
- **FIX-042 (P1 — NEW Run 15):** `getCharacterArcContext()` injects Unresolved Tensions + Future Questions (arc endpoint hints) into ALL Ask prompts without reader progress filter
- **FIX-038 (P1):** Journey beats in orchestrator not filtered by reader progress — `whyItMatters` from locked chapters injected into AI prompt when `journeySlug` provided
- **FIX-039 (P2):** `getJourneyContextForPrompt` injects all journey story summaries without reader progress gate
- **FIX-040 (Low-Medium):** Dead `storyContextRaw` DB fetch in `orchestrator.ts buildPromptArgs` — wasted Supabase call on every Ask with `storySlug`, result immediately discarded
- **FIX-037 (Low — test failure):** `andes-glacial-lake.md` missing `**Superset:**` → tests 114 + 118 fail (still unfixed after Run 15 commit)
- **FIX-034 (Low — test failure):** `parables-of-resonance.md` missing `**Status:**` → test 115 fails
- **FIX-035 (P1):** Vault detail pages show story IDs from locked chapters
- **FIX-031 (P1):** Fiction entity detail pages (factions/locations/artifacts) show future chapter IDs
- **FIX-030 (Medium):** `/api/admin/threads` checks `'keith'` role
- FIX-027 (Medium): `/api/admin/ai-activity` checks `'keith'` role
- FIX-026 (Medium): RLS policies in migrations 025–028 check `role = 'keith'` — fix requires migration **035**
- FIX-028 (Low): Legacy "Keith" UI copy in 45+ locations across 20+ src/ files
- FIX-029 (Low-Medium): Age mode system exposed in UI (adult fiction only)
- FIX-013, FIX-014, FIX-016, FIX-017: Tell pipeline defensive coding

## Next Actions (Priority Order)

1. **FIX-041 (P0, 15 min):** Gate `/arcs` and `/arcs/[slug]` with `hasAuthorSpecialAccess()`. Remove arc panel link from character page for non-authors. Three-file change.
2. **FIX-036 (P0, 10 min):** Add `isStoryUnlocked` gate to `storySlug` in `/api/ask/route.ts`.
3. **FIX-032 (P0, 15 min):** Filter beats by reader progress in `journeys/[slug]/page.tsx`.
4. **FIX-042 (P1, 5 min):** Remove `unresolvedTensions` + `futureQuestions` from `getCharacterArcContext()` in `prompts.ts`. Two-line deletion.
5. **FIX-038 (P1, 5 min):** Filter `journeyBeats` in `orchestrator.ts` `buildPromptArgs` — one filter chain.
6. **FIX-037 (5 min):** Add `**Superset:** [[earth]]` to `andes-glacial-lake.md` — restores 2 failing tests.
7. **FIX-034 (5 min):** Fix `parables-of-resonance.md` Lore metadata — restores test 115.
8. **FIX-040 (5 min):** Remove dead `storyContextRaw` lines from `orchestrator.ts buildPromptArgs`.
9. **FIX-039 (P2, 20 min):** Add `readerProgress` param to `getJourneyContextForPrompt`; update call site.
10. **IDEA-034 (30 min):** Chapter progress bar on `/stories` — dev plan written and ready.
11. **IDEA-032 (45 min):** Chapter tag quality gate + review CLI — Phase 1 is 1-line fix in `StoryDetailsDisclosure`.
12. **FIX-031 + FIX-035 (40 min combined):** Gate story IDs on fiction entity + vault detail pages.
13. **FIX-026 + FIX-027 + FIX-030 (30 min combined):** Three stale `'keith'` role fixes.
14. **FIX-028 (30 min + author copy decisions):** Legacy Keith UI sweep.
15. **FIX-029 (1 hr):** Remove AgeModeSwitcher from Nav/Header.
