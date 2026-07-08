# Pinellas Run Club — Native App

Better ∞ Together. Expo React Native + TypeScript + Supabase.

## Stack

- Expo SDK 52 (React Native 0.76, React 18.3)
- React Navigation v7 (bottom tabs + native stacks)
- TanStack React Query v5 for server state
- Supabase (Postgres, Auth, Storage, Realtime, Edge Functions)
- Expo Notifications for push (Expo push service)
- Zod for form validation, date-fns for dates
- Package manager: **npm**

## Prerequisites

- Node 20+ and npm 10+
- Xcode (iOS) and/or Android Studio (Android) for simulators
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`brew install supabase/tap/supabase`)
- An [Expo](https://expo.dev) account + `npm i -g eas-cli` for builds

## 1. Install dependencies

```bash
npm install
```

## 2. Supabase setup

1. Create a project at [database.new](https://database.new). Note the project ref, URL, and anon key (Settings → API).
2. Link and push migrations:

   ```bash
   supabase login
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```

   Migrations live in `supabase/migrations/` and create all tables, enums, RPC functions, RLS policies, storage buckets, and seed data.

3. Storage buckets — created by the storage migration. If you need to create them manually, make these **public** buckets:
   - `avatars`
   - `feed-media`
   - `event-images`
   - `partner-images`
   - `course-images`

4. Deploy the push Edge Function:

   ```bash
   supabase functions deploy send-push
   ```

## 3. Environment variables

```bash
cp .env.example .env
```

Fill in:

```env
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
EXPO_PUBLIC_USE_MOCK_DATA=false
```

Never put the service role key in the app. Never commit `.env`.

## 4. Run the app

```bash
npm start          # Expo dev server (press i for iOS, a for Android)
npm run ios
npm run android
npm run typecheck  # tsc --noEmit
npm run lint
```

## 5. Promote the first super admin

Sign up in the app, then run this in the Supabase SQL editor:

```sql
update public.profiles
set role = 'super_admin', status = 'approved', approved_at = now()
where email = 'you@example.com';
```

Admin tools appear under the **More** tab for admin/super_admin roles.

## Mock mode

Set `EXPO_PUBLIC_USE_MOCK_DATA=true` in `.env` to run screens against local
mock data with no backend (see `src/lib/mockMode.ts`). Default is `false`.

## EAS builds

```bash
eas login
eas build:configure

eas build --profile development --platform ios      # dev client
eas build --profile preview --platform all           # internal distribution
eas build --profile production --platform all        # store builds
eas submit --platform ios
```

Set `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` as EAS
environment variables (or in `eas.json` env blocks) for cloud builds.

## Project layout

```
src/
  app/
    providers/     AuthProvider (session + profile + roles), QueryProvider
    navigation/    RootNavigator (auth guard), 5 tab stacks, deep links (prc://)
  screens/         One folder per domain (auth, feed, events, checkin, ...)
  components/      ui/ primitives + EventCard, PostCard
  hooks/           React Query hooks (one file per domain) + queryKeys factory
  services/        All Supabase access lives here — screens never query directly
  lib/             supabase client, validation (zod), time utils, copy, haptics
  theme/           colors / spacing / typography tokens
  types/           models.ts (DB shapes), navigation.ts (typed param lists)
supabase/
  migrations/      SQL migrations (run with `supabase db push`)
  functions/       send-push Edge Function
```

## Conventions

- Sensitive writes (RSVP, check-ins, points, badges, approvals) go through
  Postgres RPC functions — never direct table writes from the client.
- Every service function throws on error; hooks surface errors via React Query.
- Every list is a FlatList. Every screen handles loading/empty/error states.
- Images are compressed (max 1600px, 0.8 JPEG) before upload.
- Deep links: `prc://event/:id`, `prc://post/:id`, `prc://perk/:id`.

## Placeholder assets

`assets/icon.png`, `assets/splash.png`, and `assets/adaptive-icon.png` are
solid-color placeholders — replace with real brand art before store submission.
