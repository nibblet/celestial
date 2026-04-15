-- Add 'keith' as a recognized role on sb_profiles so Keith Special Access
-- can be granted by role assignment in addition to the existing email allowlist
-- (see src/lib/auth/special-access.ts). Either mechanism grants access.

alter table public.sb_profiles
  drop constraint if exists sb_profiles_role_check;

alter table public.sb_profiles
  add constraint sb_profiles_role_check
  check (role in ('admin', 'member', 'keith'));
