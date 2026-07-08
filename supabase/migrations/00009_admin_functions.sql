-- Pinellas Run Club — RPC functions (member + admin) and grants
-- Depends on: all previous migrations (functions touch events, check-ins,
-- feed, courses, points, badges, notifications). All sensitive writes flow
-- through the SECURITY DEFINER functions in this file.

-- ===========================================================================
-- recalculate_member_stats — full recompute from source-of-truth tables,
-- including calendar-week streaks (consecutive weeks with >= 1 check-in).
-- ===========================================================================
create or replace function public.recalculate_member_stats(
  p_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_checkins_total integer := 0;
  v_checkins_week integer := 0;
  v_checkins_month integer := 0;
  v_last_checkin timestamptz;
  v_points integer := 0;
  v_badges integer := 0;
  v_rsvps integer := 0;
  v_prs integer := 0;
  v_invites integer := 0;
  v_weeks date[];
  v_current_streak integer := 0;
  v_longest_streak integer := 0;
  v_this_week date := date_trunc('week', now())::date;
  i integer;
begin
  if p_profile_id is null then
    return;
  end if;

  -- caller must be the member themself, an admin, or an internal call
  if auth.uid() is not null
     and public.current_profile_id() is distinct from p_profile_id
     and not public.is_admin() then
    raise exception 'Not allowed';
  end if;

  select count(*), max(checked_in_at)
  into v_checkins_total, v_last_checkin
  from public.event_checkins
  where profile_id = p_profile_id;

  select count(*) into v_checkins_week
  from public.event_checkins
  where profile_id = p_profile_id
    and checked_in_at >= date_trunc('week', now());

  select count(*) into v_checkins_month
  from public.event_checkins
  where profile_id = p_profile_id
    and checked_in_at >= date_trunc('month', now());

  select coalesce(sum(points), 0) into v_points
  from public.points_ledger
  where profile_id = p_profile_id;

  select count(*) into v_badges
  from public.member_badges
  where profile_id = p_profile_id;

  select count(*) into v_rsvps
  from public.event_rsvps
  where profile_id = p_profile_id and status = 'going';

  select count(distinct course_id) into v_prs
  from public.course_time_entries
  where profile_id = p_profile_id and deleted_at is null;

  select count(*) into v_invites
  from public.profiles
  where invited_by_profile_id = p_profile_id
    and status = 'approved'
    and deleted_at is null;

  -- distinct check-in weeks, newest first
  select array_agg(wk order by wk desc) into v_weeks
  from (
    select distinct date_trunc('week', checked_in_at)::date as wk
    from public.event_checkins
    where profile_id = p_profile_id
  ) s;

  if v_weeks is not null and array_length(v_weeks, 1) > 0 then
    -- longest streak: gaps-and-islands over consecutive weeks
    select coalesce(max(cnt), 0) into v_longest_streak
    from (
      select count(*) as cnt
      from (
        select wk, wk - ((row_number() over (order by wk))::int * 7) as grp
        from unnest(v_weeks) as wk
      ) g
      group by grp
    ) x;

    -- current streak: consecutive weeks ending at this week (or last week,
    -- if the member simply has not checked in yet this week)
    if v_weeks[1] = v_this_week or v_weeks[1] = v_this_week - 7 then
      v_current_streak := 1;
      for i in 2..array_length(v_weeks, 1) loop
        if v_weeks[i] = v_weeks[i - 1] - 7 then
          v_current_streak := v_current_streak + 1;
        else
          exit;
        end if;
      end loop;
    end if;
  end if;

  insert into public.member_stats (
    profile_id, points_total, checkins_total, checkins_this_week,
    checkins_this_month, events_rsvped_total, badges_total,
    current_week_streak, longest_week_streak, course_prs_total,
    invite_approvals_total, last_checkin_at, updated_at
  )
  values (
    p_profile_id, v_points, v_checkins_total, v_checkins_week,
    v_checkins_month, v_rsvps, v_badges,
    v_current_streak, v_longest_streak, v_prs,
    v_invites, v_last_checkin, now()
  )
  on conflict (profile_id)
  do update set
    points_total = excluded.points_total,
    checkins_total = excluded.checkins_total,
    checkins_this_week = excluded.checkins_this_week,
    checkins_this_month = excluded.checkins_this_month,
    events_rsvped_total = excluded.events_rsvped_total,
    badges_total = excluded.badges_total,
    current_week_streak = excluded.current_week_streak,
    longest_week_streak = excluded.longest_week_streak,
    course_prs_total = excluded.course_prs_total,
    invite_approvals_total = excluded.invite_approvals_total,
    last_checkin_at = excluded.last_checkin_at,
    updated_at = now();
end;
$$;

-- ===========================================================================
-- award_badge — internal only (clients cannot execute; see grants below)
-- ===========================================================================
create or replace function public.award_badge(
  p_profile_id uuid,
  p_badge_code text,
  p_related_entity_type text default null,
  p_related_entity_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_badge_id uuid;
begin
  select id into v_badge_id
  from public.badges
  where code = p_badge_code and active = true
  limit 1;

  if v_badge_id is null then
    return;
  end if;

  insert into public.member_badges (
    profile_id, badge_id, related_entity_type, related_entity_id
  )
  values (
    p_profile_id, v_badge_id, p_related_entity_type, p_related_entity_id
  )
  on conflict (profile_id, badge_id) do nothing;

  if found then
    insert into public.member_stats (profile_id, badges_total)
    values (p_profile_id, 1)
    on conflict (profile_id)
    do update set
      badges_total = public.member_stats.badges_total + 1,
      updated_at = now();

    insert into public.notifications (profile_id, type, title, body, related_entity_type, related_entity_id)
    select
      p_profile_id,
      'badge',
      'New Badge Earned',
      'You earned the ' || name || ' badge.',
      'badge',
      v_badge_id
    from public.badges
    where id = v_badge_id;
  end if;
end;
$$;

-- admin-facing wrapper with an explicit role check
create or replace function public.admin_award_badge(
  p_profile_id uuid,
  p_badge_code text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;
  perform public.award_badge(p_profile_id, p_badge_code, 'admin', public.current_profile_id());
end;
$$;

-- ===========================================================================
-- complete_checkin — shared internal helper used by gps / qr / admin
-- check-in paths. Records the check-in, awards points, updates streaks and
-- milestone badges. Internal only.
-- ===========================================================================
create or replace function public.complete_checkin(
  p_profile_id uuid,
  p_event_id uuid,
  p_method checkin_method,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_distance_meters numeric default null,
  p_verified_by_profile_id uuid default null,
  p_admin_note text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event record;
  v_total integer;
  v_streak integer;
  v_local_hour integer;
begin
  select * into v_event
  from public.events
  where id = p_event_id and deleted_at is null;

  if v_event.id is null then
    raise exception 'Event not found';
  end if;

  -- keep RSVP in sync
  insert into public.event_rsvps (event_id, profile_id, status)
  values (p_event_id, p_profile_id, 'going')
  on conflict (event_id, profile_id)
  do update set status = 'going', updated_at = now();

  insert into public.event_checkins (
    event_id, profile_id, method, latitude, longitude,
    distance_from_event_meters, verified, verified_by_profile_id, admin_note
  )
  values (
    p_event_id, p_profile_id, p_method, p_latitude, p_longitude,
    p_distance_meters, true, p_verified_by_profile_id, p_admin_note
  )
  on conflict (event_id, profile_id) do nothing;

  if not found then
    return false; -- already checked in
  end if;

  perform public.award_points(p_profile_id, 'event_checkin', 25, 'event', p_event_id, null);
  perform public.recalculate_member_stats(p_profile_id);

  select checkins_total, current_week_streak
  into v_total, v_streak
  from public.member_stats
  where profile_id = p_profile_id;

  -- milestone badges
  if v_total >= 1 then perform public.award_badge(p_profile_id, 'first_checkin', 'event', p_event_id); end if;
  if v_total >= 5 then perform public.award_badge(p_profile_id, 'checkins_5', 'event', p_event_id); end if;
  if v_total >= 10 then perform public.award_badge(p_profile_id, 'checkins_10', 'event', p_event_id); end if;
  if v_total >= 25 then perform public.award_badge(p_profile_id, 'checkins_25', 'event', p_event_id); end if;
  if v_total >= 50 then perform public.award_badge(p_profile_id, 'checkins_50', 'event', p_event_id); end if;
  if v_total >= 100 then perform public.award_badge(p_profile_id, 'checkins_100', 'event', p_event_id); end if;

  -- streak badge
  if v_streak >= 3 then
    perform public.award_badge(p_profile_id, 'streak_3', 'event', p_event_id);
  end if;

  -- flavor badges from event context
  v_local_hour := extract(hour from v_event.starts_at at time zone 'America/New_York')::integer;
  if v_local_hour < 7 then
    perform public.award_badge(p_profile_id, 'early_bird', 'event', p_event_id);
  elsif v_local_hour >= 19 then
    perform public.award_badge(p_profile_id, 'night_runner', 'event', p_event_id);
  end if;

  if v_event.event_type in ('social_run', 'after_party') then
    perform public.award_badge(p_profile_id, 'social_runner', 'event', p_event_id);
  elsif v_event.event_type = 'sponsor_event' then
    perform public.award_badge(p_profile_id, 'sponsor_supporter', 'event', p_event_id);
  elsif v_event.event_type = 'volunteer' then
    perform public.award_badge(p_profile_id, 'volunteer', 'event', p_event_id);
  end if;

  return true;
end;
$$;

-- ===========================================================================
-- rsvp_event — member RPC
-- ===========================================================================
create or replace function public.rsvp_event(
  p_event_id uuid,
  p_status rsvp_status default 'going'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_existing rsvp_status;
begin
  v_profile_id := public.current_profile_id();

  if v_profile_id is null or not public.is_approved() then
    raise exception 'Only approved members can RSVP';
  end if;

  if not exists (
    select 1 from public.events
    where id = p_event_id and status = 'published' and deleted_at is null
  ) then
    raise exception 'Event not found';
  end if;

  select status into v_existing
  from public.event_rsvps
  where event_id = p_event_id and profile_id = v_profile_id;

  insert into public.event_rsvps (event_id, profile_id, status)
  values (p_event_id, v_profile_id, p_status)
  on conflict (event_id, profile_id)
  do update set status = excluded.status, updated_at = now();

  if (v_existing is null or v_existing <> 'going') and p_status = 'going' then
    perform public.award_points(v_profile_id, 'event_rsvp_going', 5, 'event', p_event_id, 3);
  end if;

  perform public.recalculate_member_stats(v_profile_id);
end;
$$;

-- ===========================================================================
-- check_in_event_gps — member RPC
-- ===========================================================================
create or replace function public.check_in_event_gps(
  p_event_id uuid,
  p_latitude double precision,
  p_longitude double precision
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_event record;
  v_distance double precision;
  v_radius integer;
  v_late_minutes integer;
  v_now timestamptz := now();
begin
  v_profile_id := public.current_profile_id();

  if v_profile_id is null or not public.is_approved() then
    raise exception 'Only approved members can check in';
  end if;

  select * into v_event
  from public.events
  where id = p_event_id
    and status = 'published'
    and deleted_at is null;

  if v_event.id is null then
    raise exception 'Event not found';
  end if;

  if v_event.latitude is null or v_event.longitude is null then
    raise exception 'Event does not support GPS check-in';
  end if;

  if v_event.checkin_method not in ('gps', 'gps_or_qr') then
    raise exception 'GPS check-in is not enabled for this event';
  end if;

  if v_event.checkin_opens_at is not null and v_now < v_event.checkin_opens_at then
    raise exception 'Check-in has not opened yet';
  end if;

  select coalesce(allow_late_checkin_minutes, 0) into v_late_minutes
  from public.app_settings where id = 1;

  if v_event.checkin_closes_at is not null
     and v_now > v_event.checkin_closes_at + make_interval(mins => coalesce(v_late_minutes, 0)) then
    raise exception 'Check-in has closed';
  end if;

  v_radius := coalesce(
    v_event.checkin_radius_meters,
    (select default_checkin_radius_meters from public.app_settings where id = 1),
    250
  );

  v_distance := public.haversine_meters(
    p_latitude, p_longitude, v_event.latitude, v_event.longitude
  );

  if v_distance > v_radius then
    raise exception 'You are too far away to check in';
  end if;

  return public.complete_checkin(
    v_profile_id, p_event_id, 'gps',
    p_latitude, p_longitude, round(v_distance::numeric, 2)
  );
end;
$$;

-- ===========================================================================
-- check_in_event_qr — member RPC
-- ===========================================================================
create or replace function public.check_in_event_qr(
  p_event_id uuid,
  p_nonce text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_event record;
  v_late_minutes integer;
  v_now timestamptz := now();
begin
  v_profile_id := public.current_profile_id();

  if v_profile_id is null or not public.is_approved() then
    raise exception 'Only approved members can check in';
  end if;

  select * into v_event
  from public.events
  where id = p_event_id
    and status = 'published'
    and deleted_at is null;

  if v_event.id is null then
    raise exception 'Event not found';
  end if;

  if v_event.checkin_method not in ('qr', 'gps_or_qr') then
    raise exception 'QR check-in is not enabled for this event';
  end if;

  if v_event.qr_checkin_nonce is null or v_event.qr_checkin_nonce <> p_nonce then
    raise exception 'Invalid QR code';
  end if;

  if v_event.checkin_opens_at is not null and v_now < v_event.checkin_opens_at then
    raise exception 'Check-in has not opened yet';
  end if;

  select coalesce(allow_late_checkin_minutes, 0) into v_late_minutes
  from public.app_settings where id = 1;

  if v_event.checkin_closes_at is not null
     and v_now > v_event.checkin_closes_at + make_interval(mins => coalesce(v_late_minutes, 0)) then
    raise exception 'Check-in has closed';
  end if;

  return public.complete_checkin(v_profile_id, p_event_id, 'qr');
end;
$$;

-- ===========================================================================
-- admin_mark_checkin — admin RPC
-- ===========================================================================
create or replace function public.admin_mark_checkin(
  p_event_id uuid,
  p_profile_id uuid,
  p_note text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = p_profile_id and status = 'approved' and deleted_at is null
  ) then
    raise exception 'Member not found or not approved';
  end if;

  return public.complete_checkin(
    p_profile_id, p_event_id, 'admin_manual',
    null, null, null,
    public.current_profile_id(), p_note
  );
end;
$$;

-- ===========================================================================
-- submit_course_time — member RPC (with PR detection + suspicious flagging)
-- ===========================================================================
create or replace function public.submit_course_time(
  p_course_id uuid,
  p_run_date date,
  p_time_seconds integer,
  p_notes text default null,
  p_event_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_course record;
  v_pace integer;
  v_prev_best integer;
  v_is_pr boolean;
  v_flagged boolean := false;
  v_flag_reason text;
  v_entry_id uuid;
begin
  v_profile_id := public.current_profile_id();

  if v_profile_id is null or not public.is_approved() then
    raise exception 'Only approved members can log times';
  end if;

  select * into v_course
  from public.courses
  where id = p_course_id and active = true and deleted_at is null;

  if v_course.id is null then
    raise exception 'Course not found';
  end if;

  if p_time_seconds is null or p_time_seconds <= 0 then
    raise exception 'Time must be greater than zero';
  end if;

  if p_run_date is null or p_run_date > current_date then
    raise exception 'Run date cannot be in the future';
  end if;

  v_pace := round(p_time_seconds / v_course.distance_miles)::integer;

  -- flag times faster than 4:00/mile as suspicious
  if v_pace < 240 then
    v_flagged := true;
    v_flag_reason := 'Pace faster than 4:00/mile — needs admin review';
  end if;

  select min(time_seconds) into v_prev_best
  from public.course_time_entries
  where course_id = p_course_id
    and profile_id = v_profile_id
    and deleted_at is null;

  v_is_pr := (v_prev_best is null) or (p_time_seconds < v_prev_best);

  insert into public.course_time_entries (
    course_id, profile_id, event_id, run_date, time_seconds,
    notes, flagged, flag_reason
  )
  values (
    p_course_id, v_profile_id, p_event_id, p_run_date, p_time_seconds,
    p_notes, v_flagged, v_flag_reason
  )
  returning id into v_entry_id;

  perform public.award_points(v_profile_id, 'course_time_logged', 10, 'course', p_course_id, 3);

  if v_is_pr and not v_flagged then
    perform public.award_badge(v_profile_id, 'first_pr', 'course_time_entry', v_entry_id);

    insert into public.notifications (profile_id, type, title, body, related_entity_type, related_entity_id)
    values (
      v_profile_id,
      'system',
      'New Course PR',
      'You set a new personal record on ' || v_course.name || '.',
      'course_time_entry',
      v_entry_id
    );
  end if;

  -- 5K finisher badge (course between 3.0 and 3.2 miles)
  if v_course.distance_miles >= 3.0 and v_course.distance_miles <= 3.2 then
    perform public.award_badge(v_profile_id, 'five_k_finisher', 'course', p_course_id);
  end if;

  perform public.recalculate_member_stats(v_profile_id);

  return v_entry_id;
end;
$$;

-- ===========================================================================
-- verify_course_time — admin RPC
-- ===========================================================================
create or replace function public.verify_course_time(
  p_entry_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry record;
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;

  update public.course_time_entries
  set verified = true,
      verified_by_profile_id = public.current_profile_id(),
      flagged = false,
      flag_reason = null,
      updated_at = now()
  where id = p_entry_id and deleted_at is null
  returning * into v_entry;

  if v_entry.id is null then
    raise exception 'Entry not found';
  end if;

  insert into public.notifications (profile_id, type, title, body, related_entity_type, related_entity_id)
  values (
    v_entry.profile_id,
    'system',
    'Time Verified',
    'An admin verified your course time.',
    'course_time_entry',
    v_entry.id
  );
end;
$$;

-- ===========================================================================
-- create_member_pass — self or admin
-- ===========================================================================
create or replace function public.create_member_pass(
  p_profile_id uuid default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target uuid;
  v_pass_id text;
begin
  v_target := coalesce(p_profile_id, public.current_profile_id());

  if v_target is null then
    raise exception 'No profile';
  end if;

  if v_target is distinct from public.current_profile_id() and not public.is_admin() then
    raise exception 'Not allowed';
  end if;

  if not public.is_approved() and not public.is_admin() then
    raise exception 'Only approved members get a pass';
  end if;

  insert into public.member_passes (profile_id)
  values (v_target)
  on conflict (profile_id) do nothing;

  select public_pass_id into v_pass_id
  from public.member_passes
  where profile_id = v_target;

  return v_pass_id;
end;
$$;

-- ===========================================================================
-- Member lifecycle (admin RPCs)
-- ===========================================================================
create or replace function public.approve_member(
  p_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inviter_id uuid;
  v_invite_count integer;
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;

  update public.profiles
  set status = 'approved',
      approved_at = now(),
      approved_by_profile_id = public.current_profile_id()
  where id = p_profile_id and deleted_at is null
  returning invited_by_profile_id into v_inviter_id;

  if not found then
    raise exception 'Member not found';
  end if;

  insert into public.member_stats (profile_id)
  values (p_profile_id)
  on conflict (profile_id) do nothing;

  insert into public.member_passes (profile_id)
  values (p_profile_id)
  on conflict (profile_id) do nothing;

  insert into public.notifications (profile_id, type, title, body)
  values (
    p_profile_id,
    'system',
    'Welcome to Pinellas Run Club',
    'Your membership was approved. See you at the next run!'
  );

  if v_inviter_id is not null then
    perform public.award_points(v_inviter_id, 'invite_approved', 25, 'profile', p_profile_id, null);
    perform public.recalculate_member_stats(v_inviter_id);

    select invite_approvals_total into v_invite_count
    from public.member_stats
    where profile_id = v_inviter_id;

    if coalesce(v_invite_count, 0) >= 3 then
      perform public.award_badge(v_inviter_id, 'invite_champion', 'profile', p_profile_id);
    end if;
  end if;
end;
$$;

create or replace function public.reject_member(
  p_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;

  update public.profiles
  set status = 'rejected'
  where id = p_profile_id and deleted_at is null;

  if not found then
    raise exception 'Member not found';
  end if;
end;
$$;

create or replace function public.suspend_member(
  p_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_role user_role;
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;

  select role into v_target_role
  from public.profiles
  where id = p_profile_id and deleted_at is null;

  if v_target_role is null then
    raise exception 'Member not found';
  end if;

  if v_target_role in ('admin', 'super_admin') and not public.is_super_admin() then
    raise exception 'Only super admins can suspend admins';
  end if;

  update public.profiles
  set status = 'suspended'
  where id = p_profile_id;
end;
$$;

create or replace function public.set_member_role(
  p_profile_id uuid,
  p_role user_role
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Super admins only';
  end if;

  update public.profiles
  set role = p_role
  where id = p_profile_id and deleted_at is null;

  if not found then
    raise exception 'Member not found';
  end if;
end;
$$;

-- ===========================================================================
-- admin_send_announcement — creates in-app notification rows for all
-- approved members (push delivery handled by the send-push edge function)
-- ===========================================================================
create or replace function public.admin_send_announcement(
  p_title text,
  p_body text default null,
  p_deep_link text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;

  if p_title is null or length(trim(p_title)) = 0 then
    raise exception 'Title is required';
  end if;

  insert into public.notifications (profile_id, type, title, body, deep_link)
  select id, 'announcement', p_title, p_body, p_deep_link
  from public.profiles
  where status = 'approved' and deleted_at is null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ===========================================================================
-- admin_get_dashboard_counts
-- ===========================================================================
create or replace function public.admin_get_dashboard_counts()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;

  return jsonb_build_object(
    'pending_members', (select count(*) from public.profiles where status = 'pending' and deleted_at is null),
    'approved_members', (select count(*) from public.profiles where status = 'approved' and deleted_at is null),
    'upcoming_events', (select count(*) from public.events where status = 'published' and deleted_at is null and starts_at >= now()),
    'checkins_today', (select count(*) from public.event_checkins where checked_in_at >= date_trunc('day', now())),
    'checkins_this_week', (select count(*) from public.event_checkins where checked_in_at >= date_trunc('week', now())),
    'posts_this_week', (select count(*) from public.feed_posts where deleted_at is null and created_at >= date_trunc('week', now())),
    'flagged_times', (select count(*) from public.course_time_entries where flagged = true and deleted_at is null),
    'new_sponsor_leads', (select count(*) from public.sponsor_leads where status = 'new'),
    'active_partners', (select count(*) from public.partners where active = true and deleted_at is null)
  );
end;
$$;

-- ===========================================================================
-- handle_new_user — auth signup trigger (creates profile + stats + pass)
-- ===========================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_full_name text;
  v_invite_code text;
  v_inviter_id uuid;
  v_require_approval boolean;
  v_status user_status;
  v_profile_id uuid;
  v_username text;
begin
  v_full_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
  v_invite_code := new.raw_user_meta_data->>'invite_code';

  select require_member_approval into v_require_approval
  from public.app_settings
  where id = 1;

  v_status := case when coalesce(v_require_approval, false) then 'pending'::user_status else 'approved'::user_status end;

  if v_invite_code is not null and length(v_invite_code) > 0 then
    select id into v_inviter_id
    from public.profiles
    where invite_code = v_invite_code
    limit 1;
  end if;

  v_username := lower(regexp_replace(
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    '[^a-zA-Z0-9_]+', '', 'g'
  ));

  -- de-dupe username collisions
  if exists (select 1 from public.profiles where username = v_username) then
    v_username := v_username || '_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
  end if;

  insert into public.profiles (
    auth_user_id, email, full_name, username, phone,
    instagram_handle, favorite_run_spot, running_level, typical_pace,
    invited_by_profile_id, status, approved_at
  )
  values (
    new.id, new.email, v_full_name, v_username,
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'instagram_handle',
    new.raw_user_meta_data->>'favorite_run_spot',
    new.raw_user_meta_data->>'running_level',
    new.raw_user_meta_data->>'typical_pace',
    v_inviter_id,
    v_status,
    case when v_status = 'approved' then now() else null end
  )
  returning id into v_profile_id;

  insert into public.member_stats (profile_id)
  values (v_profile_id)
  on conflict (profile_id) do nothing;

  insert into public.member_passes (profile_id)
  values (v_profile_id)
  on conflict (profile_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ===========================================================================
-- GRANTS
-- Client-callable RPCs → authenticated. Internal helpers → revoked from all
-- client roles (SECURITY DEFINER callers own them).
-- ===========================================================================

-- internal-only helpers
revoke all on function public.award_points(uuid, text, integer, text, uuid, integer) from public, anon, authenticated;
revoke all on function public.award_badge(uuid, text, text, uuid) from public, anon, authenticated;
revoke all on function public.complete_checkin(uuid, uuid, checkin_method, double precision, double precision, numeric, uuid, text) from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.protect_profile_columns() from public, anon, authenticated;

-- member RPCs
grant execute on function public.rsvp_event(uuid, rsvp_status) to authenticated;
grant execute on function public.check_in_event_gps(uuid, double precision, double precision) to authenticated;
grant execute on function public.check_in_event_qr(uuid, text) to authenticated;
grant execute on function public.submit_course_time(uuid, date, integer, text, uuid) to authenticated;
grant execute on function public.create_member_pass(uuid) to authenticated;
grant execute on function public.recalculate_member_stats(uuid) to authenticated;

-- admin RPCs (role checked inside each function)
grant execute on function public.admin_mark_checkin(uuid, uuid, text) to authenticated;
grant execute on function public.verify_course_time(uuid) to authenticated;
grant execute on function public.approve_member(uuid) to authenticated;
grant execute on function public.reject_member(uuid) to authenticated;
grant execute on function public.suspend_member(uuid) to authenticated;
grant execute on function public.set_member_role(uuid, user_role) to authenticated;
grant execute on function public.admin_award_badge(uuid, text) to authenticated;
grant execute on function public.admin_send_announcement(text, text, text) to authenticated;
grant execute on function public.admin_get_dashboard_counts() to authenticated;
