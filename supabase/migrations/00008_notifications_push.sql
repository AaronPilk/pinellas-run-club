-- Pinellas Run Club — notifications and push tokens
-- Depends on: 00002 (profiles)

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  type notification_type not null default 'system',
  title text not null,
  body text,
  read boolean not null default false,
  related_entity_type text,
  related_entity_id uuid,
  deep_link text,
  created_at timestamptz not null default now()
);

create index if not exists notifications_profile_idx on public.notifications(profile_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications(profile_id) where read = false;

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  expo_push_token text not null,
  platform text,
  device_id text,
  active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (profile_id, expo_push_token)
);

create index if not exists push_tokens_profile_idx on public.push_tokens(profile_id);
create index if not exists push_tokens_active_idx on public.push_tokens(active) where active = true;

-- ---------------------------------------------------------------------------
-- mark_notification_read — member RPC
-- ---------------------------------------------------------------------------
create or replace function public.mark_notification_read(
  p_notification_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notifications
  set read = true
  where id = p_notification_id
    and profile_id = public.current_profile_id();
end;
$$;

create or replace function public.mark_all_notifications_read()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notifications
  set read = true
  where profile_id = public.current_profile_id()
    and read = false;
end;
$$;

grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;
