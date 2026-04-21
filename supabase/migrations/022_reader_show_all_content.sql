alter table public.sb_profiles
  add column if not exists show_all_content boolean not null default false;
