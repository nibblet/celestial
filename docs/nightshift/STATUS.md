# STATUS — Keith Cobb Interactive Storybook

> Last updated: 2026-04-12 (Nightshift Run 1 — first full scan)

## App Summary

**Keith Cobb Interactive Storybook** is a private, family-only digital archive built around 39 stories from Keith Cobb's life and leadership journey. Family members (especially grandchildren and great-grandchildren) can browse stories, explore principles/themes, view a life timeline, and have AI-guided conversations ("Ask Keith") grounded in the memoir content.

**Domain:** stories.cobbcorner.com

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.3 (App Router), TypeScript 5 |
| Frontend | React 19, Tailwind CSS 4, @tailwindcss/typography |
| Content | Markdown wiki (`content/wiki/`) — pre-compiled, single source of truth |
| Database | Supabase (PostgreSQL) — auth + conversations only |
| Auth | Supabase Auth (email-based, invite-only) |
| AI Chat | Claude Sonnet 4 (`claude-sonnet-4-20250514`) via Anthropic SDK 0.88.0 |
| Content Rendering | react-markdown (used in Ask; missing from Story Detail — see FIX-003) |

## Architecture

### Wiki-First Content
- All story content lives in `content/wiki/` as markdown files
- Compiled from `content/raw/` via `scripts/compile-wiki.ts`
- Static data generated via `scripts/generate-static-data.ts` into `src/lib/wiki/static-data.ts`
- No content tables in Supabase — content is version-controlled in repo

### Database (Supabase)
- 3 tables (all prefixed `sb_`): `sb_profiles`, `sb_conversations`, `sb_messages`
- RLS enabled on all tables — policies are well-formed and cover all CRUD paths
- Single migration: `supabase/migrations/001_initial_schema.sql`
- Auto-trigger: `handle_new_sb_user()` creates `sb_profiles` row on auth signup
- `sb_profiles.role` field supports `admin | member` — not yet used for access control in app

### Routing
- `/` — Home (nav cards)
- `/stories` — Story library (search, filter by stage/theme)
- `/stories/[storyId]` — Story detail (full text, principles, quotes)
- `/themes` — Themes/Principles browser (12 themes)
- `/themes/[slug]` — Theme detail
- `/timeline` — Life timeline (grouped by decade, 32 events)
- `/ask` — Chat interface (streaming Claude responses)
- `/login` — Supabase auth
- `/api/ask` — Streaming Claude API endpoint
- `/api/conversations` — List conversations
- `/api/conversations/[id]` — Get conversation with messages

### Auth / Middleware
- Auth enforced via `src/middleware.ts` (Supabase SSR `updateSession`)
- **WARNING:** `middleware.ts` is deprecated in Next.js 16 — should be `proxy.ts` (see FIX-001)
- All routes except `/login` and `/auth/callback` require authentication
- Redirect: unauthenticated → `/login`; authenticated on `/login` → `/`

### Age Mode System
- Three modes: `young_reader` (3-10), `teen` (11-17), `adult` (18+)
- Derived from `sb_profiles.age` via `ageModeFromAge()` or set manually
- Persisted to `sb_profiles.age_mode` on every manual change
- Context provider: `src/hooks/useAgeMode.tsx` (client, wraps all pages via RootLayout)
- Currently affects: AI system prompt language/depth
- NOT yet affecting: UI copy, story presentation, suggestion chips (see IDEA-003)

### AI / Ask Keith
- System prompt built in `src/lib/ai/prompts.ts`
- Includes: voice guide, wiki index, optional current story context
- Respects age mode instructions (simple/moderate/deep)
- History: last 20 messages loaded from DB, sent to Claude each request
- Rate limiting: **not implemented** (see FIX-004)
- Stream error handling: orphaned user messages on failure (see FIX-005)

### Content Pipeline (cobb_brain_lab/)
- Standalone Python project for extracting stories from PDF memoir
- Outputs: structured JSON + markdown fed into `content/raw/`
- Wiki compiler (`scripts/compile-wiki.ts`) reads raw content, produces wiki pages
- Static data generator (`scripts/generate-static-data.ts`) produces `src/lib/wiki/static-data.ts`

## Conventions
- All Supabase tables prefixed with `sb_`
- Story IDs follow pattern: `P1_S01`, `P1_S02`, etc. (through P1_S39+)
- Theme slugs are kebab-case, matching filenames in `content/wiki/themes/`
- Wiki files are the single source of truth for content
- Server components by default; client components marked with `'use client'`
- Theme links on story pages use inline slugification: `theme.toLowerCase().replace(/\s+/g, "-")` — works correctly for all 12 existing themes

## Current State
- V1 complete: all 5 implementation phases shipped
- Build: passes with 1 deprecation warning (FIX-001)
- Lint: 2 errors in `scripts/compile-wiki.ts` (FIX-002)
- 3 total commits in repo (including Nightshift setup)
- No tests written yet
- No CI/CD pipeline configured
- No error monitoring or analytics

## Known Issues (See FIXES.md)
- FIX-001: middleware.ts deprecation
- FIX-002: lint errors in compile-wiki.ts
- FIX-003: story full text not using ReactMarkdown
- FIX-004: no rate limiting on /api/ask
- FIX-005: orphaned user messages on stream failure

## Next Actions (Priority Order)
1. **FIX-001** — Rename middleware to proxy (5 min, eliminates build warning)
2. **FIX-003** — Markdown rendering in story detail (10 min, visible UX improvement)
3. **FIX-004** — Rate limiting on /api/ask (30 min, financial safety)
4. **IDEA-001** — Guided Journeys (4-6 hours, biggest family UX value)
5. **FIX-002** — Lint errors in compile-wiki (20 min, CI hygiene)
6. **FIX-005** — Orphaned message cleanup (20 min, future-proofing)
