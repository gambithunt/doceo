import { json } from "@sveltejs/kit";
import { l as logAiInteraction } from "../../../../../chunks/state-repository.js";
import { i as invokeAuthenticatedAiEdge } from "../../../../../chunks/ai-edge.js";
async function POST({ request, fetch }) {
  const payload = await request.json();
  const edge = await invokeAuthenticatedAiEdge(request, fetch, "tutor", payload.request);
  if (!edge.ok || !edge.payload) {
    return json({ error: edge.error }, { status: edge.status });
  }
  const functionPayload = edge.payload;
  if (functionPayload.provider !== "github-models") {
    return json({ error: "AI edge function returned invalid tutor data." }, { status: 502 });
  }
  await logAiInteraction(
    payload.profileId,
    JSON.stringify(payload.request),
    JSON.stringify(functionPayload.response),
    functionPayload.provider,
    {
      mode: "tutor",
      modelTier: functionPayload.modelTier,
      model: functionPayload.model
    }
  );
  return json(functionPayload);
}
export {
  POST
};
