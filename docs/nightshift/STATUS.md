# STATUS — Keith Cobb Interactive Storybook

> Last updated: 2026-04-12 (initial baseline)

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
| AI Chat | Claude Sonnet 4 via Anthropic SDK 0.88.0 |
| Content Rendering | react-markdown |

## Architecture

### Wiki-First Content
- All story content lives in `content/wiki/` as markdown files
- Compiled from `content/raw/` via `scripts/compile-wiki.ts`
- Static data generated via `scripts/generate-static-data.ts` into `src/lib/wiki/static-data.ts`
- No content tables in Supabase — content is version-controlled in repo

### Database (Supabase)
- 3 tables (all prefixed `sb_`): `sb_profiles`, `sb_conversations`, `sb_messages`
- RLS enabled on all tables
- Single migration: `supabase/migrations/001_initial_schema.sql`

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
- `/api/conversations` — CRUD conversations

### Age Mode System
- Three modes: young_reader (3-10), teen (11-17), adult (18+)
- Derived from user's age field or manually selected
- Affects AI response language/depth and UI presentation
- Context provider: `src/hooks/useAgeMode.tsx`

### Content Pipeline (cobb_brain_lab/)
- Standalone Python project for extracting stories from PDF memoir
- Scripts: split, validate, cluster, label principles/heuristics
- Outputs feed `content/raw/` which feeds the wiki compiler

## Conventions
- All Supabase tables prefixed with `sb_`
- Story IDs follow pattern: `P1_S01`, `P1_S02`, etc.
- Theme slugs are kebab-case
- Wiki files are the single source of truth for content
- Server components by default; client components marked with `'use client'`

## Current State
- V1 complete: all 5 implementation phases shipped
- 2 total commits in repo
- No tests written yet
- No CI/CD pipeline configured
- No error monitoring or analytics
