-- Pinellas Run Club — lapsed-member follow-up report + pinned feed posts
-- Depends on: 00002 (profiles), 00004 (feed_posts), 00007 (member_stats),
-- 00009 (is_admin / current_profile_id helpers).

-- ---------------------------------------------------------------------------
-- feed_posts.pinned_at — admins pin announcements to the top of the feed
-- ---------------------------------------------------------------------------
alter table public.feed_posts
  add column if not exists pinned_at timestamptz;

create index if not exists idx_feed_posts_pinned_at
  on public.feed_posts (pinned_at desc)
  where pinned_at is not null;

-- ===========================================================================
-- admin_get_lapsed_members — approved members ordered by how long it has
-- been since their last check-in (never-checked-in members first)
-- ===========================================================================
create or replace function public.admin_get_lapsed_members()
returns table (
  profile_id uuid,
  full_name text,
  email text,
  phone text,
  avatar_url text,
  last_checkin_at timestamptz,
  checkins_total integer,
  member_since timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;

  return query
  select
    p.id,
    p.full_name,
    p.email,
    p.phone,
    p.avatar_url,
    s.last_checkin_at,
    coalesce(s.checkins_total, 0),
    coalesce(p.approved_at, p.created_at)
  from public.profiles p
  left join public.member_stats s on s.profile_id = p.id
  where p.status = 'approved'
    and p.deleted_at is null
  order by s.last_checkin_at asc nulls first;
end;
$$;

-- ===========================================================================
-- admin_set_post_pinned — pin (pinned_at = now()) or unpin (null) a post
-- ===========================================================================
create or replace function public.admin_set_post_pinned(
  p_post_id uuid,
  p_pinned boolean
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

  update public.feed_posts
  set pinned_at = case when p_pinned then now() else null end,
      updated_at = now()
  where id = p_post_id and deleted_at is null;

  if not found then
    raise exception 'Post not found';
  end if;
end;
$$;

-- ===========================================================================
-- GRANTS — admin RPCs (role checked inside each function)
-- ===========================================================================
revoke all on function public.admin_get_lapsed_members() from public, anon;
revoke all on function public.admin_set_post_pinned(uuid, boolean) from public, anon;

grant execute on function public.admin_get_lapsed_members() to authenticated;
grant execute on function public.admin_set_post_pinned(uuid, boolean) to authenticated;
