import { json } from "@sveltejs/kit";
import { b as loadAppState, i as isSupabaseConfigured } from "../../../../../chunks/state-repository.js";
const DEMO_PROFILE_ID = "student-demo";
async function GET() {
  const state = await loadAppState(DEMO_PROFILE_ID);
  return json({
    state,
    isConfigured: isSupabaseConfigured()
  });
}
export {
  GET
};
