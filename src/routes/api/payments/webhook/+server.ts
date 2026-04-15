import { json } from '@sveltejs/kit';
import { serverEnv } from '$lib/server/env';
import { upsertSubscriptionFromStripe } from '$lib/server/subscription-repository';
import { getStripe } from '$lib/server/stripe';

const SUPPORTED_EVENTS = new Set([
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_failed'
]);

export async function POST({ request }) {
  const signature = request.headers.get('stripe-signature');

  if (!signature || !serverEnv.stripeWebhookSecret) {
    return json({ error: 'Invalid Stripe signature.' }, { status: 400 });
  }

  const rawBody = await request.text();

  try {
    const event = getStripe().webhooks.constructEvent(rawBody, signature, serverEnv.stripeWebhookSecret);

    if (SUPPORTED_EVENTS.has(event.type)) {
      await upsertSubscriptionFromStripe(event);
    }

    return json({ received: true });
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'Invalid Stripe signature.' },
      { status: 400 }
    );
  }
}
