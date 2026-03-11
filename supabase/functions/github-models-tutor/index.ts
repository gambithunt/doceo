interface AskQuestionRequest {
  question: string;
  topic: string;
  subject: string;
  grade: string;
  currentAttempt: string;
}

interface AskQuestionResponse {
  problemType: 'concept' | 'procedural' | 'word_problem' | 'proof' | 'revision';
  studentGoal: string;
  diagnosis: string;
  responseStage: 'clarify' | 'hint' | 'guided_step' | 'worked_example' | 'final_explanation';
  teacherResponse: string;
  checkForUnderstanding: string;
}

interface GithubModelsResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

function buildFallbackResponse(request: AskQuestionRequest): AskQuestionResponse {
  return {
    problemType: request.question.toLowerCase().includes('why') ? 'concept' : 'procedural',
    studentGoal: 'Make progress on the problem with guided support.',
    diagnosis:
      request.currentAttempt.trim().length === 0
        ? 'The learner needs a clarifying first step before more detail is given.'
        : 'The learner has started and needs a targeted next step rather than a full solution.',
    responseStage: request.currentAttempt.trim().length === 0 ? 'clarify' : 'guided_step',
    teacherResponse:
      request.currentAttempt.trim().length === 0
        ? `Start by identifying the rule or concept used in ${request.topic}. Tell me the first step you think applies.`
        : `Keep your current working and do one small next step only. Explain why that step is valid before continuing.`,
    checkForUnderstanding: `What is the next step you would try in ${request.topic}?`
  };
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const payload = (await request.json()) as { request: AskQuestionRequest };
  const githubToken = Deno.env.get('GITHUB_MODELS_TOKEN') ?? '';
  const githubEndpoint =
    Deno.env.get('GITHUB_MODELS_ENDPOINT') ?? 'https://models.github.ai/inference/chat/completions';
  const githubModel = Deno.env.get('GITHUB_MODELS_MODEL') ?? 'openai/gpt-4.1-mini';

  if (githubToken.length === 0 || githubToken.includes('your-github-models-token')) {
    return Response.json({
      response: buildFallbackResponse(payload.request),
      provider: 'local-fallback'
    });
  }

  const upstream = await fetch(githubEndpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${githubToken}`,
      'X-GitHub-Api-Version': '2022-11-28'
    },
    body: JSON.stringify({
      model: githubModel,
      temperature: 0.3,
      messages: [
        {
          role: 'system',
          content:
            'You are a structured school teacher. Guide one step at a time, keep explanations grade-appropriate, and return JSON only.'
        },
        {
          role: 'user',
          content: JSON.stringify(payload.request)
        }
      ]
    })
  });

  if (!upstream.ok) {
    return Response.json({
      response: buildFallbackResponse(payload.request),
      provider: 'local-fallback'
    });
  }

  const upstreamPayload = (await upstream.json()) as GithubModelsResponse;
  const content = upstreamPayload.choices[0]?.message.content;

  if (!content) {
    return Response.json({
      response: buildFallbackResponse(payload.request),
      provider: 'local-fallback'
    });
  }

  try {
    const parsed = JSON.parse(content) as AskQuestionResponse;
    return Response.json({
      response: parsed,
      provider: 'github-models'
    });
  } catch {
    return Response.json({
      response: buildFallbackResponse(payload.request),
      provider: 'local-fallback'
    });
  }
});
