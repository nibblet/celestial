-- Onboarding flags on the profile. Used by src/proxy.ts to gate first-time
-- family members through /welcome, and by /profile to show a replay link.

alter table public.sb_profiles
  add column if not exists has_onboarded boolean not null default false;

alter table public.sb_profiles
  add column if not exists onboarded_at timestamptz;

-- Existing members (pre-onboarding feature) shouldn't be forced through the
-- tour retroactively. Only brand-new signups should see it.
update public.sb_profiles
  set has_onboarded = true,
      onboarded_at = coalesce(onboarded_at, updated_at, created_at)
  where has_onboarded = false;
