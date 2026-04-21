# Consolidated Celestial Schema Reference

This is a human-reference snapshot of Celestial's intended Supabase namespace.
It is **not** an executable migration and should not be applied directly.

## Namespace policy

- Shared project can keep legacy `sb_*` tables for kcobb.
- Celestial runtime targets `cel_*` tables.
- Shared auth stays on `auth.users`.

## Core Celestial tables

- `cel_profiles`
- `cel_conversations`
- `cel_messages`
- `cel_story_sessions`
- `cel_story_messages`
- `cel_story_drafts`
- `cel_story_reads`
- `cel_chapter_questions`
- `cel_chapter_answers`
- `cel_story_favorites`
- `cel_story_highlights`
- `cel_story_corrections`
- `cel_story_audio`
- `cel_people`
- `cel_story_people`
- `cel_media`
- `cel_profile_reflections`
- `cel_story_integrations`
- `cel_wiki_documents`

## Migration source of truth

Use ordered files in `supabase/migrations/` as executable source-of-truth.

- `001` through `022`: original schema evolution
- `023_cel_table_namespace.sql`: creates `cel_*` tables from existing `sb_*` structure without renaming shared tables

## Operational guidance

- Keep adding new schema changes as forward-only migrations.
- Do not squash historical migrations in a shared project.
- Update this reference when new `cel_*` tables are introduced.
