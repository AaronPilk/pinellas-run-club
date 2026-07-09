-- Pinellas Run Club — direct messages (1:1 DMs)
-- Depends on: 00002 (profiles + current_profile_id / is_approved helpers).
-- Any approved member can DM any other approved member — no friends system.
-- Conversations/participants are created only through get_or_create_dm();
-- read receipts only through mark_dm_read(). Messages insert directly under
-- RLS (sender must be the current member and a participant).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.dm_conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  last_message_at timestamptz,
  last_message_preview text,
  last_message_sender_profile_id uuid references public.profiles(id) on delete set null
);

create table if not exists public.dm_participants (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.dm_conversations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (conversation_id, profile_id)
);

create index if not exists idx_dm_participants_profile_id
  on public.dm_participants (profile_id);

create table if not exists public.dm_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.dm_conversations(id) on delete cascade,
  sender_profile_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_dm_messages_conversation_created
  on public.dm_messages (conversation_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Helper: is the current member a participant of this conversation?
-- SECURITY DEFINER so dm_participants policies can use it without RLS
-- self-recursion.
-- ---------------------------------------------------------------------------
create or replace function public.is_dm_participant(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.dm_participants
    where conversation_id = p_conversation_id
      and profile_id = public.current_profile_id()
  );
$$;

-- ===========================================================================
-- get_or_create_dm — find (or create) the 1:1 conversation between the
-- current member and p_other_profile_id. Returns the conversation id.
-- ===========================================================================
create or replace function public.get_or_create_dm(p_other_profile_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := public.current_profile_id();
  v_conversation_id uuid;
begin
  if v_me is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_approved() then
    raise exception 'Membership approval required';
  end if;

  if p_other_profile_id is null or p_other_profile_id = v_me then
    raise exception 'Cannot message yourself';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = p_other_profile_id
      and status = 'approved'
      and deleted_at is null
  ) then
    raise exception 'Member not found';
  end if;

  -- Serialize per member pair so two concurrent taps cannot create duplicates.
  perform pg_advisory_xact_lock(
    hashtextextended(
      least(v_me::text, p_other_profile_id::text)
        || ':' || greatest(v_me::text, p_other_profile_id::text),
      0
    )
  );

  -- A 1:1 DM is a conversation containing both members and nobody else.
  select c.id into v_conversation_id
  from public.dm_conversations c
  where exists (
      select 1 from public.dm_participants a
      where a.conversation_id = c.id and a.profile_id = v_me
    )
    and exists (
      select 1 from public.dm_participants b
      where b.conversation_id = c.id and b.profile_id = p_other_profile_id
    )
    and (
      select count(*) from public.dm_participants x
      where x.conversation_id = c.id
    ) = 2
  limit 1;

  if v_conversation_id is not null then
    return v_conversation_id;
  end if;

  insert into public.dm_conversations default values
  returning id into v_conversation_id;

  insert into public.dm_participants (conversation_id, profile_id)
  values
    (v_conversation_id, v_me),
    (v_conversation_id, p_other_profile_id);

  return v_conversation_id;
end;
$$;

-- ===========================================================================
-- mark_dm_read — stamp my participant row's last_read_at
-- ===========================================================================
create or replace function public.mark_dm_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.dm_participants
  set last_read_at = now()
  where conversation_id = p_conversation_id
    and profile_id = public.current_profile_id();

  if not found then
    raise exception 'Not a participant in this conversation';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Trigger: keep conversation preview columns in sync on every new message
-- ---------------------------------------------------------------------------
create or replace function public.dm_message_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.dm_conversations
  set last_message_at = new.created_at,
      last_message_preview = left(new.content, 120),
      last_message_sender_profile_id = new.sender_profile_id
  where id = new.conversation_id;

  return new;
end;
$$;

drop trigger if exists trg_dm_message_after_insert on public.dm_messages;
create trigger trg_dm_message_after_insert
after insert on public.dm_messages
for each row
execute function public.dm_message_after_insert();

-- ---------------------------------------------------------------------------
-- RLS — participants read their own conversations; messages insert directly;
-- conversations/participants have NO client writes (RPC-only); read receipts
-- flow through mark_dm_read() (no client updates).
-- ---------------------------------------------------------------------------
alter table public.dm_conversations enable row level security;
alter table public.dm_participants enable row level security;
alter table public.dm_messages enable row level security;

drop policy if exists "dm_conversations_select_participants" on public.dm_conversations;
create policy "dm_conversations_select_participants"
on public.dm_conversations
for select
to authenticated
using (public.is_dm_participant(id));

drop policy if exists "dm_participants_select_participants" on public.dm_participants;
create policy "dm_participants_select_participants"
on public.dm_participants
for select
to authenticated
using (public.is_dm_participant(conversation_id));

drop policy if exists "dm_messages_select_participants" on public.dm_messages;
create policy "dm_messages_select_participants"
on public.dm_messages
for select
to authenticated
using (public.is_dm_participant(conversation_id));

drop policy if exists "dm_messages_insert_sender" on public.dm_messages;
create policy "dm_messages_insert_sender"
on public.dm_messages
for insert
to authenticated
with check (
  sender_profile_id = public.current_profile_id()
  and public.is_dm_participant(conversation_id)
  and public.is_approved()
);

-- no update/delete policies on any dm table for clients

-- ---------------------------------------------------------------------------
-- Realtime: broadcast dm_messages inserts (RLS still applies per subscriber)
-- ---------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.dm_messages;
exception
  when duplicate_object then null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
revoke all on function public.is_dm_participant(uuid) from public, anon;
revoke all on function public.get_or_create_dm(uuid) from public, anon;
revoke all on function public.mark_dm_read(uuid) from public, anon;

grant execute on function public.is_dm_participant(uuid) to authenticated;
grant execute on function public.get_or_create_dm(uuid) to authenticated;
grant execute on function public.mark_dm_read(uuid) to authenticated;
