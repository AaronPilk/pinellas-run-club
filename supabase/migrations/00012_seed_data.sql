-- Pinellas Run Club — seed data
-- Safe to run on an empty database: nothing here depends on an auth user.
-- Seed events use created_by_profile_id = NULL (column was made nullable in
-- 00003 for exactly this reason). Fixed UUIDs + on-conflict guards make this
-- migration idempotent.

-- ---------------------------------------------------------------------------
-- Badge catalog
-- ---------------------------------------------------------------------------
insert into public.badges (code, name, description, icon_name, sort_order)
values
  ('first_checkin',     'First Check-In',    'Checked into your first PRC event.',              'check-circle', 1),
  ('checkins_5',        '5 Check-Ins',       'Showed up five times. Momentum.',                 'activity',     2),
  ('checkins_10',       '10 Check-Ins',      'Ten club check-ins strong.',                      'flame',        3),
  ('checkins_25',       '25 Check-Ins',      'A true PRC regular.',                             'award',        4),
  ('checkins_50',       '50 Check-Ins',      'Fifty runs with the club. Legend status.',        'medal',        5),
  ('checkins_100',      '100 Check-Ins',     'One hundred check-ins. PRC Hall of Fame.',        'trophy',       6),
  ('first_pr',          'First PR',          'Logged your first personal record.',              'zap',          7),
  ('streak_3',          '3 Week Streak',     'Checked in three weeks in a row.',                'calendar',     8),
  ('five_k_finisher',   '5K Finisher',       'Logged a time on a 5K course.',                   'flag',         9),
  ('social_runner',     'Social Runner',     'Checked into a social run or after party.',       'users',        10),
  ('volunteer',         'Volunteer',         'Gave back at a PRC volunteer event.',             'heart',        11),
  ('early_bird',        'Early Bird',        'Checked into a run that started before 7 AM.',    'sunrise',      12),
  ('night_runner',      'Night Runner',      'Checked into a run that started after 7 PM.',     'moon',         13),
  ('sponsor_supporter', 'Sponsor Supporter', 'Showed up for a partner-hosted event.',           'handshake',    14),
  ('invite_champion',   'Invite Champion',   'Brought three or more friends into the club.',    'user-plus',    15)
on conflict (code) do nothing;

-- ---------------------------------------------------------------------------
-- App settings (row created in 00002; set club defaults here)
-- ---------------------------------------------------------------------------
update public.app_settings
set club_name = 'Pinellas Run Club',
    club_tagline = 'Better ∞ Together',
    support_email = coalesce(support_email, 'hello@pinellasrunclub.com'),
    instagram_url = coalesce(instagram_url, 'https://instagram.com/pinellasrunclub'),
    require_member_approval = false,
    default_checkin_radius_meters = 250
where id = 1;

-- ---------------------------------------------------------------------------
-- Courses (real Pinellas locations)
-- ---------------------------------------------------------------------------
insert into public.courses (id, name, description, location_name, address, distance_miles, latitude, longitude, active, featured)
values
  (
    'c0a80001-0000-4000-8000-000000000001',
    'North Shore Park 5K',
    'Classic flat-and-fast waterfront 5K along North Shore Park and the Bayshore path. PR territory.',
    'North Shore Park',
    '901 North Shore Dr NE, St. Petersburg, FL 33701',
    3.11, 27.7896, -82.6266, true, true
  ),
  (
    'c0a80001-0000-4000-8000-000000000002',
    'Vinoy Park Loop',
    'Two-mile loop through Vinoy Park and along the downtown St. Pete waterfront. Great for tempo repeats.',
    'Vinoy Park',
    '701 Bayshore Dr NE, St. Petersburg, FL 33701',
    2.00, 27.7757, -82.6289, true, false
  ),
  (
    'c0a80001-0000-4000-8000-000000000003',
    'Pier District Mile',
    'One fast mile out and back on the St. Pete Pier approach. Time-trial night favorite.',
    'St. Pete Pier District',
    '600 2nd Ave NE, St. Petersburg, FL 33701',
    1.00, 27.7710, -82.6260, true, false
  ),
  (
    'c0a80001-0000-4000-8000-000000000004',
    'Gandy Bridge Trail Run',
    'Four miles on the Friendship Trail approach near Gandy. The only hills in Pinellas County.',
    'Gandy Bridge Trail',
    'Gandy Blvd N, St. Petersburg, FL 33702',
    4.00, 27.8666, -82.5850, true, false
  )
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Partners
-- ---------------------------------------------------------------------------
insert into public.partners (id, name, category, sponsor_level, short_offer, offer_details, redeem_instructions, address, latitude, longitude, website_url, active, featured, sort_order)
values
  (
    'b0a80001-0000-4000-8000-000000000001',
    '3 Daughters Brewing',
    'food_drink', 'gold',
    '$1 off drafts after club runs',
    'Show your PRC member pass after any official club run for $1 off draft pours.',
    'Show your member pass QR at the bar.',
    '222 22nd St S, St. Petersburg, FL 33712',
    27.7620, -82.6580,
    'https://3dbrewing.com', true, true, 1
  ),
  (
    'b0a80001-0000-4000-8000-000000000002',
    'Fleet Feet St. Pete',
    'retail', 'silver',
    '10% off shoes and gear',
    'PRC members get 10% off full-price footwear, apparel, and accessories.',
    'Show your member pass at checkout.',
    '2251 Central Ave, St. Petersburg, FL 33713',
    27.7712, -82.6631,
    'https://fleetfeet.com/s/stpete', true, true, 2
  ),
  (
    'b0a80001-0000-4000-8000-000000000003',
    'Pure Kitchen',
    'food_drink', 'community',
    'Free smoothie boost with any bowl',
    'Add a free protein or energy boost to any smoothie or bowl.',
    'Mention Pinellas Run Club and show your pass.',
    '2962 1st Ave N, St. Petersburg, FL 33713',
    27.7708, -82.6720,
    'https://purekitchenstpete.com', true, false, 3
  ),
  (
    'b0a80001-0000-4000-8000-000000000004',
    'Bandit Coffee Co.',
    'food_drink', 'community',
    'BOGO cold brew on run mornings',
    'Buy one get one cold brew every Saturday morning before 10 AM.',
    'Show your member pass at the register.',
    '2662 Central Ave, St. Petersburg, FL 33712',
    27.7709, -82.6683,
    'https://banditcoffee.co', true, false, 4
  ),
  (
    'b0a80001-0000-4000-8000-000000000005',
    'The Body Electric Yoga Company',
    'recovery', 'bronze',
    'First recovery class free',
    'One free yoga or mobility class for new PRC members, then 15% off drop-ins.',
    'Book online and show your pass at the studio.',
    '2617 Central Ave, St. Petersburg, FL 33713',
    27.7711, -82.6676,
    'https://thebodyelectricyoga.com', true, false, 5
  )
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Sample upcoming events (relative dates; created_by_profile_id is NULL on
-- purpose — no auth user exists yet at migration time)
-- ---------------------------------------------------------------------------
insert into public.events (
  id, title, description, event_type, status, event_date, starts_at, ends_at,
  location_name, address, latitude, longitude, distance_miles, course_id,
  featured, checkin_method, checkin_opens_at, checkin_closes_at,
  created_by_profile_id
)
values
  (
    'e0a80001-0000-4000-8000-000000000001',
    'Wednesday Social Run',
    'Our flagship weekly run. All paces welcome — 1, 2, and 3 mile options with a social hang after.',
    'weekly_run', 'published',
    current_date + 2,
    ((current_date + 2) + time '18:30') at time zone 'America/New_York',
    ((current_date + 2) + time '20:00') at time zone 'America/New_York',
    'North Shore Park', '901 North Shore Dr NE, St. Petersburg, FL 33701',
    27.7896, -82.6266, 3.11,
    'c0a80001-0000-4000-8000-000000000001',
    true, 'gps_or_qr',
    ((current_date + 2) + time '17:45') at time zone 'America/New_York',
    ((current_date + 2) + time '20:30') at time zone 'America/New_York',
    null
  ),
  (
    'e0a80001-0000-4000-8000-000000000002',
    'Sunset Social Run & After Party',
    'Golden-hour miles along the Vinoy waterfront, then drinks with our partners at 3 Daughters.',
    'social_run', 'published',
    current_date + 5,
    ((current_date + 5) + time '19:00') at time zone 'America/New_York',
    ((current_date + 5) + time '21:30') at time zone 'America/New_York',
    'Vinoy Park', '701 Bayshore Dr NE, St. Petersburg, FL 33701',
    27.7757, -82.6289, 2.00,
    'c0a80001-0000-4000-8000-000000000002',
    true, 'gps_or_qr',
    ((current_date + 5) + time '18:15') at time zone 'America/New_York',
    ((current_date + 5) + time '21:00') at time zone 'America/New_York',
    null
  ),
  (
    'e0a80001-0000-4000-8000-000000000003',
    'PRC Monthly 5K Challenge',
    'Race the North Shore 5K course, log your time in the Time Keeper, and chase that PR.',
    'challenge', 'published',
    current_date + 9,
    ((current_date + 9) + time '07:30') at time zone 'America/New_York',
    ((current_date + 9) + time '09:30') at time zone 'America/New_York',
    'North Shore Park', '901 North Shore Dr NE, St. Petersburg, FL 33701',
    27.7896, -82.6266, 3.11,
    'c0a80001-0000-4000-8000-000000000001',
    false, 'gps',
    ((current_date + 9) + time '07:00') at time zone 'America/New_York',
    ((current_date + 9) + time '10:00') at time zone 'America/New_York',
    null
  ),
  (
    'e0a80001-0000-4000-8000-000000000004',
    'Gandy Bridge Sunrise Run',
    'Early miles and the best sunrise view in Pinellas. Four miles on the Friendship Trail approach.',
    'weekly_run', 'published',
    current_date + 12,
    ((current_date + 12) + time '06:15') at time zone 'America/New_York',
    ((current_date + 12) + time '08:00') at time zone 'America/New_York',
    'Gandy Bridge Trail', 'Gandy Blvd N, St. Petersburg, FL 33702',
    27.8666, -82.5850, 4.00,
    'c0a80001-0000-4000-8000-000000000004',
    false, 'gps',
    ((current_date + 12) + time '05:45') at time zone 'America/New_York',
    ((current_date + 12) + time '08:30') at time zone 'America/New_York',
    null
  )
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- First admin bootstrap (manual step, documented):
-- After the first real user signs up through the app, promote them with:
--   update public.profiles
--   set role = 'super_admin', status = 'approved', approved_at = now()
--   where email = 'you@example.com';
-- ---------------------------------------------------------------------------
