import { json } from '@sveltejs/kit';
import { resetOnboarding } from '$lib/server/onboarding-repository';

interface ResetOnboardingBody {
  profileId: string;
}

export async function POST({ request }) {
  const payload = (await request.json()) as ResetOnboardingBody;

  if (!payload.profileId) {
    return json({ reset: false, reason: 'Missing profileId' }, { status: 400 });
  }

  await resetOnboarding(payload.profileId);

  return json({ reset: true });
}
