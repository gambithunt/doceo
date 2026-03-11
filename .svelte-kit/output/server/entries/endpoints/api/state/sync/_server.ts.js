import { json } from "@sveltejs/kit";
import { s as saveAppState } from "../../../../../chunks/state-repository.js";
async function POST({ request }) {
  const payload = await request.json();
  const result = await saveAppState(payload.state);
  return json(result);
}
export {
  POST
};
