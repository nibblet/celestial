-- IMPORTANT:
-- This migration must NOT modify kcobb's existing sb_* tables.
-- It creates Celestial-owned cel_* tables by cloning structure from sb_*.
--
-- Assumes shared project already has sb_* tables from kcobb.
-- If a source sb_* table is missing, that cel_* table is skipped.

do $$
declare
  src text;
  dst text;
begin
  for src, dst in
    values
      ('sb_profiles', 'cel_profiles'),
      ('sb_conversations', 'cel_conversations'),
      ('sb_messages', 'cel_messages'),
      ('sb_story_sessions', 'cel_story_sessions'),
      ('sb_story_messages', 'cel_story_messages'),
      ('sb_story_drafts', 'cel_story_drafts'),
      ('sb_story_reads', 'cel_story_reads'),
      ('sb_chapter_questions', 'cel_chapter_questions'),
      ('sb_chapter_answers', 'cel_chapter_answers'),
      ('sb_story_favorites', 'cel_story_favorites'),
      ('sb_story_highlights', 'cel_story_highlights'),
      ('sb_story_corrections', 'cel_story_corrections'),
      ('sb_story_audio', 'cel_story_audio'),
      ('sb_people', 'cel_people'),
      ('sb_story_people', 'cel_story_people'),
      ('sb_media', 'cel_media'),
      ('sb_profile_reflections', 'cel_profile_reflections'),
      ('sb_story_integrations', 'cel_story_integrations'),
      ('sb_wiki_documents', 'cel_wiki_documents')
  loop
    if to_regclass('public.' || src) is not null then
      execute format(
        'create table if not exists %I.%I (like %I.%I including all)',
        'public',
        dst,
        'public',
        src
      );
      execute format('alter table %I.%I enable row level security', 'public', dst);
    end if;
  end loop;
end $$;
