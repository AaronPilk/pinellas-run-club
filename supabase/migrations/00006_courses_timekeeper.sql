-- Pinellas Run Club — courses and time keeper
-- Depends on: 00002 (profiles), 00003 (events)
-- NOTE (spec fix): the spec defined pace_seconds_per_mile as a generated
-- column with a subquery, which Postgres does not allow. Per the spec's own
-- note, it is a plain integer column populated by a BEFORE trigger from
-- courses.distance_miles.

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  location_name text,
  address text,
  distance_miles numeric(6,2) not null,
  latitude double precision,
  longitude double precision,
  route_image_url text,
  map_polyline text,
  active boolean not null default true,
  featured boolean not null default false,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists courses_active_idx on public.courses(active, name);

drop trigger if exists courses_touch_updated_at on public.courses;
create trigger courses_touch_updated_at
before update on public.courses
for each row execute function public.touch_updated_at();

-- Deferred FK from events.course_id (events table exists since 00003)
do $$ begin
  alter table public.events
    add constraint events_course_id_fk
    foreign key (course_id) references public.courses(id) on delete set null;
exception when duplicate_object then null; end $$;

create index if not exists events_course_idx on public.events(course_id);

-- ---------------------------------------------------------------------------
-- Course time entries (writes via RPC only)
-- ---------------------------------------------------------------------------
create table if not exists public.course_time_entries (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  run_date date not null,
  time_seconds integer not null check (time_seconds > 0),
  pace_seconds_per_mile integer,
  notes text,
  verified boolean not null default false,
  verified_by_profile_id uuid references public.profiles(id) on delete set null,
  flagged boolean not null default false,
  flag_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists course_time_entries_profile_course_idx on public.course_time_entries(profile_id, course_id, run_date desc);
create index if not exists course_time_entries_course_idx on public.course_time_entries(course_id, time_seconds asc);

drop trigger if exists course_time_entries_touch_updated_at on public.course_time_entries;
create trigger course_time_entries_touch_updated_at
before update on public.course_time_entries
for each row execute function public.touch_updated_at();

-- Pace is derived from the course distance; keep it in sync on insert and on
-- any change to time_seconds or course_id.
create or replace function public.set_course_entry_pace()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_distance numeric;
begin
  select distance_miles into v_distance
  from public.courses
  where id = new.course_id;

  if v_distance is not null and v_distance > 0 and new.time_seconds is not null then
    new.pace_seconds_per_mile := round(new.time_seconds / v_distance)::integer;
  else
    new.pace_seconds_per_mile := null;
  end if;

  return new;
end;
$$;

drop trigger if exists course_time_entries_set_pace on public.course_time_entries;
create trigger course_time_entries_set_pace
before insert or update of time_seconds, course_id on public.course_time_entries
for each row execute function public.set_course_entry_pace();
