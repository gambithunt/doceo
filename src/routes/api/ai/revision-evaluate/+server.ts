import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { invokeAuthenticatedAiEdge } from '$lib/server/ai-edge';
import { getAiConfig, resolveAiRoute } from '$lib/server/ai-config';
import type { RevisionEvaluationPayload } from '$lib/types';

interface RevisionEvaluateRequest {
  answer: string;
  question: {
    id: string;
    questionType: string;
    prompt: string;
    expectedSkills: string[];
    misconceptionTags: string[];
  };
  topic: {
    topicTitle: string;
    subject: string;
  };
}

const RevisionEvaluateBodySchema = z.object({
  request: z.object({
    answer: z.string(),
    question: z.object({
      id: z.string(),
      questionType: z.string(),
      prompt: z.string(),
      expectedSkills: z.array(z.string()),
      misconceptionTags: z.array(z.string())
    }),
    topic: z.object({
      topicTitle: z.string(),
      subject: z.string()
    })
  })
});

function buildRevisionEvaluateSystemPrompt(): string {
  return `You are Doceo, an AI assistant that evaluates student answers to revision questions.

Your task is to score the student's answer against the question's requirements, providing structured feedback on correctness, reasoning, and completeness.

Evaluation criteria:
- **correctness**: How factually accurate is the answer? Score 0-1 based on alignment with expected skills and misconception avoidance.
- **reasoning**: Does the answer show logical thinking and explanation? Score 0-1 based on structure and depth.
- **completeness**: How many of the question's expected skills are addressed? Score 0-1 based on coverage of required concepts.
- **confidenceAlignment**: (Computed from user self-confidence vs. your scores)
- **selfConfidenceScore**: (User-provided, 0-1)
- **calibrationGap**: (Computed from confidence vs. correctness)

Return valid JSON only with top-level keys: correctness, reasoning, completeness (all 0-1 floats).`;
}

function buildRevisionEvaluateUserPrompt(request: RevisionEvaluateRequest): string {
  return JSON.stringify({
    question: {
      prompt: request.question.prompt,
      expectedSkills: request.question.expectedSkills,
      misconceptionTags: request.question.misconceptionTags
    },
    topic: request.topic,
    studentAnswer: request.answer
  });
}

export async function POST({ request, fetch }) {
  try {
    const body = await request.json();
    const { request: evalRequest } = RevisionEvaluateBodySchema.parse(body);

    const aiConfig = await getAiConfig();
    const resolved = resolveAiRoute(aiConfig, 'revision-evaluate');

    const aiResult = await invokeAuthenticatedAiEdge<{ content: string; provider: string; model: string }>(
      request,
      fetch,
      'revision-evaluate',
      {
        mode: 'revision-evaluate',
        messages: [
          { role: 'system', content: buildRevisionEvaluateSystemPrompt() },
          { role: 'user', content: buildRevisionEvaluateUserPrompt(evalRequest) }
        ]
      },
      undefined,
      resolved.model
    );

    if (!aiResult.ok || !aiResult.payload) {
      return json({ error: aiResult.error ?? 'AI evaluation failed' }, { status: 502 });
    }

    const rawContent = aiResult.payload.content
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();
    const scores = JSON.parse(rawContent);

    if (typeof scores.correctness !== 'number' || typeof scores.reasoning !== 'number' || typeof scores.completeness !== 'number') {
      return json({ error: 'Invalid AI response format' }, { status: 502 });
    }

    const evaluationResult: RevisionEvaluationPayload = {
      scores: {
        correctness: Math.max(0, Math.min(1, scores.correctness)),
        reasoning: Math.max(0, Math.min(1, scores.reasoning)),
        completeness: Math.max(0, Math.min(1, scores.completeness)),
        confidenceAlignment: 0.5,
        selfConfidenceScore: 0.5,
        calibrationGap: 0
      },
      provider: aiResult.payload.provider,
      model: aiResult.payload.model
    };

    return json(evaluationResult);
  } catch (error) {
    console.error('[revision-evaluate]', error instanceof Error ? error.message : error);
    return json({ error: 'Failed to evaluate answer' }, { status: 500 });
  }
}
