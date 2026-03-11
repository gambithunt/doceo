import { json } from "@sveltejs/kit";
import { c as completeOnboarding } from "../../../../../chunks/onboarding-repository.js";
async function POST({ request }) {
  const payload = await request.json();
  const result = await completeOnboarding(payload);
  return json(result);
}
export {
  POST
};
