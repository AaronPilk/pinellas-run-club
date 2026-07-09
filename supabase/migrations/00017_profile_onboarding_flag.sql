-- Pinellas Run Club — profile onboarding flag
-- New members previously only saw "Complete Profile" during the brief
-- profile===null window after signup, so auto-approve skipped them straight to
-- the feed. This flag lets the app show onboarding until the member saves or
-- skips it. Depends on: 00002 (profiles).

alter table public.profiles
  add column if not exists profile_completed_at timestamptz;

-- Backfill existing members so ONLY new signups see onboarding.
update public.profiles
set profile_completed_at = coalesce(profile_completed_at, created_at)
where profile_completed_at is null;
