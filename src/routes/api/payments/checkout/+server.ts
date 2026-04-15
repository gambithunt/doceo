import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { createServerSupabaseFromRequest } from '$lib/server/supabase';
import { getStripe, getTierConfig } from '$lib/server/stripe';

const TierSchema = z.enum(['basic', 'standard', 'premium']);

export async function POST({ request }) {
  const requestUrl = new URL(request.url);
  const parsed = TierSchema.safeParse(requestUrl.searchParams.get('tier'));

  if (!parsed.success) {
    return json({ error: 'Invalid tier.' }, { status: 400 });
  }

  const supabase = createServerSupabaseFromRequest(request);
  const authResult = supabase ? await supabase.auth.getUser() : null;
  const user = authResult?.data.user ?? null;

  if (!user) {
    return json({ error: 'Authentication required.' }, { status: 401 });
  }

  const tier = parsed.data;
  const tierConfig = getTierConfig(tier);

  if (!tierConfig) {
    return json({ error: 'Stripe price configuration missing.' }, { status: 500 });
  }

  const stripe = getStripe();
  const dashboardUrl = new URL('/dashboard', request.url).toString();
  const successUrl = new URL('/dashboard?upgraded=true', request.url).toString();
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: tierConfig.priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: dashboardUrl,
    client_reference_id: user.id,
    ...(user.email ? { customer_email: user.email } : {}),
    metadata: {
      supabase_user_id: user.id,
      tier
    },
    subscription_data: {
      metadata: {
        supabase_user_id: user.id,
        tier
      }
    }
  });

  if (!session.url) {
    return json({ error: 'Stripe checkout unavailable.' }, { status: 502 });
  }

  return new Response(null, {
    status: 303,
    headers: {
      location: session.url
    }
  });
}
