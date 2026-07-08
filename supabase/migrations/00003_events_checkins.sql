-- Pinellas Run Club — events, RSVPs, check-ins
-- Depends on: 00002 (profiles)
-- NOTE: events.created_by_profile_id is intentionally NULLABLE (spec had NOT
-- NULL, but seed events must exist before any auth user/profile does; deletes
-- set null so events survive creator removal).
-- NOTE: events.course_id has no FK here; the constraint is added in
-- 00006_courses_timekeeper.sql after public.courses exists.

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  event_type event_type not null default 'weekly_run',
  status event_status not null default 'published',
  event_date date not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location_name text,
  address text,
  latitude double precision,
  longitude double precision,
  distance_miles numeric(6,2),
  course_id uuid,
  image_url text,
  featured boolean not null default false,
  checkin_method checkin_method not null default 'gps',
  checkin_radius_meters integer,
  checkin_opens_at timestamptz,
  checkin_closes_at timestamptz,
  qr_checkin_nonce text default encode(gen_random_bytes(16), 'hex'),
  capacity integer,
  external_ticket_url text,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists events_status_starts_idx on public.events(status, starts_at);
create index if not exists events_date_idx on public.events(event_date);
create index if not exists events_featured_idx on public.events(featured) where featured = true;

drop trigger if exists events_touch_updated_at on public.events;
create trigger events_touch_updated_at
before update on public.events
for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- RSVPs
-- ---------------------------------------------------------------------------
create table if not exists public.event_rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status rsvp_status not null default 'going',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, profile_id)
);

create index if not exists event_rsvps_event_idx on public.event_rsvps(event_id);
create index if not exists event_rsvps_profile_idx on public.event_rsvps(profile_id);

drop trigger if exists event_rsvps_touch_updated_at on public.event_rsvps;
create trigger event_rsvps_touch_updated_at
before update on public.event_rsvps
for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Check-ins (protected ledger — writes only via RPC)
-- ---------------------------------------------------------------------------
create table if not exists public.event_checkins (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  method checkin_method not null default 'gps',
  latitude double precision,
  longitude double precision,
  distance_from_event_meters numeric(10,2),
  verified boolean not null default true,
  verified_by_profile_id uuid references public.profiles(id) on delete set null,
  admin_note text,
  created_at timestamptz not null default now(),
  unique (event_id, profile_id)
);

create index if not exists event_checkins_event_idx on public.event_checkins(event_id);
create index if not exists event_checkins_profile_idx on public.event_checkins(profile_id, checked_in_at desc);

-- ---------------------------------------------------------------------------
-- Haversine distance helper (pure math, no table deps)
-- ---------------------------------------------------------------------------
create or replace function public.haversine_meters(
  lat1 double precision,
  lon1 double precision,
  lat2 double precision,
  lon2 double precision
)
returns double precision
language plpgsql
immutable
as $$
declare
  r double precision := 6371000;
  dlat double precision;
  dlon double precision;
  a double precision;
  c double precision;
begin
  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);
  a := sin(dlat / 2) * sin(dlat / 2)
    + cos(radians(lat1)) * cos(radians(lat2))
    * sin(dlon / 2) * sin(dlon / 2);
  c := 2 * atan2(sqrt(a), sqrt(1 - a));
  return r * c;
end;
$$;

grant execute on function public.haversine_meters(double precision, double precision, double precision, double precision) to authenticated;
