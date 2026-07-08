-- Pinellas Run Club — points ledger, member stats, badges
-- Depends on: 00002 (profiles)
-- All three "ledger" tables here are protected: client INSERT/UPDATE is
-- denied by RLS; writes happen only through SECURITY DEFINER RPCs.

create table if not exists public.points_ledger (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  action_type text not null,
  points integer not null,
  related_entity_type text,
  related_entity_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists points_ledger_profile_idx on public.points_ledger(profile_id, created_at desc);
create index if not exists points_ledger_action_idx on public.points_ledger(action_type);

create table if not exists public.member_stats (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  points_total integer not null default 0,
  checkins_total integer not null default 0,
  checkins_this_week integer not null default 0,
  checkins_this_month integer not null default 0,
  events_rsvped_total integer not null default 0,
  badges_total integer not null default 0,
  current_week_streak integer not null default 0,
  longest_week_streak integer not null default 0,
  course_prs_total integer not null default 0,
  invite_approvals_total integer not null default 0,
  last_checkin_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists member_stats_points_idx on public.member_stats(points_total desc);
create index if not exists member_stats_checkins_idx on public.member_stats(checkins_total desc);

create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  description text,
  icon_name text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.member_badges (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  related_entity_type text,
  related_entity_id uuid,
  unique (profile_id, badge_id)
);

create index if not exists member_badges_profile_idx on public.member_badges(profile_id, awarded_at desc);

-- ---------------------------------------------------------------------------
-- award_points — internal only (execute revoked from clients in 00009)
-- ---------------------------------------------------------------------------
create or replace function public.award_points(
  p_profile_id uuid,
  p_action_type text,
  p_points integer,
  p_related_entity_type text default null,
  p_related_entity_id uuid default null,
  p_daily_cap integer default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today_count integer;
begin
  if p_profile_id is null or p_points = 0 then
    return;
  end if;

  if p_daily_cap is not null then
    select count(*) into v_today_count
    from public.points_ledger
    where profile_id = p_profile_id
      and action_type = p_action_type
      and created_at > now() - interval '1 day';

    if v_today_count >= p_daily_cap then
      return;
    end if;
  end if;

  insert into public.points_ledger (
    profile_id, action_type, points, related_entity_type, related_entity_id
  )
  values (
    p_profile_id, p_action_type, p_points, p_related_entity_type, p_related_entity_id
  );

  insert into public.member_stats (profile_id, points_total)
  values (p_profile_id, p_points)
  on conflict (profile_id)
  do update set
    points_total = public.member_stats.points_total + p_points,
    updated_at = now();
end;
$$;
