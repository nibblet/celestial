# STATUS — Celestial Interactive Book Companion

> Last updated: 2026-04-22 (Nightshift Run 9)

## App Summary

**Celestial** is a sci-fi interactive book companion — a reader's shell around a fiction manuscript. Readers progress through chapters (CH01–CH17), unlock wiki/lore entries as they read, and ask grounded questions of an in-world AI assistant without receiving spoilers.

**Stack:** Next.js 16.2.3 (App Router), TypeScript 5, React 19.2, Tailwind 4, Supabase, Anthropic SDK (Claude Sonnet 4), react-markdown, TipTap 3.

---

## Architecture

### Wiki-First Content

- All fiction chapters (CH01–CH17) live in `content/wiki/stories/` as markdown files
- Fiction entities: `content/wiki/characters/`, `content/wiki/factions/`, `content/wiki/locations/`, `content/wiki/artifacts/`, `content/wiki/rules/`
- Mission logs in `content/wiki/mission-logs/` (extracted from chapters)
- Compiled by `scripts/compile-wiki.ts` + `scripts/generate-static-data.ts` → `src/lib/wiki/static-data.ts`
- Voice guide: `content/voice.md` (**currently a stub placeholder**)
- Decision frameworks: `content/decision-frameworks.md` (**currently a stub placeholder**)
- Foundational lore from `content/foundational-lore/manifest.json`
- Legacy people content: `content/wiki/people/` (carried from memoir shell, now re-labeled "characters")
- NO content in DB — all content is markdown in the repo

### Database (Supabase)

- **29 migrations** (up from 20 in Run 8):
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
  - **⚠️ FIX-026**: Migrations 025–028 have RLS write policies checking `role = 'keith'` — this role no longer exists (renamed in 021). Author accounts are blocked from writing to `cel_open_threads`, `cel_chapter_scenes`, `cel_beats`.

- **Key cel_* tables:**
  - `cel_profiles` — user profiles (display_name, age, age_mode, role: admin|member|author, has_onboarded, show_all_content)
  - `cel_conversations` + `cel_messages` — Ask chat persistence
  - `cel_story_reads` — chapter read tracking; drives chapter unlock state
  - `cel_chapter_scenes` — DB mirror of scene headings for reader page + AI context
  - `cel_ai_interactions` — append-only AI call ledger (persona, tokens, cost, latency)
  - `cel_open_threads` — narrative mysteries (mystery/setup/contradiction/gap)
  - `cel_beats` — structural story beats (per act, journey, or chapter)
  - `cel_beyond_reflections` — author-side session/draft summaries
  - `cel_wiki_documents` + `cel_story_integrations` — Beyond publish pipeline (wiki mirror)
  - `cel_profile_reflections` — per-reader AI narrator reflection (24h cooldown)

- RLS enabled on all `cel_*` tables
- `withCelTablePrefix()` in `src/lib/supabase/{server,admin}.ts` transparently remaps `sb_*` → `cel_*` at query time

### Routing

**Reader-facing:**
- `/` — Home (nav cards, `AgeModeSwitcher`)
- `/stories` — Chapter library (17 CH chapters + legacy memoir + interviews; silhouette lock for unread chapters)
- `/stories/[storyId]` — Chapter detail (gated by `isStoryUnlocked`; scene TOC via `StorySceneJump`)
- `/stories/timeline` — Timeline view
- `/characters` — Character/people directory (all entries; no chapter gating applied)
- `/characters/[slug]` — Character detail (story refs filtered by reader progress)
- `/factions` — Faction index (all entries; no chapter gating)
- `/factions/[slug]` — Faction detail
- `/locations` — Location index
- `/locations/[slug]` — Location detail
- `/artifacts` — Artifact index
- `/artifacts/[slug]` — Artifact detail
- `/rules` — Rules/concepts index
- `/rules/[slug]` — Rule detail
- `/mission-logs` — Mission log index (gated by `isStoryUnlocked`)
- `/mission-logs/[logId]` — Mission log detail (gated)
- `/arcs` → alias for `/journeys` (re-export)
- `/journeys` — Arc/journey list
- `/journeys/[slug]` — Journey intro
- `/journeys/[slug]/[step]` — Journey step
- `/journeys/[slug]/complete` — Journey completion
- `/ask` — In-world AI companion (spoiler-safe; streamed; persona-routed)
- `/tell` — Story contribution workspace
- `/beyond` — Author workspace (author role only; QA + Edit + People modes)
- `/admin/drafts` — Admin draft review
- `/admin/media` — Admin media management
- `/profile` — Reader profile (reflection gallery hero)
- `/profile/questions` — Reader Q&A inbox
- `/profile/favorites` — Favorited chapters
- `/profile/highlights` — Saved passages
- `/profile/admin` — Admin corrections triage
- `/welcome` — Onboarding tour
- `/login`, `/signup`, `/auth/callback`
- `/themes`, `/themes/[slug]` — Theme browser
- `/principles`, `/principles/[slug]` — Principles browser (12 canonical, memoir-era)
- `/people`, `/people/[slug]` — Legacy people directory

**API:**
- `/api/ask` — Streaming AI companion (rate: 20/min; persona-routed)
- `/api/reader/progress` — GET/PUT reader chapter state + re-reader toggle
- `/api/admin/ai-activity` — AI ledger (admin-only; **⚠️ FIX-027**: checks `'keith'` role instead of `'author'`)
- All legacy story/tell/beyond/people/media/audio API routes carried from memoir shell

### Auth / Middleware

- Auth via `src/proxy.ts` (Next.js 16 format)
- Author routes (`/beyond`, `/api/beyond/*`) gated by `hasAuthorSpecialAccess()` — checks `role = 'author'` OR email allowlist (`AUTHOR_SPECIAL_EMAILS` env var, falls back to `KEITH_SPECIAL_EMAILS`)
- Onboarding gate in `proxy.ts` redirects non-onboarded users to `/welcome` (cookie fast-path via `cel_onboarded` cookie)
- Re-reader mode: `cel_profiles.show_all_content = true` reveals full corpus

### Chapter Gating

- **`sb_story_reads`** (proxied to `cel_story_reads`) + `celestial_ch` guest cookie → `getReaderProgress()` → `ReaderProgress` object
- `isStoryUnlocked(storyId, progress)` returns true if `chapterNumber ≤ currentChapterNumber` or `showAllContent = true`
- Applied to: story detail page, story library card (silhouette), mission logs index/detail
- **NOT applied to**: fiction entity index/detail pages (factions, artifacts, locations, rules, characters) — these entities are mostly `always_visible` per series-bible sourcing but entities with `progressive` visibilityPolicy are not gated

### AI / Ask Companion

- Multi-persona orchestrator: `src/lib/ai/orchestrator.ts`
- Router: `src/lib/ai/router.ts` — classifies question → persona plan
  - Simple → Finder (single call)
  - Deep → CelestialNarrator + Archivist + Lorekeeper (parallel) → Synthesizer
- Kill-switch: `ENABLE_DEEP_ASK=true` env var needed for deep path (default: Finder only)
- Persona registry: `src/lib/ai/personas.ts` — 6 personas (celestial_narrator, lorekeeper, archivist, finder, synthesizer, editor[placeholder])
- Prompt builders: `src/lib/ai/perspectives.ts` — persona system prompts + `sharedContentBlock()`
- Spoiler protection:
  1. `visibleStories` filtered by `isStoryUnlocked(story.storyId, readerProgress)` before building story catalog for system prompt
  2. "Reader Progress Gate" block injected into every persona system prompt: "Current chapter: CH##. Never reveal content from later chapters."
- AI ledger: `src/lib/ai/ledger.ts` — `logAiCall()` writes to `cel_ai_interactions` (fail-open)
- People context: `getPeopleContext()` injects Tier A/B character bios
- Wiki summaries from `corpus.ts` (merged filesystem + DB stories, 30s in-memory cache)
- Chapter scenes from `getScenesForChapter()` for chapter-specific context
- **Gap**: `content/voice.md` is a stub placeholder — voice guidance is template text only
- **Gap**: `content/decision-frameworks.md` is a stub placeholder

### Content Pipeline (brain_lab/)

- Python pipeline for EPUB ingest + entity extraction
- `brain_lab/out/review-queue.md`: **9 character files** still marked `reviewed: false`
  - amar-cael, aven-voss, evelyn-tran, galen-voss, jax-reyes, jonah-revas, lena-osei, marco-ruiz, thane-meric
- `brain_lab/out/entities/`: `entities.json` + `by_chapter.json`
- Chapter scene ingest: `scripts/ingest-chapter-scenes.ts` — ingests `### Scene N:` headings from chapter markdown into `cel_chapter_scenes`
- Generated files carry `<!-- generated:ingest -->`; manual edits must remove this marker

### Legacy / Carried Content (from Memoir Shell)

- `content/wiki/people/` — 58 legacy people pages (memoir subjects) — labeled as "characters" in Celestial nav
- `/stories` also includes memoir (P1_S*) and interview (IV_S*) stories from the shell
- Various UI copy still references "Keith" — see FIX-028
- Age mode system (`useAgeMode`, `AgeModeSwitcher`) still UI-exposed — see FIX-029 (adult fiction only per Celestial spec)
- 12 canonical principles in `src/config/canonical-principles.ts` — memoir-era, no direct Celestial equivalent yet

---

## Build / Test Status

- **Build:** PASSES — clean, 37 routes (no errors)
  - 1 Turbopack NFT warning: `prompts.ts` reads voice/index files at runtime (expected — filesystem reads)
- **Lint:** PASSES — 0 errors, 0 warnings
- **Tests:** 96 PASS — Node built-in test runner + tsx

## Known Issues (See FIXES.md)

- FIX-026: Stale `role = 'keith'` in RLS policies (migrations 025–028) — author write access broken
- FIX-027: `/api/admin/ai-activity` checks `'keith'` role — author blocked from AI dashboard
- FIX-028: Legacy "Keith" UI copy in multiple components (cosmetic, Phase 1 cleanup)
- FIX-029: Age mode system exposed in UI (AgeModeSwitcher in Nav/Header/Home) — adult fiction only
- FIX-013: Fenced JSON fallback in /api/tell/draft not try/catch wrapped
- FIX-014: ageMode not validated at API boundary in /api/ask
- FIX-016: Tell SSE state mutation risk (Strict Mode double-append)
- FIX-017: Multiple draft rows per Tell session
- FIX-022: Dual 013 migration prefix (low-risk naming)

## Next Actions (Priority Order)

1. **FIX-026** — New migration 030 fixes stale `role = 'keith'` RLS (30 min; unblocks author table writes)
2. **FIX-027** — 1-line fix in `/api/admin/ai-activity` (5 min; closes `'keith'` auth gap)
3. **Voice guide content** — Fill in `content/voice.md` with actual Celestial voice (author work, no code; highest Ask quality impact)
4. **Decision frameworks** — Fill in `content/decision-frameworks.md` with Celestial lore rules
5. **IDEA-023** — Explore Hub (fiction entity graph, 1.5–2 hrs)
6. **FIX-028** — Legacy Keith UI copy sweep (30 min)
7. **FIX-029** — Remove AgeModeSwitcher from UI (1 hr)
8. **FIX-013/016/017** — Defensive coding in Tell pipeline (45 min combined)
