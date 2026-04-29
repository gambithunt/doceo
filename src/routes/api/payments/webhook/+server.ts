import { json } from '@sveltejs/kit';
import { serverEnv } from '$lib/server/env';
import {
  markStripeWebhookEventFailed,
  markStripeWebhookEventIgnoredStale,
  markStripeWebhookEventProcessed,
  recordStripeWebhookEvent,
  upsertSubscriptionFromStripe
} from '$lib/server/subscription-repository';
import { getStripe } from '$lib/server/stripe';

const SUPPORTED_EVENTS = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_failed',
  'invoice.payment_succeeded'
]);

function toIsoDateTime(unixTimestamp: number | undefined): string | null {
  return typeof unixTimestamp === 'number' ? new Date(unixTimestamp * 1000).toISOString() : null;
}

function getEventLinks(event: { type: string; data: { object: Record<string, unknown> } }) {
  const object = event.data.object;

  if (event.type === 'checkout.session.completed') {
    return {
      stripeCustomerId:
        typeof object.customer === 'string'
          ? object.customer
          : ((object.customer as { id?: string } | null | undefined)?.id ?? null),
      stripeSubscriptionId:
        typeof object.subscription === 'string'
          ? object.subscription
          : ((object.subscription as { id?: string } | null | undefined)?.id ?? null)
    };
  }

  if (event.type === 'invoice.payment_failed' || event.type === 'invoice.payment_succeeded') {
    return {
      stripeCustomerId:
        typeof object.customer === 'string'
          ? object.customer
          : ((object.customer as { id?: string } | null | undefined)?.id ?? null),
      stripeSubscriptionId:
        typeof object.subscription === 'string'
          ? object.subscription
          : ((object.subscription as { id?: string } | null | undefined)?.id ?? null)
    };
  }

  return {
    stripeCustomerId:
      typeof object.customer === 'string'
        ? object.customer
        : ((object.customer as { id?: string } | null | undefined)?.id ?? null),
    stripeSubscriptionId: typeof object.id === 'string' ? object.id : null
  };
}

export async function POST({ request }) {
  const signature = request.headers.get('stripe-signature');

  if (!signature || !serverEnv.stripeWebhookSecret) {
    return json({ error: 'Invalid Stripe signature.' }, { status: 400 });
  }

  const rawBody = await request.text();

  try {
    const event = getStripe().webhooks.constructEvent(rawBody, signature, serverEnv.stripeWebhookSecret);

    if (SUPPORTED_EVENTS.has(event.type)) {
      const links = getEventLinks(event as unknown as { type: string; data: { object: Record<string, unknown> } });
      const recorded = await recordStripeWebhookEvent({
        eventId: event.id,
        eventType: event.type,
        stripeCustomerId: links.stripeCustomerId,
        stripeSubscriptionId: links.stripeSubscriptionId,
        stripeCreatedAt: toIsoDateTime(event.created)
      });

      if (recorded.duplicate) {
        return json({ received: true });
      }

      try {
        const result = await upsertSubscriptionFromStripe(event);
        if (result === 'ignored_stale') {
          await markStripeWebhookEventIgnoredStale(event.id);
        } else {
          await markStripeWebhookEventProcessed(event.id);
        }
      } catch (error) {
        await markStripeWebhookEventFailed(
          event.id,
          error instanceof Error ? error.message : 'Stripe webhook processing failed.'
        );
        throw error;
      }
    }

    return json({ received: true });
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'Invalid Stripe signature.' },
      { status: 400 }
    );
  }
}
