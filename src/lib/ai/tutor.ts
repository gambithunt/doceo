import { buildAskQuestionResponse } from '$lib/data/platform';
import type { AskQuestionRequest, AskQuestionResponse } from '$lib/types';

export interface GithubModelsMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GithubModelsRequestBody {
  model: string;
  messages: GithubModelsMessage[];
  temperature: number;
}

export interface GithubModelsSuccessResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export function createTutorSystemPrompt(): string {
  return [
    'You are a structured school teacher inside an AI learning platform.',
    'Never behave like a free-form chatbot.',
    'Guide the student one step at a time.',
    'Do not dump the answer unless guidance has already been attempted or the student explicitly requests the full worked answer.',
    'Keep explanations age-appropriate and concise.',
    'Return JSON only with exactly these keys: problemType, studentGoal, diagnosis, responseStage, teacherResponse, checkForUnderstanding.'
  ].join(' ');
}

export function createTutorUserPrompt(request: AskQuestionRequest): string {
  return JSON.stringify({
    mode: 'ask-question',
    request,
    required_output: {
      problemType: 'concept | procedural | word_problem | proof | revision',
      studentGoal: 'string',
      diagnosis: 'string',
      responseStage: 'clarify | hint | guided_step | worked_example | final_explanation',
      teacherResponse: 'string',
      checkForUnderstanding: 'string'
    }
  });
}

export function createGithubModelsBody(
  request: AskQuestionRequest,
  model: string
): GithubModelsRequestBody {
  return {
    model,
    temperature: 0.3,
    messages: [
      {
        role: 'system',
        content: createTutorSystemPrompt()
      },
      {
        role: 'user',
        content: createTutorUserPrompt(request)
      }
    ]
  };
}

export function parseGithubModelsResponse(
  payload: GithubModelsSuccessResponse
): AskQuestionResponse | null {
  const content = payload.choices[0]?.message.content;

  if (!content) {
    return null;
  }

  try {
    const parsed = JSON.parse(content) as Partial<AskQuestionResponse> & {
      solution?: {
        equation?: string;
        step_1?: string;
        calculation?: string;
        result?: string;
      };
    };

    if (
      parsed.problemType &&
      parsed.studentGoal &&
      parsed.diagnosis &&
      parsed.responseStage &&
      parsed.teacherResponse &&
      parsed.checkForUnderstanding
    ) {
      return parsed as AskQuestionResponse;
    }

    if (parsed.solution) {
      return {
        problemType: 'procedural',
        studentGoal: 'Help the student understand the next solving step.',
        diagnosis: 'The model returned a worked structure instead of the requested tutoring contract.',
        responseStage: 'worked_example',
        teacherResponse: [
          parsed.solution.step_1,
          parsed.solution.calculation,
          parsed.solution.result
        ]
          .filter((item): item is string => Boolean(item))
          .join('. '),
        checkForUnderstanding: 'Can you explain why dividing both sides keeps the equation balanced?'
      };
    }

    return null;
  } catch {
    return null;
  }
}

export function buildFallbackTutorResponse(request: AskQuestionRequest): AskQuestionResponse {
  return buildAskQuestionResponse(request);
}
