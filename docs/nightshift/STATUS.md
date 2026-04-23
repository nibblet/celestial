# STATUS — Celestial Interactive Book Companion

> Last updated: 2026-04-23 (Nightshift Run 11)

## App Summary

**Celestial** is a sci-fi interactive book companion — a reader's shell around a fiction manuscript. Readers progress through chapters (CH01–CH17), unlock wiki/lore entities as they read, and ask grounded questions of an in-world AI assistant without receiving spoilers.

**Stack:** Next.js 16.2.3 (App Router), TypeScript 5, React 19.2, Tailwind 4, Supabase, Anthropic SDK (Claude Sonnet 4), react-markdown, TipTap 3.

---

## Architecture

### Wiki-First Content

- All fiction chapters (CH01–CH17) live in `content/wiki/stories/` as markdown files
- Fiction entities: `content/wiki/characters/`, `content/wiki/factions/`, `content/wiki/locations/`, `content/wiki/artifacts/`, `content/wiki/rules/`
- Mission logs in `content/wiki/mission-logs/` (extracted from chapters)
- **16 rules** in `content/wiki/rules/` (Run 11 added `mirror-logic.md`, `the-second-convergence.md`)
- Compiled by `scripts/compile-wiki.ts` + `scripts/generate-static-data.ts` → `src/lib/wiki/static-data.ts`
- Canon dossier blocks (`<!-- canon:dossier ... --> ... <!-- canon:end -->`) seeded by `scripts/seed-canon-entities.ts` — parsed by `src/lib/wiki/canon-dossier.ts`
- Continuity snapshots: `content/raw/.continuity/last-snapshot.json` — updated by `scripts/review-ingestion.ts` (Phase G)
- Canon inventory: `content/raw/canon_entities.json`, `content/raw/canon_inventory.json`, `content/raw/lore_inventory.json`
- **10 vault entities** in `content/wiki/vaults/` (new directory, Run 11 — giza-vault, vault-002 through vault-010)
- ⚠️ **Duplicate vault files** in `artifacts/`: giza-vault.md, vault-002.md, vault-003.md, vault-006.md exist in both `artifacts/` and `vaults/` — content audit pending (see FIX-033 note)
- `content/wiki/characters/tiers.override.yaml` — character tier overrides (Run 11)
- Voice guide: `content/voice.md` (**currently a stub placeholder**)
- Decision frameworks: `content/decision-frameworks.md` (**currently a stub placeholder**)
- Foundational lore from `content/foundational-lore/manifest.json`
- Legacy people content: `content/wiki/people/` (58 entries carried from memoir shell)
- NO content in DB — all content is markdown in the repo

### Database (Supabase)

- **34 migrations** (5 new in Run 11: 030–034):
  - `001–020`: original schema (carried from memoir shell — sb_* namespace)
  - `021_author_role.sql` — renames profile role `'keith'` → `'author'`
  - `022_reader_show_all_content.sql` — adds `show_all_content` boolean to `sb_profiles`
  - `023_cel_table_namespace.sql` — creates `cel_*` tables cloned from `sb_*`; TS code proxied via `withCelTablePrefix()`
  - `024_story_reads_delete_policy.sql` — reader can delete own reads
  - `025_ai_interactions.sql` — `cel_ai_interactions` ledger (all Anthropic calls)
  - `026_open_threads.sql` — `cel_open_threads` (narrative mysteries/setups)
  - `027_chapter_scenes.sql` — `cel_chapter_scenes` (DB mirror of `### Scene N:` headings)
  - `028_beats.sql` — `cel_beats` (structural beats per act, journey, or chapter)
  - `029_beyond_reflections.sql` — `cel_beyond_reflections` (author session-wrap summaries)
  - `030_ask_message_evidence.sql` — adds `evidence` jsonb column to `cel_messages` and `sb_messages`
  - `031_cel_messages_evidence_repair.sql` — defensive repair if `cel_messages` was missing
  - `032_cel_story_reads_delete_policy.sql` — reader can delete own `cel_story_reads`
  - `033_cel_conversations_messages_rls.sql` — full RLS policies for `cel_conversations` + `cel_messages` (since `LIKE INCLUDING ALL` doesn't copy policies)
  - `034_cel_ai_interactions_insert_policy.sql` — INSERT policy for `cel_ai_interactions` (was missing; blocked ledger writes)
  - **⚠️ FIX-026**: Migrations 025–028 still have RLS write policies checking `role = 'keith'`. Fix: new migration **035** (030–034 were used by other features).

- **Key cel_* tables:**
  - `cel_profiles` — user profiles (display_name, role: admin|member|author, show_all_content)
  - `cel_conversations` + `cel_messages` — Ask chat persistence
  - `cel_story_reads` — chapter read tracking; drives chapter unlock state
  - `cel_chapter_scenes` — DB mirror of scene headings for reader page + AI context
  - `cel_ai_interactions` — append-only AI call ledger (persona, tokens, cost, latency)
  - `cel_open_threads` — narrative mysteries (mystery/setup/contradiction/gap) — no rows yet; author must seed
  - `cel_beats` — structural story beats (seeded for `directive-14` journey via `npm run seed:beats`)
  - `cel_beyond_reflections` — author-side session/draft summaries (session-wrap cache)
  - `cel_wiki_documents` + `cel_story_integrations` — Beyond publish pipeline (wiki mirror)
  - `cel_profile_reflections` — per-reader AI narrator reflection (24h cooldown)

- RLS enabled on all `cel_*` tables
- `withCelTablePrefix()` transparently remaps `sb_*` → `cel_*` at query time

### Routing

**Reader-facing:**
- `/` — Home (nav cards, `AgeModeSwitcher`)
- `/stories` — Chapter library (17 CH chapters + legacy memoir + interviews; silhouette lock for unread chapters)
- `/stories/[storyId]` — Chapter detail (gated by `isStoryUnlocked`; scene TOC via `StorySceneJump`)
- `/stories/timeline` — Timeline view
- `/characters` — Character directory (all entries)
- `/characters/[slug]` — Character detail (story refs filtered by reader progress ✓)
- `/factions` — Faction index (all entries)
- `/factions/[slug]` — Faction detail (**⚠️ FIX-031**: story IDs not gated by progress)
- `/locations` — Location index
- `/locations/[slug]` — Location detail (**⚠️ FIX-031**: story IDs not gated)
- `/artifacts` — Artifact index
- `/artifacts/[slug]` — Artifact detail (**⚠️ FIX-031**: story IDs not gated)
- `/rules` — Rules/concepts index (16 entries)
- `/rules/[slug]` — Rule detail
- `/vaults` — Vault index (10 vault entities — new Run 11)
- `/vaults/[slug]` — Vault detail (**⚠️ FIX-035**: story IDs not gated — same gap as FIX-031)
- `/mission-logs` — Mission log index (gated)
- `/mission-logs/[logId]` — Mission log detail (gated)
- `/arcs` — Coming-soon placeholder ("Arc-based exploration not yet published in this release")
- `/arcs/[slug]`, `/arcs/[slug]/[step]`, `/arcs/[slug]/complete`, `/arcs/[slug]/narrated` — route stubs (redirect/aliases)
- `/journeys` — Arc/journey list
- `/journeys/[slug]` — Journey intro (BeatTimeline) (**⚠️ FIX-032 P0**: beats not gated by reader progress)
- `/journeys/[slug]/[step]` — Journey step
- `/journeys/[slug]/complete` — Journey completion
- `/ask` — In-world AI companion (spoiler-safe; streamed; persona-routed)
- `/tell` — Story contribution workspace
- `/beyond` — Author workspace (author role only; session-wrap card; QA + Edit + People modes)
- `/admin/drafts` — Admin draft review
- `/admin/media` — Admin media management
- `/profile` — Reader profile (reflection gallery hero)
- `/profile/questions`, `/profile/favorites`, `/profile/highlights`, `/profile/admin`
- `/welcome` — Onboarding tour
- `/login`, `/signup`, `/auth/callback`
- `/themes`, `/themes/[slug]`, `/principles`, `/principles/[slug]`
- `/people`, `/people/[slug]`

**API:**
- `/api/ask` — Streaming AI companion (rate: 20/min; persona-routed)
- `/api/reader/progress` — GET/PUT reader chapter state + re-reader toggle
- `/api/admin/ai-activity` — AI ledger (**⚠️ FIX-027**: checks `'keith'` role)
- `/api/admin/threads` — Open threads CRUD (**⚠️ FIX-030**: checks `'keith'` role)
- All legacy story/tell/beyond/people/media/audio API routes

**Total routes: 95** (up from 93 in Run 10; +/vaults + /vaults/[slug])

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
- **⚠️ NOT applied (FIX-035):** vault detail pages — same gap as FIX-031, new entity type
- **⚠️ NOT applied (FIX-032 P0):** BeatTimeline on journey pages — beat content from locked chapters visible

### AI / Ask Companion

- Multi-persona orchestrator: `src/lib/ai/orchestrator.ts`
- Router: `src/lib/ai/router.ts` — classifies question → persona plan
- Personas: celestial_narrator, lorekeeper, archivist, finder, synthesizer, editor[placeholder]
- Kill-switch: `ENABLE_DEEP_ASK=true` env var (default: Finder only)
- Spoiler protection:
  1. `visibleStories` filtered by `isStoryUnlocked()` before building story catalog
  2. "Reader Progress Gate" block injected into every persona system prompt
  3. Open threads: `listUnresolvedThroughChapter()` gates threads to current chapter ✓
  4. Journey beats: passed only when `journeySlug` is set, filtered to published-only (but NOT gated by reader progress in the prompt — the beat context is injected unfiltered)
- **Gap:** beats in Ask context (`sharedContentBlock`) are not filtered by reader progress — same issue as FIX-032 but in the Ask path
- AI ledger: all Anthropic calls recorded in `cel_ai_interactions`
- Beyond session-wrap: `src/lib/beyond/session-wrap.ts` + reflection cache (`src/lib/ai/reflections.ts`)
- **Gap:** `content/voice.md` and `content/decision-frameworks.md` are stub placeholders
- **SHIPPED (IDEA-025):** `getRulesContext()` added to `prompts.ts`, injected into `sharedContentBlock()` in `perspectives.ts` — 16 rules now in every Ask system prompt
- **New (Run 11):** `ask-evidence.ts` + `ask-verifier.ts` — structured evidence schema, in-answer link extraction, spoiler-safe citation verifier (checks `isStoryUnlocked` for story links in answers). Controlled by `ASK_VERIFIER_STRICTNESS` env (`off|warn|fail`, default `warn`).
- **New (Run 11):** Ask page has Fast/Deep mode toggle (localStorage-persisted), evidence panel shows context sources + verification issues + links in answer.

### Content Pipeline (brain_lab/ + scripts/)

- Python pipeline for EPUB ingest + entity extraction
- `brain_lab/out/review-queue.md`: **9 character files** still marked `reviewed: false` (unchanged from Run 9–10)
- New audit scripts (Run 11): `scripts/audit-canon-namespaces.ts`, `scripts/audit-policies-from-migrations.mjs`, `scripts/audit-sb-cel-rls.sql`, `scripts/patch-location-supersets.ts`, `scripts/retier-characters.ts`
- Phase G: `scripts/review-ingestion.ts` — CLI for snapshot diff + continuity review
- Phase H: `scripts/inventory-canon.ts`, `scripts/merge-canon-inventory.ts`, `scripts/seed-canon-entities.ts` — canon entity seeding from lore sources
- Canon inventory: `content/raw/canon_entities.json` + `content/raw/canon_inventory.json` + `content/raw/lore_inventory.json` — built by `npm run inventory:canon` + `npm run merge:canon`
- Continuity diff module: `src/lib/wiki/continuity-diff.ts` — pure TypeScript, snapshot-based contradiction detection (alias_moved, entity_vanished, relation_flipped, chapter_theme_changed)
- Snapshot: `content/raw/.continuity/last-snapshot.json` — updated after each ingest run

### Beats / Open Threads Infrastructure

- `cel_beats` (migration 028) + `src/lib/beats/repo.ts` — story arc structural beats
- `cel_open_threads` (migration 026) + `src/lib/threads/repo.ts` — narrative mysteries/setups
- `BeatTimeline` component (`src/components/journeys/BeatTimeline.tsx`) — renders beats on journey pages
- `listUnresolvedThroughChapter()` in threads/repo.ts — chapter-gated thread query for Ask orchestrator
- **directive-14 journey** seeded with 10 beats (Acts I–III, CH01–CH14) via `npm run seed:beats`
- `cel_open_threads` is currently empty — author must seed threads via admin API (after FIX-026/030 fixed)

### Legacy / Carried Content (from Memoir Shell)

- `content/wiki/people/` — 58 legacy people pages (memoir subjects)
- `/stories` also includes memoir (P1_S*) and interview (IV_S*) stories from the shell
- Age mode system (`useAgeMode`, `AgeModeSwitcher`) still UI-exposed — see FIX-029
- 12 canonical principles in `src/config/canonical-principles.ts` — memoir-era
- Various UI copy still references "Keith" — see FIX-028

---

## Build / Test Status

- **Build:** PASSES — clean, 95 routes (up from 93 in Run 10). 1 expected Turbopack NFT warning on `prompts.ts` filesystem reads.
- **Lint:** PASSES — 0 errors, 0 warnings
- **Tests:** 160 total / **158 PASS / 2 FAIL** (up from 147 in Run 10). Failing: test 108 (vault alias probe order → FIX-033), test 110 (parables Status field → FIX-034).
  New test files (Run 11): `ask-evidence.test.ts`, `ask-verifier.test.ts`, `rules-context.test.ts`, `canon-hubs.test.ts`, `corpus-rank.test.ts`, `lore-provenance.test.ts`.

## Known Issues (See FIXES.md)

- **FIX-033 (Low — test failure):** `slug-resolver.ts` PROBE_ORDER puts artifacts before vaults → `martian-resonance-vault` resolves wrong → test 108 fails. 1-line fix.
- **FIX-034 (Low — test failure + content):** `parables-of-resonance.md` Lore metadata missing `**Status:**` → test 110 fails. Content fix.
- **FIX-032 (P0):** BeatTimeline on journey pages shows locked chapter content — 3-line fix in `journeys/[slug]/page.tsx`
- **FIX-035 (P1):** Vault detail pages show story IDs from locked chapters — same gap as FIX-031
- **FIX-031 (P1):** Fiction entity detail pages (factions/locations/artifacts) show future chapter IDs without gating
- **FIX-030 (Medium):** `/api/admin/threads` checks `'keith'` role — author blocked from threads API
- FIX-027 (Medium): `/api/admin/ai-activity` checks `'keith'` role
- FIX-026 (Medium): RLS policies in migrations 025–028 check `role = 'keith'` — fix now requires migration **035**
- FIX-028 (Low): Legacy "Keith" UI copy in 14+ files
- FIX-029 (Low-Medium): Age mode system exposed in UI (adult fiction only)
- FIX-013, FIX-014, FIX-016, FIX-017: Tell pipeline defensive coding

## Next Actions (Priority Order)

1. **FIX-033** (5 min): 1-line probe order fix in `slug-resolver.ts` — unblocks test 108
2. **FIX-034** (5 min): Add `**Status:** active` to `parables-of-resonance.md` Lore metadata — unblocks test 110
3. **FIX-032** — Fix BeatTimeline P0 gating (15 min; 3-line change in `journeys/[slug]/page.tsx`)
4. **FIX-031 + FIX-035** — Fix fiction entity + vault story ID gating (40 min combined; `FictionEntityViews.tsx` + 4 page files)
5. **FIX-026 + FIX-027 + FIX-030** — Three stale 'keith' role fixes (30 min combined): new migration 035 + 2 one-line API route changes
6. **Voice guide content** — Fill in `content/voice.md` (author work, no code)
7. **IDEA-026** — Open Threads Mysteries page (1.2 hrs, after FIX-030)
8. **FIX-028** — Legacy Keith UI copy sweep (30 min + Paul copy decisions)
9. **FIX-029** — Remove AgeModeSwitcher from UI (1 hr)
10. **IDEA-029** — Reader Arc Progress (1.25 hrs; requires FIX-032 first)
11. **IDEA-023** — Explore Hub (2.5 hrs)
