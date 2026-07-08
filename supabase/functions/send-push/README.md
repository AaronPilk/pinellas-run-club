# send-push

Admin-only Expo push fan-out for Pinellas Run Club.

## What it does

1. Verifies the caller's JWT and requires `is_admin()` to be true.
2. Resolves targets: explicit `profileIds` or `all: true` (every approved member).
3. Inserts in-app `notifications` rows for each target.
4. Loads active `push_tokens`, sends to Expo's push API in batches of 100.
5. Marks tokens that come back `DeviceNotRegistered` as inactive.

## Request

```
POST /functions/v1/send-push
Authorization: Bearer <admin user access token>
Content-Type: application/json

{
  "all": true,                       // or "profileIds": ["uuid", ...]
  "title": "Run tomorrow!",
  "body": "Wednesday Social Run, 6:30 PM at North Shore Park.",
  "data": { "deepLink": "prc://events/<eventId>" }
}
```

Response: `{ "sent": 42, "notified": 50, "invalidTokens": 2 }`

## Deploy

```bash
supabase functions deploy send-push
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are
injected automatically by the Supabase platform — no manual secrets needed.

Local testing:

```bash
supabase functions serve send-push
curl -i -X POST http://127.0.0.1:54321/functions/v1/send-push \
  -H "Authorization: Bearer <admin access token>" \
  -H "Content-Type: application/json" \
  -d '{"all": true, "title": "Test", "body": "Hello runners"}'
```

Note: JWT verification is enabled (`verify_jwt = true` in `supabase/config.toml`),
so unauthenticated requests are rejected at the gateway before the function runs.
