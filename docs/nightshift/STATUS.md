# STATUS — Celestial Interactive Book Companion

> Last updated: 2026-04-22 (Nightshift Run 10)

## App Summary

**Celestial** is a sci-fi interactive book companion — a reader's shell around a fiction manuscript. Readers progress through chapters (CH01–CH17), unlock wiki/lore entities as they read, and ask grounded questions of an in-world AI assistant without receiving spoilers.

**Stack:** Next.js 16.2.3 (App Router), TypeScript 5, React 19.2, Tailwind 4, Supabase, Anthropic SDK (Claude Sonnet 4), react-markdown, TipTap 3.

---

## Architecture

### Wiki-First Content

- All fiction chapters (CH01–CH17) live in `content/wiki/stories/` as markdown files
- Fiction entities: `content/wiki/characters/`, `content/wiki/factions/`, `content/wiki/locations/`, `content/wiki/artifacts/`, `content/wiki/rules/`
- Mission logs in `content/wiki/mission-logs/` (extracted from chapters)
- **14 rules** in `content/wiki/rules/` (up from 3 in Run 9 — canon-seeded via Phase G)
- Compiled by `scripts/compile-wiki.ts` + `scripts/generate-static-data.ts` → `src/lib/wiki/static-data.ts`
- Canon dossier blocks (`<!-- canon:dossier ... --> ... <!-- canon:end -->`) seeded by `scripts/seed-canon-entities.ts` — parsed by `src/lib/wiki/canon-dossier.ts`
- Continuity snapshots: `content/raw/.continuity/last-snapshot.json` — updated by `scripts/review-ingestion.ts` (Phase G)
- Canon inventory: `content/raw/canon_entities.json`, `content/raw/canon_inventory.json`, `content/raw/lore_inventory.json`
- Voice guide: `content/voice.md` (**currently a stub placeholder**)
- Decision frameworks: `content/decision-frameworks.md` (**currently a stub placeholder**)
- Foundational lore from `content/foundational-lore/manifest.json`
- Legacy people content: `content/wiki/people/` (58 entries carried from memoir shell)
- NO content in DB — all content is markdown in the repo

### Database (Supabase)

- **29 migrations** (no new since Run 9):
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
  - **⚠️ FIX-026**: Migrations 025–028 have RLS write policies checking `role = 'keith'` — this role no longer exists. Author accounts blocked from writing to `cel_open_threads`, `cel_chapter_scenes`, `cel_beats`. Fix: new migration 030.

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
- `/rules` — Rules/concepts index (14 entries)
- `/rules/[slug]` — Rule detail
- `/mission-logs` — Mission log index (gated)
- `/mission-logs/[logId]` — Mission log detail (gated)
- `/arcs` → alias for `/journeys`
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

**Total routes: 93** (up from 37 in Run 9; build confirms all dynamic ƒ)

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
- **Gap:** Rules (`content/wiki/rules/`) are not in the Ask system prompt — IDEA-025 addresses this

### Content Pipeline (brain_lab/ + scripts/)

- Python pipeline for EPUB ingest + entity extraction
- `brain_lab/out/review-queue.md`: **9 character files** still marked `reviewed: false`
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

- **Build:** PASSES — clean, 93 routes (up from 37 in Run 9). 1 expected Turbopack NFT warning on `prompts.ts` filesystem reads.
- **Lint:** PASSES — 0 errors, 0 warnings
- **Tests:** 147 PASS (up from 96 in Run 9). New test files: `canon-dossier.test.ts`, `continuity-diff.test.ts`, `beats/repo.test.ts`, `threads/repo.test.ts`, `session-wrap.test.ts`, `reflections.test.ts`.

## Known Issues (See FIXES.md)

- **FIX-032 (P0):** BeatTimeline on journey pages shows locked chapter content — 3-line fix in `journeys/[slug]/page.tsx`
- **FIX-031 (P1):** Fiction entity detail pages (factions/locations/artifacts) show future chapter IDs without gating
- **FIX-030 (Medium):** `/api/admin/threads` checks `'keith'` role — author blocked from threads API
- FIX-027 (Medium): `/api/admin/ai-activity` checks `'keith'` role
- FIX-026 (Medium): RLS policies in migrations 025–028 check `role = 'keith'`
- FIX-028 (Low): Legacy "Keith" UI copy in 14+ files including Phase E-H additions
- FIX-029 (Low-Medium): Age mode system exposed in UI (adult fiction only)
- FIX-013, FIX-014, FIX-016, FIX-017: Tell pipeline defensive coding

## Next Actions (Priority Order)

1. **FIX-032** — Fix BeatTimeline P0 gating (15 min; 3-line change in `journeys/[slug]/page.tsx`)
2. **FIX-031** — Fix fiction entity story ID gating (30 min; `FictionEntityViews.tsx` + 3 page files)
3. **FIX-026 + FIX-027 + FIX-030** — Three stale 'keith' role fixes (30 min combined): new migration 030 + 2 one-line API route changes
4. **IDEA-025** — Wire rules into Ask (35 min; `prompts.ts` + `perspectives.ts`)
5. **Voice guide content** — Fill in `content/voice.md` (author work, no code)
6. **FIX-028** — Legacy Keith UI copy sweep (30 min + Paul copy decisions)
7. **FIX-029** — Remove AgeModeSwitcher from UI (1 hr)
8. **IDEA-029** — Reader Arc Progress (1.25 hrs; requires FIX-032 first)
9. **IDEA-023** — Explore Hub (2.5 hrs)
