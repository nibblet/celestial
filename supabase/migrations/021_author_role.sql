-- Rename legacy 'keith' profile role to 'author' for publisher / special-access accounts.

update public.sb_profiles
set role = 'author'
where role = 'keith';

alter table public.sb_profiles
  drop constraint if exists sb_profiles_role_check;

alter table public.sb_profiles
  add constraint sb_profiles_role_check
  check (role in ('admin', 'member', 'author'));
