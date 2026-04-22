import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { invokeAuthenticatedAiEdge } from '$lib/server/ai-edge';
import { getAiConfig, resolveAiRoute } from '$lib/server/ai-config';
import { logAiInteraction, logLessonSignal } from '$lib/server/state-repository';
import { evaluateLessonResponseHeuristically } from '$lib/server/lesson-evaluate';
import type { DoceoMeta, LessonEvaluationRequest, LessonEvaluationResult } from '$lib/types';

const LessonEvaluateBodySchema = z.object({
  request: z.object({
    studentId: z.string().min(1),
    lessonSessionId: z.string().min(1),
    nodeId: z.string().min(1).nullable().optional(),
    lessonArtifactId: z.string().min(1).nullable().optional(),
    answer: z.string(),
    checkpoint: z.enum([
      'start',
      'loop_teach',
      'loop_example',
      'loop_practice',
      'loop_check',
      'synthesis',
      'independent_attempt',
      'exit_check',
      'complete'
    ]),
    lesson: z.object({
      topicTitle: z.string(),
      subject: z.string(),
      loopTitle: z.string().nullable(),
      prompt: z.string(),
      mustHitConcepts: z.array(z.string()),
      criticalMisconceptionTags: z.array(z.string())
    }),
    revisionAttemptCount: z.number().int().min(0),
    remediationStep: z.enum(['none', 'hint', 'scaffold', 'mini_reteach', 'worked_example'])
  })
});

function buildLessonEvaluateSystemPrompt(): string {
  return `You are Doceo, an AI assistant that evaluates lesson answers.

Return valid JSON only with these top-level keys:
- score (float 0.0-1.0)
- mustHitConceptsMet (array of strings)
- missingMustHitConcepts (array of strings)
- criticalMisconceptions (array of strings)
- feedback (string)
- mode ("advance" | "targeted_revision" | "remediation" | "skip_with_accountability")

Rules:
- A learner can advance only if score >= 0.75, all must-hit concepts are covered, and there is no critical misconception.
- If score is 0.5-0.74, return mode "targeted_revision" only when no critical misconception blocks the answer.
- Any critical misconception must block advancement.
- After the revision chance is already used, below-threshold answers should return "remediation" unless the ladder is already at worked_example, then return "skip_with_accountability".
- Feedback must be short, concrete, and name the exact missing or incorrect idea.`;
}

function buildLessonEvaluateUserPrompt(request: LessonEvaluationRequest): string {
  return JSON.stringify({
    checkpoint: request.checkpoint,
    lesson: request.lesson,
    revisionAttemptCount: request.revisionAttemptCount,
    remediationStep: request.remediationStep,
    studentAnswer: request.answer
  });
}

function parseLessonEvaluatePayload(payload: { content: string; provider: string; model: string }): LessonEvaluationResult | null {
  try {
    const rawContent = payload.content
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();
    const parsed = JSON.parse(rawContent) as Record<string, unknown>;

    if (
      typeof parsed.score !== 'number' ||
      !Array.isArray(parsed.mustHitConceptsMet) ||
      !Array.isArray(parsed.missingMustHitConcepts) ||
      !Array.isArray(parsed.criticalMisconceptions) ||
      typeof parsed.feedback !== 'string' ||
      !['advance', 'targeted_revision', 'remediation', 'skip_with_accountability'].includes(String(parsed.mode))
    ) {
      return null;
    }

    return {
      score: Math.max(0, Math.min(1, parsed.score)),
      mustHitConceptsMet: parsed.mustHitConceptsMet.filter((item): item is string => typeof item === 'string'),
      missingMustHitConcepts: parsed.missingMustHitConcepts.filter((item): item is string => typeof item === 'string'),
      criticalMisconceptions: parsed.criticalMisconceptions.filter((item): item is string => typeof item === 'string'),
      feedback: parsed.feedback,
      mode: parsed.mode as LessonEvaluationResult['mode'],
      provider: payload.provider,
      model: payload.model
    };
  } catch {
    return null;
  }
}

function buildLessonSignalMeta(
  evaluation: LessonEvaluationResult
): DoceoMeta {
  return {
    action:
      evaluation.mode === 'advance' || evaluation.mode === 'skip_with_accountability'
        ? 'advance'
        : evaluation.mode === 'targeted_revision'
          ? 'stay'
          : 'reteach',
    next_stage: null,
    reteach_style: evaluation.mode === 'remediation' ? 'step_by_step' : null,
    reteach_count: 0,
    confidence_assessment: evaluation.score,
    lesson_score: evaluation.score,
    must_hit_concepts_met: evaluation.mustHitConceptsMet,
    missing_must_hit_concepts: evaluation.missingMustHitConcepts,
    critical_misconceptions: evaluation.criticalMisconceptions,
    profile_update: {
      quiz_performance: evaluation.score,
      struggled_with:
        evaluation.mode === 'advance'
          ? []
          : [...evaluation.missingMustHitConcepts, ...evaluation.criticalMisconceptions].slice(0, 3)
    }
  };
}

export async function POST({ request, fetch }) {
  try {
    const body = await request.json();
    const parsed = LessonEvaluateBodySchema.parse(body);
    const evalRequest = parsed.request as LessonEvaluationRequest;

    const aiConfig = await getAiConfig();
    const resolved = resolveAiRoute(aiConfig, 'lesson-evaluate');

    const aiResult = await invokeAuthenticatedAiEdge<{ content: string; provider: string; model: string }>(
      request,
      fetch,
      'lesson-evaluate',
      {
        mode: 'lesson-evaluate',
        messages: [
          { role: 'system', content: buildLessonEvaluateSystemPrompt() },
          { role: 'user', content: buildLessonEvaluateUserPrompt(evalRequest) }
        ]
      },
      undefined,
      resolved.model
    );

    const evaluation =
      aiResult.ok && aiResult.payload
        ? parseLessonEvaluatePayload(aiResult.payload) ?? evaluateLessonResponseHeuristically(evalRequest)
        : evaluateLessonResponseHeuristically(evalRequest);

    await Promise.all([
      logAiInteraction(
        evalRequest.studentId,
        JSON.stringify(evalRequest),
        JSON.stringify(evaluation),
        aiResult.payload?.provider ?? evaluation.provider,
        {
          mode: 'lesson-evaluate',
          model: aiResult.payload?.model ?? evaluation.model,
          latencyMs: (aiResult.payload as { latencyMs?: number } | undefined)?.latencyMs ?? null
        }
      ),
      logLessonSignal(
        evalRequest.studentId,
        {
          id: evalRequest.lessonSessionId,
          subject: evalRequest.lesson.subject,
          topicTitle: evalRequest.lesson.topicTitle
        },
        buildLessonSignalMeta(evaluation)
      )
    ]);

    return json(evaluation);
  } catch (error) {
    console.error('[lesson-evaluate]', error instanceof Error ? error.message : error);
    return json({ error: 'Failed to evaluate lesson answer' }, { status: 500 });
  }
}
