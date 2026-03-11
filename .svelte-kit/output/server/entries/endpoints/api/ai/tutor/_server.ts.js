import { json } from "@sveltejs/kit";
import { b as buildAskQuestionResponse } from "../../../../../chunks/platform.js";
import { g as getSupabaseFunctionsUrl, a as getSupabaseAnonKey, s as serverEnv, l as logAiInteraction } from "../../../../../chunks/state-repository.js";
function createTutorSystemPrompt() {
  return [
    "You are a structured school teacher inside an AI learning platform.",
    "Never behave like a free-form chatbot.",
    "Guide the student one step at a time.",
    "Do not dump the answer unless guidance has already been attempted or the student explicitly requests the full worked answer.",
    "Keep explanations age-appropriate and concise.",
    "Return JSON only."
  ].join(" ");
}
function createTutorUserPrompt(request) {
  return JSON.stringify({
    mode: "ask-question",
    request,
    required_output: {
      problemType: "concept | procedural | word_problem | proof | revision",
      studentGoal: "string",
      diagnosis: "string",
      responseStage: "clarify | hint | guided_step | worked_example | final_explanation",
      teacherResponse: "string",
      checkForUnderstanding: "string"
    }
  });
}
function createGithubModelsBody(request, model) {
  return {
    model,
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content: createTutorSystemPrompt()
      },
      {
        role: "user",
        content: createTutorUserPrompt(request)
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "ask_question_response",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            problemType: {
              type: "string",
              enum: ["concept", "procedural", "word_problem", "proof", "revision"]
            },
            studentGoal: { type: "string" },
            diagnosis: { type: "string" },
            responseStage: {
              type: "string",
              enum: ["clarify", "hint", "guided_step", "worked_example", "final_explanation"]
            },
            teacherResponse: { type: "string" },
            checkForUnderstanding: { type: "string" }
          },
          required: [
            "problemType",
            "studentGoal",
            "diagnosis",
            "responseStage",
            "teacherResponse",
            "checkForUnderstanding"
          ]
        }
      }
    }
  };
}
function parseGithubModelsResponse(payload) {
  const content = payload.choices[0]?.message.content;
  if (!content) {
    return null;
  }
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}
function buildFallbackTutorResponse(request) {
  return buildAskQuestionResponse(request);
}
function hasGithubModelsConfig() {
  return serverEnv.githubModelsToken.length > 0 && serverEnv.githubModelsEndpoint.length > 0 && serverEnv.githubModelsModel.length > 0 && !serverEnv.githubModelsToken.includes("your-github-models-token");
}
async function POST({ request, fetch }) {
  const payload = await request.json();
  const functionsUrl = getSupabaseFunctionsUrl();
  const anonKey = getSupabaseAnonKey();
  if (functionsUrl && anonKey) {
    const functionResponse = await fetch(`${functionsUrl}/github-models-tutor`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${anonKey}`
      },
      body: JSON.stringify({
        request: payload.request,
        profileId: payload.profileId
      })
    });
    if (functionResponse.ok) {
      const functionPayload = await functionResponse.json();
      return json(functionPayload);
    }
  }
  if (!hasGithubModelsConfig()) {
    const fallback = buildFallbackTutorResponse(payload.request);
    return json({
      response: fallback,
      provider: "local-fallback"
    });
  }
  const body = createGithubModelsBody(
    payload.request,
    serverEnv.githubModelsModel
  );
  const response = await fetch(serverEnv.githubModelsEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serverEnv.githubModelsToken}`
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const fallback = buildFallbackTutorResponse(payload.request);
    return json(
      {
        response: fallback,
        provider: "local-fallback",
        error: `GitHub Models request failed with ${response.status}`
      },
      {
        status: 200
      }
    );
  }
  const responsePayload = await response.json();
  const parsed = parseGithubModelsResponse(responsePayload) ?? buildFallbackTutorResponse(payload.request);
  await logAiInteraction(
    payload.profileId,
    JSON.stringify(payload.request),
    JSON.stringify(parsed),
    "github-models"
  );
  return json({
    response: parsed,
    provider: "github-models"
  });
}
export {
  POST
};
