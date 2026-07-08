-- Pinellas Run Club — Row Level Security
-- RLS is enabled on EVERY public table. Protected ledgers (event_rsvps,
-- event_checkins, points_ledger, member_stats, member_badges, member_passes)
-- accept NO direct client writes — RPC only. Policies are drop-and-recreate
-- so this migration is idempotent.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles_read_approved_members" on public.profiles;
create policy "profiles_read_approved_members"
on public.profiles
for select
to authenticated
using (
  deleted_at is null
  and (
    public.is_approved()
    or auth_user_id = auth.uid()
    or public.is_admin()
  )
);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
on public.profiles
for update
to authenticated
using (auth_user_id = auth.uid())
with check (auth_user_id = auth.uid());
-- sensitive columns (role/status/etc.) guarded by profiles_protect_columns trigger

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all"
on public.profiles
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- app_settings
-- ---------------------------------------------------------------------------
alter table public.app_settings enable row level security;

drop policy if exists "app_settings_read_authenticated" on public.app_settings;
create policy "app_settings_read_authenticated"
on public.app_settings
for select
to authenticated
using (true);

drop policy if exists "app_settings_update_super_admin" on public.app_settings;
create policy "app_settings_update_super_admin"
on public.app_settings
for update
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------------
alter table public.events enable row level security;

drop policy if exists "events_read_published" on public.events;
create policy "events_read_published"
on public.events
for select
to authenticated
using (
  deleted_at is null
  and (
    status = 'published'
    or public.is_admin()
  )
);

drop policy if exists "events_admin_all" on public.events;
create policy "events_admin_all"
on public.events
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- event_rsvps (RPC-only writes)
-- ---------------------------------------------------------------------------
alter table public.event_rsvps enable row level security;

drop policy if exists "rsvps_read_members" on public.event_rsvps;
create policy "rsvps_read_members"
on public.event_rsvps
for select
to authenticated
using (public.is_approved() or public.is_admin());

-- no insert/update/delete policies for clients: writes flow through rsvp_event()

-- ---------------------------------------------------------------------------
-- event_checkins (RPC-only writes)
-- ---------------------------------------------------------------------------
alter table public.event_checkins enable row level security;

drop policy if exists "checkins_read_own_or_admin" on public.event_checkins;
create policy "checkins_read_own_or_admin"
on public.event_checkins
for select
to authenticated
using (
  profile_id = public.current_profile_id()
  or public.is_admin()
);

-- no insert/update/delete policies: writes flow through check-in RPCs

-- ---------------------------------------------------------------------------
-- feed_posts
-- ---------------------------------------------------------------------------
alter table public.feed_posts enable row level security;

drop policy if exists "feed_posts_read_members" on public.feed_posts;
create policy "feed_posts_read_members"
on public.feed_posts
for select
to authenticated
using (
  deleted_at is null
  and (
    (hidden_at is null and public.is_approved())
    or profile_id = public.current_profile_id()
    or public.is_admin()
  )
);

drop policy if exists "feed_posts_insert_own" on public.feed_posts;
create policy "feed_posts_insert_own"
on public.feed_posts
for insert
to authenticated
with check (
  profile_id = public.current_profile_id()
  and public.is_approved()
);

drop policy if exists "feed_posts_update_own_or_admin" on public.feed_posts;
create policy "feed_posts_update_own_or_admin"
on public.feed_posts
for update
to authenticated
using (
  profile_id = public.current_profile_id()
  or public.is_admin()
)
with check (
  profile_id = public.current_profile_id()
  or public.is_admin()
);

drop policy if exists "feed_posts_delete_own_or_admin" on public.feed_posts;
create policy "feed_posts_delete_own_or_admin"
on public.feed_posts
for delete
to authenticated
using (
  profile_id = public.current_profile_id()
  or public.is_admin()
);

-- ---------------------------------------------------------------------------
-- feed_post_media
-- ---------------------------------------------------------------------------
alter table public.feed_post_media enable row level security;

drop policy if exists "feed_media_read_members" on public.feed_post_media;
create policy "feed_media_read_members"
on public.feed_post_media
for select
to authenticated
using (
  exists (
    select 1 from public.feed_posts p
    where p.id = post_id
      and p.deleted_at is null
      and (
        (p.hidden_at is null and public.is_approved())
        or p.profile_id = public.current_profile_id()
        or public.is_admin()
      )
  )
);

drop policy if exists "feed_media_insert_own_post" on public.feed_post_media;
create policy "feed_media_insert_own_post"
on public.feed_post_media
for insert
to authenticated
with check (
  public.is_approved()
  and exists (
    select 1 from public.feed_posts p
    where p.id = post_id
      and p.profile_id = public.current_profile_id()
  )
);

drop policy if exists "feed_media_delete_own_or_admin" on public.feed_post_media;
create policy "feed_media_delete_own_or_admin"
on public.feed_post_media
for delete
to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.feed_posts p
    where p.id = post_id
      and p.profile_id = public.current_profile_id()
  )
);

-- ---------------------------------------------------------------------------
-- feed_post_likes
-- ---------------------------------------------------------------------------
alter table public.feed_post_likes enable row level security;

drop policy if exists "likes_read_members" on public.feed_post_likes;
create policy "likes_read_members"
on public.feed_post_likes
for select
to authenticated
using (public.is_approved() or public.is_admin());

drop policy if exists "likes_insert_own" on public.feed_post_likes;
create policy "likes_insert_own"
on public.feed_post_likes
for insert
to authenticated
with check (
  profile_id = public.current_profile_id()
  and public.is_approved()
);

drop policy if exists "likes_delete_own" on public.feed_post_likes;
create policy "likes_delete_own"
on public.feed_post_likes
for delete
to authenticated
using (profile_id = public.current_profile_id());

-- ---------------------------------------------------------------------------
-- feed_comments
-- ---------------------------------------------------------------------------
alter table public.feed_comments enable row level security;

drop policy if exists "comments_read_members" on public.feed_comments;
create policy "comments_read_members"
on public.feed_comments
for select
to authenticated
using (
  deleted_at is null
  and (
    (hidden_at is null and public.is_approved())
    or profile_id = public.current_profile_id()
    or public.is_admin()
  )
);

drop policy if exists "comments_insert_own" on public.feed_comments;
create policy "comments_insert_own"
on public.feed_comments
for insert
to authenticated
with check (
  profile_id = public.current_profile_id()
  and public.is_approved()
);

drop policy if exists "comments_update_own_or_admin" on public.feed_comments;
create policy "comments_update_own_or_admin"
on public.feed_comments
for update
to authenticated
using (
  profile_id = public.current_profile_id()
  or public.is_admin()
)
with check (
  profile_id = public.current_profile_id()
  or public.is_admin()
);

drop policy if exists "comments_delete_own_or_admin" on public.feed_comments;
create policy "comments_delete_own_or_admin"
on public.feed_comments
for delete
to authenticated
using (
  profile_id = public.current_profile_id()
  or public.is_admin()
);

-- ---------------------------------------------------------------------------
-- partners
-- ---------------------------------------------------------------------------
alter table public.partners enable row level security;

drop policy if exists "partners_read_members" on public.partners;
create policy "partners_read_members"
on public.partners
for select
to authenticated
using (
  deleted_at is null
  and (
    (active = true and public.is_approved())
    or public.is_admin()
  )
);

drop policy if exists "partners_admin_all" on public.partners;
create policy "partners_admin_all"
on public.partners
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- member_passes (RPC-only writes)
-- ---------------------------------------------------------------------------
alter table public.member_passes enable row level security;

drop policy if exists "passes_read_own_or_admin" on public.member_passes;
create policy "passes_read_own_or_admin"
on public.member_passes
for select
to authenticated
using (
  profile_id = public.current_profile_id()
  or public.is_admin()
);

-- no insert/update/delete policies: writes flow through create_member_pass()

-- ---------------------------------------------------------------------------
-- sponsor_leads (any approved member can submit; only admins read/manage)
-- ---------------------------------------------------------------------------
alter table public.sponsor_leads enable row level security;

drop policy if exists "sponsor_leads_insert_members" on public.sponsor_leads;
create policy "sponsor_leads_insert_members"
on public.sponsor_leads
for insert
to authenticated
with check (
  public.is_approved()
  and (
    submitted_by_profile_id is null
    or submitted_by_profile_id = public.current_profile_id()
  )
);

drop policy if exists "sponsor_leads_admin_select" on public.sponsor_leads;
create policy "sponsor_leads_admin_select"
on public.sponsor_leads
for select
to authenticated
using (public.is_admin());

drop policy if exists "sponsor_leads_admin_update" on public.sponsor_leads;
create policy "sponsor_leads_admin_update"
on public.sponsor_leads
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "sponsor_leads_admin_delete" on public.sponsor_leads;
create policy "sponsor_leads_admin_delete"
on public.sponsor_leads
for delete
to authenticated
using (public.is_admin());

-- ---------------------------------------------------------------------------
-- courses
-- ---------------------------------------------------------------------------
alter table public.courses enable row level security;

drop policy if exists "courses_read_members" on public.courses;
create policy "courses_read_members"
on public.courses
for select
to authenticated
using (
  deleted_at is null
  and (
    (active = true and public.is_approved())
    or public.is_admin()
  )
);

drop policy if exists "courses_admin_all" on public.courses;
create policy "courses_admin_all"
on public.courses
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- course_time_entries (inserts via submit_course_time RPC only)
-- ---------------------------------------------------------------------------
alter table public.course_time_entries enable row level security;

drop policy if exists "course_times_read_members" on public.course_time_entries;
create policy "course_times_read_members"
on public.course_time_entries
for select
to authenticated
using (
  (deleted_at is null and public.is_approved())
  or profile_id = public.current_profile_id()
  or public.is_admin()
);

drop policy if exists "course_times_admin_update" on public.course_time_entries;
create policy "course_times_admin_update"
on public.course_time_entries
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "course_times_delete_own_or_admin" on public.course_time_entries;
create policy "course_times_delete_own_or_admin"
on public.course_time_entries
for delete
to authenticated
using (
  profile_id = public.current_profile_id()
  or public.is_admin()
);

-- ---------------------------------------------------------------------------
-- points_ledger (RPC-only writes)
-- ---------------------------------------------------------------------------
alter table public.points_ledger enable row level security;

drop policy if exists "points_read_own_or_admin" on public.points_ledger;
create policy "points_read_own_or_admin"
on public.points_ledger
for select
to authenticated
using (
  profile_id = public.current_profile_id()
  or public.is_admin()
);

-- no insert/update/delete policies: writes flow through award_points()

-- ---------------------------------------------------------------------------
-- member_stats (RPC-only writes; leaderboard reads respect allow_public_stats)
-- ---------------------------------------------------------------------------
alter table public.member_stats enable row level security;

drop policy if exists "stats_read_members" on public.member_stats;
create policy "stats_read_members"
on public.member_stats
for select
to authenticated
using (
  profile_id = public.current_profile_id()
  or public.is_admin()
  or (
    public.is_approved()
    and exists (
      select 1 from public.profiles pr
      where pr.id = profile_id
        and pr.allow_public_stats = true
        and pr.deleted_at is null
    )
  )
);

-- no insert/update/delete policies: writes flow through stat RPCs

-- ---------------------------------------------------------------------------
-- badges (catalog)
-- ---------------------------------------------------------------------------
alter table public.badges enable row level security;

drop policy if exists "badges_read_authenticated" on public.badges;
create policy "badges_read_authenticated"
on public.badges
for select
to authenticated
using (true);

drop policy if exists "badges_admin_all" on public.badges;
create policy "badges_admin_all"
on public.badges
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- member_badges (RPC-only writes)
-- ---------------------------------------------------------------------------
alter table public.member_badges enable row level security;

drop policy if exists "member_badges_read_members" on public.member_badges;
create policy "member_badges_read_members"
on public.member_badges
for select
to authenticated
using (
  profile_id = public.current_profile_id()
  or public.is_admin()
  or public.is_approved()
);

-- no insert/update/delete policies: writes flow through award_badge()

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
alter table public.notifications enable row level security;

drop policy if exists "notifications_read_own" on public.notifications;
create policy "notifications_read_own"
on public.notifications
for select
to authenticated
using (profile_id = public.current_profile_id());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
on public.notifications
for update
to authenticated
using (profile_id = public.current_profile_id())
with check (profile_id = public.current_profile_id());

drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own"
on public.notifications
for delete
to authenticated
using (profile_id = public.current_profile_id());

-- no client insert policy: rows are created by RPCs / edge functions

-- ---------------------------------------------------------------------------
-- push_tokens (fully user-owned)
-- ---------------------------------------------------------------------------
alter table public.push_tokens enable row level security;

drop policy if exists "push_tokens_select_own" on public.push_tokens;
create policy "push_tokens_select_own"
on public.push_tokens
for select
to authenticated
using (profile_id = public.current_profile_id());

drop policy if exists "push_tokens_insert_own" on public.push_tokens;
create policy "push_tokens_insert_own"
on public.push_tokens
for insert
to authenticated
with check (profile_id = public.current_profile_id());

drop policy if exists "push_tokens_update_own" on public.push_tokens;
create policy "push_tokens_update_own"
on public.push_tokens
for update
to authenticated
using (profile_id = public.current_profile_id())
with check (profile_id = public.current_profile_id());

drop policy if exists "push_tokens_delete_own" on public.push_tokens;
create policy "push_tokens_delete_own"
on public.push_tokens
for delete
to authenticated
using (profile_id = public.current_profile_id());
