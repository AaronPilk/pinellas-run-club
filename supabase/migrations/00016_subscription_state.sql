-- Pinellas Run Club — Stripe subscription state
-- Adds paid-membership state to profiles, an entitlement helper, and extends
-- the column-protection trigger so ONLY the service-role webhook can write it.
-- Depends on: 00002 (profiles, app_settings, protect_profile_columns)

-- ---------------------------------------------------------------------------
-- Subscription columns on profiles
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_status text,
  add column if not exists subscription_current_period_end timestamptz,
  add column if not exists subscription_updated_at timestamptz;

create index if not exists profiles_stripe_customer_idx on public.profiles(stripe_customer_id);
create index if not exists profiles_subscription_status_idx on public.profiles(subscription_status);

-- ---------------------------------------------------------------------------
-- App settings: checkout link + paywall toggle (admin-configurable)
-- ---------------------------------------------------------------------------
alter table public.app_settings
  add column if not exists stripe_checkout_url text,
  add column if not exists subscription_price_label text,
  add column if not exists paywall_enabled boolean not null default true;

-- ---------------------------------------------------------------------------
-- Entitlement helper (mirrors is_admin()). Active or trialing = entitled.
-- ---------------------------------------------------------------------------
create or replace function public.is_subscribed()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where auth_user_id = auth.uid()
      and deleted_at is null
      and subscription_status in ('active', 'trialing')
  );
$$;
grant execute on function public.is_subscribed() to authenticated;

-- ---------------------------------------------------------------------------
-- Extend column protection: members cannot self-grant a subscription.
-- Only service role (webhook; auth.uid() is null) may write these columns.
-- ---------------------------------------------------------------------------
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new; -- service role / migrations / seed / Stripe webhook
  end if;

  if new.auth_user_id is distinct from old.auth_user_id
     or new.member_number is distinct from old.member_number
     or new.invite_code is distinct from old.invite_code then
    raise exception 'Protected profile fields cannot be changed';
  end if;

  if new.role is distinct from old.role and not public.is_super_admin() then
    raise exception 'Only super admins can change member roles';
  end if;

  if (new.status is distinct from old.status
      or new.approved_at is distinct from old.approved_at
      or new.approved_by_profile_id is distinct from old.approved_by_profile_id)
     and not public.is_admin() then
    raise exception 'Only admins can change member status';
  end if;

  if new.stripe_customer_id is distinct from old.stripe_customer_id
     or new.stripe_subscription_id is distinct from old.stripe_subscription_id
     or new.subscription_status is distinct from old.subscription_status
     or new.subscription_current_period_end is distinct from old.subscription_current_period_end
     or new.subscription_updated_at is distinct from old.subscription_updated_at then
    raise exception 'Subscription fields are managed by billing and cannot be changed here';
  end if;

  return new;
end;
$$;
