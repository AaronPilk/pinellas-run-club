// Pinellas Run Club — stripe-webhook edge function
//
// Receives Stripe webhook events and syncs subscription state onto the member's
// profile. This is the ONLY writer of the subscription_* / stripe_* columns
// (the profiles trigger blocks everyone else). Runs as service role, so
// auth.uid() is null and the column-protection trigger lets it through.
//
// Deploy WITHOUT JWT verification (Stripe doesn't send a Supabase JWT):
//   supabase functions deploy stripe-webhook --no-verify-jwt
//
// Required function secrets:
//   STRIPE_SECRET_KEY      sk_live_... (or test)
//   STRIPE_WEBHOOK_SECRET  whsec_...  (from the Stripe webhook endpoint)
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.
//
// Point your Stripe webhook at:
//   https://<project-ref>.supabase.co/functions/v1/stripe-webhook
// Recommended events: checkout.session.completed,
//   customer.subscription.created, customer.subscription.updated,
//   customer.subscription.deleted.
//
// The app appends ?client_reference_id=<profileId>&prefilled_email=<email>
// to the Stripe checkout link, so checkout.session.completed maps cleanly.

import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@17';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-12-18.acacia',
  httpClient: Stripe.createFetchHttpClient(),
});
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } }
);

type SubscriptionFields = {
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  subscription_status: string | null;
  subscription_current_period_end: string | null;
  subscription_updated_at: string;
};

function isoFromUnix(seconds: number | null | undefined): string | null {
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

/** Update the matching profile row. Returns true if a row was updated. */
async function updateProfile(
  match: { column: string; value: string },
  fields: SubscriptionFields
): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .update(fields)
    .eq(match.column, match.value)
    .select('id');

  if (error) {
    console.error('[stripe-webhook] update error', match, error.message);
    return false;
  }
  return (data?.length ?? 0) > 0;
}

/** Resolve a Stripe customer id to a profile id via its email. */
async function profileIdFromCustomerEmail(customerId: string): Promise<string | null> {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) return null;
    const email = customer.email;
    if (!email) return null;
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', email)
      .is('deleted_at', null)
      .maybeSingle();
    return (data as { id: string } | null)?.id ?? null;
  } catch (err) {
    console.error('[stripe-webhook] customer lookup failed', err);
    return null;
  }
}

/** Apply a Stripe Subscription object to whichever profile it belongs to. */
async function syncSubscription(sub: Stripe.Subscription): Promise<void> {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  const fields: SubscriptionFields = {
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    subscription_status: sub.status,
    subscription_current_period_end: isoFromUnix(sub.current_period_end),
    subscription_updated_at: new Date().toISOString(),
  };

  // Match by subscription id, then customer id, then customer email.
  if (await updateProfile({ column: 'stripe_subscription_id', value: sub.id }, fields)) return;
  if (await updateProfile({ column: 'stripe_customer_id', value: customerId }, fields)) return;

  const profileId = await profileIdFromCustomerEmail(customerId);
  if (profileId) {
    await updateProfile({ column: 'id', value: profileId }, fields);
  } else {
    console.warn('[stripe-webhook] no profile for subscription', sub.id, customerId);
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const profileId = session.client_reference_id;
  const customerId =
    typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;
  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id ?? null;

  if (!subscriptionId) {
    console.warn('[stripe-webhook] checkout without subscription', session.id);
    return;
  }

  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const fields: SubscriptionFields = {
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    subscription_status: sub.status,
    subscription_current_period_end: isoFromUnix(sub.current_period_end),
    subscription_updated_at: new Date().toISOString(),
  };

  // client_reference_id (the profile id we sent) is the most reliable match.
  if (profileId && (await updateProfile({ column: 'id', value: profileId }, fields))) return;
  await syncSubscription(sub);
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature || !webhookSecret) {
    return new Response('Missing signature', { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error('[stripe-webhook] signature verification failed', err);
    return new Response('Invalid signature', { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      default:
        // Ignore everything else.
        break;
    }
  } catch (err) {
    console.error('[stripe-webhook] handler error', event.type, err);
    return new Response('Handler error', { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
