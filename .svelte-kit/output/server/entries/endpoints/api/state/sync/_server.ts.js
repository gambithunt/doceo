import { json } from "@sveltejs/kit";
import { z } from "zod";
import { s as saveAppState } from "../../../../../chunks/state-repository.js";
const SyncBodySchema = z.object({
  state: z.object({ profile: z.object({ id: z.string() }).passthrough() }).passthrough()
});
async function POST({ request }) {
  const raw = await request.json();
  const parsed = SyncBodySchema.safeParse(raw);
  if (!parsed.success) {
    return json({ persisted: false, reason: parsed.error.message }, { status: 400 });
  }
  const result = await saveAppState(parsed.data.state);
  return json(result);
}
export {
  POST
};
