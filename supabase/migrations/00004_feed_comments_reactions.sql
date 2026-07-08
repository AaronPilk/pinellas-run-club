-- Pinellas Run Club — feed posts, media, likes, comments
-- Depends on: 00002 (profiles), 00003 (events)

create table if not exists public.feed_posts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  caption text,
  location_name text,
  event_id uuid references public.events(id) on delete set null,
  visibility post_visibility not null default 'members',
  like_count integer not null default 0,
  comment_count integer not null default 0,
  hidden_at timestamptz,
  hidden_by_profile_id uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists feed_posts_created_idx on public.feed_posts(created_at desc);
create index if not exists feed_posts_profile_idx on public.feed_posts(profile_id, created_at desc);
create index if not exists feed_posts_event_idx on public.feed_posts(event_id);

drop trigger if exists feed_posts_touch_updated_at on public.feed_posts;
create trigger feed_posts_touch_updated_at
before update on public.feed_posts
for each row execute function public.touch_updated_at();

create table if not exists public.feed_post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  media_url text not null,
  media_type media_type not null default 'image',
  width integer,
  height integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists feed_post_media_post_idx on public.feed_post_media(post_id);

create table if not exists public.feed_post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, profile_id)
);

create index if not exists feed_post_likes_post_idx on public.feed_post_likes(post_id);
create index if not exists feed_post_likes_profile_idx on public.feed_post_likes(profile_id);

create table if not exists public.feed_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  hidden_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists feed_comments_post_idx on public.feed_comments(post_id, created_at);

drop trigger if exists feed_comments_touch_updated_at on public.feed_comments;
create trigger feed_comments_touch_updated_at
before update on public.feed_comments
for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Denormalized like/comment counters
-- ---------------------------------------------------------------------------
create or replace function public.bump_post_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.feed_posts set like_count = like_count + 1 where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.feed_posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists feed_post_likes_bump_count on public.feed_post_likes;
create trigger feed_post_likes_bump_count
after insert or delete on public.feed_post_likes
for each row execute function public.bump_post_like_count();

create or replace function public.bump_post_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.feed_posts set comment_count = comment_count + 1 where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.feed_posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists feed_comments_bump_count on public.feed_comments;
create trigger feed_comments_bump_count
after insert or delete on public.feed_comments
for each row execute function public.bump_post_comment_count();
