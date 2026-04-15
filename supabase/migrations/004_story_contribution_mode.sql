-- Distinguish normal family tell submissions from Keith's Beyond authoring flow.

alter table public.sb_story_sessions
add column contribution_mode text not null default 'tell'
  check (contribution_mode in ('tell', 'beyond'));

alter table public.sb_story_drafts
add column contribution_mode text not null default 'tell'
  check (contribution_mode in ('tell', 'beyond'));

update public.sb_story_sessions
set contribution_mode = 'tell'
where contribution_mode is null;

update public.sb_story_drafts
set contribution_mode = 'tell'
where contribution_mode is null;
