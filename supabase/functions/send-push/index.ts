// Pinellas Run Club — send-push edge function
// Admin-only fan-out of Expo push notifications.
//
// POST body:
//   {
//     profileIds?: string[];  // target specific members
//     all?: boolean;          // or target every approved member
//     title: string;
//     body?: string;
//     data?: Record<string, unknown>; // deep link payload etc.
//   }
//
// Behavior:
//   1. Verifies the caller's JWT and requires is_admin() = true.
//   2. Loads active Expo push tokens for the targets (service role).
//   3. Inserts in-app notification rows for the targets.
//   4. Sends to Expo in chunks of 100.
//   5. Marks DeviceNotRegistered tokens inactive.

import { createClient } from 'npm:@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const CHUNK_SIZE = 100;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface SendPushRequest {
  profileIds?: string[];
  all?: boolean;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: 'Missing Supabase environment configuration' }, 500);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'Missing Authorization header' }, 401);
  }

  // Caller-scoped client: validates the JWT and runs is_admin() as the caller.
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const {
    data: { user },
    error: userError,
  } = await callerClient.auth.getUser();

  if (userError || !user) {
    return jsonResponse({ error: 'Invalid or expired token' }, 401);
  }

  const { data: isAdmin, error: adminError } = await callerClient.rpc('is_admin');
  if (adminError || isAdmin !== true) {
    return jsonResponse({ error: 'Admins only' }, 403);
  }

  let payload: SendPushRequest;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const { profileIds, all, title, body, data } = payload;

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return jsonResponse({ error: 'title is required' }, 400);
  }
  if (!all && (!Array.isArray(profileIds) || profileIds.length === 0)) {
    return jsonResponse({ error: 'Provide profileIds or all: true' }, 400);
  }

  // Service client for privileged reads/writes (never exposed to callers).
  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // Resolve target profiles
  let targetProfileIds: string[] = [];
  if (all) {
    const { data: profiles, error } = await serviceClient
      .from('profiles')
      .select('id')
      .eq('status', 'approved')
      .is('deleted_at', null);
    if (error) return jsonResponse({ error: `Failed to load members: ${error.message}` }, 500);
    targetProfileIds = (profiles ?? []).map((p: { id: string }) => p.id);
  } else {
    targetProfileIds = profileIds!;
  }

  if (targetProfileIds.length === 0) {
    return jsonResponse({ sent: 0, notified: 0, invalidTokens: 0, message: 'No targets' });
  }

  // Insert in-app notification rows
  const notificationRows = targetProfileIds.map((profileId) => ({
    profile_id: profileId,
    type: 'announcement',
    title,
    body: body ?? null,
    deep_link: typeof data?.deepLink === 'string' ? (data.deepLink as string) : null,
  }));

  const { error: notifError } = await serviceClient.from('notifications').insert(notificationRows);
  if (notifError) {
    console.error('Failed to insert notifications:', notifError.message);
  }

  // Load active push tokens for the targets
  const { data: tokens, error: tokenError } = await serviceClient
    .from('push_tokens')
    .select('id, expo_push_token, profile_id')
    .eq('active', true)
    .in('profile_id', targetProfileIds);

  if (tokenError) {
    return jsonResponse({ error: `Failed to load push tokens: ${tokenError.message}` }, 500);
  }

  const activeTokens = tokens ?? [];
  if (activeTokens.length === 0) {
    return jsonResponse({ sent: 0, notified: targetProfileIds.length, invalidTokens: 0 });
  }

  // Fan out to Expo in chunks of 100
  const invalidTokenIds: string[] = [];
  let sentCount = 0;

  for (const batch of chunk(activeTokens, CHUNK_SIZE)) {
    const messages = batch.map((t) => ({
      to: t.expo_push_token,
      sound: 'default',
      title,
      body: body ?? '',
      data: data ?? {},
    }));

    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      const result = await response.json();
      const tickets: Array<{ status: string; details?: { error?: string } }> = result?.data ?? [];

      tickets.forEach((ticket, index) => {
        if (ticket.status === 'ok') {
          sentCount += 1;
        } else if (ticket.details?.error === 'DeviceNotRegistered') {
          invalidTokenIds.push(batch[index].id);
        }
      });
    } catch (err) {
      console.error('Expo push batch failed:', err);
    }
  }

  // Deactivate dead tokens
  if (invalidTokenIds.length > 0) {
    const { error: deactivateError } = await serviceClient
      .from('push_tokens')
      .update({ active: false })
      .in('id', invalidTokenIds);
    if (deactivateError) {
      console.error('Failed to deactivate tokens:', deactivateError.message);
    }
  }

  return jsonResponse({
    sent: sentCount,
    notified: targetProfileIds.length,
    invalidTokens: invalidTokenIds.length,
  });
});
