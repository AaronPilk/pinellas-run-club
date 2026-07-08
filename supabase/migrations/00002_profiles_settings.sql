-- Pinellas Run Club — profiles, app settings, auth helper functions
-- Depends on: 00001 (enums)

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique not null references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  username text unique,
  phone text,
  avatar_url text,
  bio text,
  instagram_handle text,
  favorite_run_spot text,
  running_level text,
  typical_pace text,
  favorite_distance text,
  interests text[] not null default '{}',
  role user_role not null default 'member',
  status user_status not null default 'pending',
  invited_by_profile_id uuid references public.profiles(id) on delete set null,
  invite_code text unique not null default lower(replace(gen_random_uuid()::text, '-', '')),
  member_number bigserial unique,
  allow_public_stats boolean not null default true,
  notification_events boolean not null default true,
  notification_perks boolean not null default true,
  notification_social boolean not null default true,
  notification_badges boolean not null default true,
  last_active_at timestamptz,
  approved_at timestamptz,
  approved_by_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists profiles_auth_user_id_idx on public.profiles(auth_user_id);
create index if not exists profiles_status_idx on public.profiles(status);
create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_invited_by_idx on public.profiles(invited_by_profile_id);
create index if not exists profiles_created_at_idx on public.profiles(created_at desc);
create index if not exists profiles_invite_code_idx on public.profiles(invite_code);

-- ---------------------------------------------------------------------------
-- App settings (single row)
-- ---------------------------------------------------------------------------
create table if not exists public.app_settings (
  id integer primary key default 1,
  require_member_approval boolean not null default false,
  default_checkin_radius_meters integer not null default 250,
  allow_late_checkin_minutes integer not null default 0,
  club_name text not null default 'Pinellas Run Club',
  club_tagline text not null default 'Better ∞ Together',
  support_email text,
  instagram_url text,
  website_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint single_settings_row check (id = 1)
);

insert into public.app_settings (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- updated_at touch trigger (shared)
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists app_settings_touch_updated_at on public.app_settings;
create trigger app_settings_touch_updated_at
before update on public.app_settings
for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Auth helper functions
-- ---------------------------------------------------------------------------
create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.profiles where auth_user_id = auth.uid() and deleted_at is null limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where auth_user_id = auth.uid()
      and role in ('admin', 'super_admin')
      and status = 'approved'
      and deleted_at is null
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where auth_user_id = auth.uid()
      and role = 'super_admin'
      and status = 'approved'
      and deleted_at is null
  );
$$;

create or replace function public.is_approved()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where auth_user_id = auth.uid()
      and status = 'approved'
      and deleted_at is null
  );
$$;

grant execute on function public.current_profile_id() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.is_approved() to authenticated;

-- ---------------------------------------------------------------------------
-- Column protection: members cannot self-escalate role/status via direct
-- profile updates (RLS allows self-update of cosmetic fields; this trigger
-- guards the sensitive columns). Runs with auth.uid() = null in service /
-- migration contexts, which are trusted and skipped.
-- ---------------------------------------------------------------------------
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new; -- service role / migrations / seed
  end if;

  if new.auth_user_id is distinct from old.auth_user_id
     or new.member_number is distinct from old.member_number
     or new.invite_code is distinct from old.invite_code then
    raise exception 'Protected profile fields cannot be changed';
  end if;

  if new.role is distinct from old.role and not public.is_super_admin() then
    raise exception 'Only super admins can change member roles';
  end if;

  if (new.status is distinct from old.status
      or new.approved_at is distinct from old.approved_at
      or new.approved_by_profile_id is distinct from old.approved_by_profile_id)
     and not public.is_admin() then
    raise exception 'Only admins can change member status';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect_columns on public.profiles;
create trigger profiles_protect_columns
before update on public.profiles
for each row execute function public.protect_profile_columns();
