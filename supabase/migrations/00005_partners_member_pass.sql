-- Pinellas Run Club — partners/perks, member passes, sponsor leads
-- Depends on: 00002 (profiles)

create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category partner_category not null default 'other',
  sponsor_level sponsor_level not null default 'community',
  logo_url text,
  cover_image_url text,
  short_offer text not null,
  offer_details text,
  redeem_instructions text,
  terms text,
  address text,
  latitude double precision,
  longitude double precision,
  website_url text,
  instagram_url text,
  phone text,
  email text,
  active boolean not null default true,
  featured boolean not null default false,
  sort_order integer not null default 0,
  offer_expires_at timestamptz,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists partners_active_idx on public.partners(active, sort_order, name);
create index if not exists partners_category_idx on public.partners(category);
create index if not exists partners_featured_idx on public.partners(featured) where featured = true;

drop trigger if exists partners_touch_updated_at on public.partners;
create trigger partners_touch_updated_at
before update on public.partners
for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Member passes (protected — created via RPC / signup trigger only)
-- ---------------------------------------------------------------------------
create table if not exists public.member_passes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique not null references public.profiles(id) on delete cascade,
  public_pass_id text unique not null default encode(gen_random_bytes(10), 'hex'),
  status text not null default 'active',
  issued_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists member_passes_public_pass_idx on public.member_passes(public_pass_id);

-- ---------------------------------------------------------------------------
-- Sponsor leads (any approved member can submit, only admins read)
-- ---------------------------------------------------------------------------
create table if not exists public.sponsor_leads (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  contact_name text not null,
  email text not null,
  phone text,
  category text,
  proposed_offer text,
  message text,
  status text not null default 'new',
  assigned_to_profile_id uuid references public.profiles(id) on delete set null,
  submitted_by_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sponsor_leads_status_idx on public.sponsor_leads(status, created_at desc);

drop trigger if exists sponsor_leads_touch_updated_at on public.sponsor_leads;
create trigger sponsor_leads_touch_updated_at
before update on public.sponsor_leads
for each row execute function public.touch_updated_at();
