-- Pinellas Run Club — security hardening (advisor follow-up)
-- 1) Lock anon out of all SECURITY DEFINER RPCs (they're member/admin-only anyway).
-- 2) Trigger-only functions should not be callable by any client role.
-- 3) Pin search_path on the two remaining functions flagged as mutable.

-- Member/admin RPCs: authenticated only
do $$
declare
  fn text;
begin
  foreach fn in array array[
    'admin_award_badge(uuid, text, text, uuid)',
    'admin_award_badge(uuid, text)',
    'admin_get_dashboard_counts()',
    'admin_mark_checkin(uuid, uuid, text)',
    'admin_send_announcement(text, text, text)',
    'approve_member(uuid)',
    'check_in_event_gps(uuid, double precision, double precision)',
    'check_in_event_qr(uuid, text)',
    'create_member_pass(uuid)',
    'current_profile_id()',
    'is_admin()',
    'is_approved()',
    'is_super_admin()',
    'mark_all_notifications_read()',
    'mark_notification_read(uuid)',
    'recalculate_member_stats(uuid)',
    'reject_member(uuid)',
    'rsvp_event(uuid, rsvp_status)',
    'set_member_role(uuid, user_role)',
    'submit_course_time(uuid, date, integer, text, uuid)',
    'suspend_member(uuid)',
    'verify_course_time(uuid)'
  ]
  loop
    begin
      execute format('revoke execute on function public.%s from public, anon', fn);
    exception when undefined_function then
      raise notice 'skipped missing function %', fn;
    end;
  end loop;
end $$;

-- Trigger-only functions: no client role should call these directly
do $$
declare
  fn text;
begin
  foreach fn in array array[
    'bump_post_like_count()',
    'bump_post_comment_count()',
    'set_course_entry_pace()',
    'touch_updated_at()',
    'protect_profile_columns()'
  ]
  loop
    begin
      execute format('revoke execute on function public.%s from public, anon, authenticated', fn);
    exception when undefined_function then
      raise notice 'skipped missing function %', fn;
    end;
  end loop;
end $$;

-- Pin search_path on remaining flagged functions
alter function public.touch_updated_at() set search_path = public;
alter function public.haversine_meters(double precision, double precision, double precision, double precision) set search_path = public;
