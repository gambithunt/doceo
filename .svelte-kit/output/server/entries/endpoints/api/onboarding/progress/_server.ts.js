import { json } from "@sveltejs/kit";
import { l as loadOnboardingProgress, s as saveOnboardingProgress } from "../../../../../chunks/onboarding-repository.js";
async function GET({ url }) {
  const profileId = url.searchParams.get("profileId") ?? "";
  if (!profileId) {
    return json({ progress: null }, { status: 400 });
  }
  const progress = await loadOnboardingProgress(profileId);
  return json({ progress });
}
async function POST({ request }) {
  const payload = await request.json();
  const result = await saveOnboardingProgress(payload);
  return json(result);
}
export {
  GET,
  POST
};
