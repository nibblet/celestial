# Celestial — Sci‑Fi Interactive Book Companion

Fork migration from the memoir reference app. This repo is the **fiction companion shell**: branding, ingest hooks, progress gating (later phases), and Ask/Explore flows without legacy biography content.

## Product decisions (Phase 0 — fill in as you lock choices)

| Topic | Decision |
| --- | --- |
| **Working title / brand** | **Celestial** (replace strings in `src/config/book.ts`) |
| **Manuscript source of truth** | See `book.manuscriptSourceOfTruth` in `src/config/book.ts` — must be a reproducible artifact (e.g. `content/manuscript/` in a private repo, or numbered exports). |
| **Chapter / story ID scheme** | Target **`CH01`, `CH02`, …** (documented in `book.chapterIdPatternNote`). Legacy `P1_S01`-style IDs may remain in tooling until ingest replaces them. |
| **Supabase** | Use a **new** Supabase project (do not share the memoir instance). Set project URL + anon key in `.env.local`. |
| **Anthropic** | Prefer a **separate** API key/budget from the memoir app for cost attribution. |

## Repo layout (high level)

- `src/config/book.ts` — title, author, paths to voice guide + wiki index, manuscript notes.
- `content/voice.md` — narrative voice guidance for Ask / multi-agent prompts.
- `content/decision-frameworks.md` — optional lore rules injected into prompts.
- `brain_lab/` — Python ingest pipeline (renamed from `cobb_brain_lab/`). Large generated dirs (`out/`, `sources/`, …) were removed per Phase 1; scripts remain.
- `supabase/migrations/` — database schema; `021_author_role.sql` introduces the `author` profile role (replaces legacy `keith`).

## Scripts

- `npm run dev` — Next.js dev server.
- `npm test` — Node test runner (wiki/parser and prompt tests).
- `npm run ingest:book` — Runs `brain_lab` entity extraction + wiki compile and refreshes the review queue. EPUB chapter/mission regeneration is **opt-in**: `REGENERATE_CHAPTERS_FROM_EPUB=1 npm run ingest:book` (deletes existing `CH##-*.md` story files first).
- `npm run build` — Runs `prebuild` first (`ingest:lore` + static data regeneration), then Next build.
- `npm run compile:wiki` — Wiki compiler (expects `content/wiki` when you add markdown again).
- `npx tsx scripts/generate-static-data.ts` — Regenerate `src/lib/wiki/static-data.ts` after wiki markdown exists.

## Reading experience

- **Strict chapter gating:** `CH##` chapters unlock in reading order using `sb_story_reads` plus a guest cookie fallback.
- **Silhouette locks:** unread chapters and downstream entities render as locked cards with a hint instead of full content.
- **Section-level gates:** wiki markdown can hide blocks with `<!-- unlock:CH## --> ... <!-- /unlock -->`.
- **Ask spoiler protection:** Ask filters catalog/context to unlocked chapters and adds an explicit prompt-level spoiler rule.
- **Re-reader mode:** profile toggle (`sb_profiles.show_all_content`) reveals full corpus after completion.

## Wiki curation loop

- Generated wiki entries include `<!-- generated:ingest -->` and AI draft spans.
- `brain_lab/out/review-queue.md` lists files still marked `reviewed: false`.
- Remove the generated marker from a file to take permanent manual ownership.

## Phase 1 exit criteria (this PR)

- [x] Legacy wiki/raw content and kcobb-specific assets removed from the tree paths listed in the migration plan.
- [x] Branding centralized in `src/config/book.ts`; canonical principle definitions live in `src/config/canonical-principles.ts`.
- [x] No memoir-specific names in shipped prompts under `src/lib/ai/` (prompts use `book` tokens).
- [ ] Run `npm install && npm run build` locally (external volume may slow installs) and verify auth + empty states.

## License

Private / all rights reserved unless otherwise stated by the author.
