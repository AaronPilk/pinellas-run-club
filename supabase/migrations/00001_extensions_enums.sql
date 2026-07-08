-- Pinellas Run Club — extensions and enums
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

do $$ begin
  create type user_role as enum ('super_admin', 'admin', 'member');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_status as enum ('pending', 'approved', 'rejected', 'suspended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type event_status as enum ('draft', 'published', 'cancelled', 'completed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type event_type as enum ('weekly_run', 'social_run', 'race', 'challenge', 'after_party', 'sponsor_event', 'volunteer', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type rsvp_status as enum ('going', 'maybe', 'not_going');
exception when duplicate_object then null; end $$;

do $$ begin
  create type checkin_method as enum ('gps', 'qr', 'gps_or_qr', 'admin_manual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type post_visibility as enum ('members', 'public', 'hidden');
exception when duplicate_object then null; end $$;

do $$ begin
  create type media_type as enum ('image', 'video');
exception when duplicate_object then null; end $$;

do $$ begin
  create type partner_category as enum ('food_drink', 'fitness', 'retail', 'recovery', 'wellness', 'events', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type sponsor_level as enum ('community', 'bronze', 'silver', 'gold', 'title');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_type as enum ('event', 'rsvp', 'checkin', 'badge', 'perk', 'announcement', 'system');
exception when duplicate_object then null; end $$;
