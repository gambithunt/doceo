import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { invokeAuthenticatedAiEdge } from '$lib/server/ai-edge';
import { getAiConfig, resolveAiRoute } from '$lib/server/ai-config';
import { logAiInteraction, logLessonSignal } from '$lib/server/state-repository';
import { evaluateLessonResponseHeuristically } from '$lib/server/lesson-evaluate';
import type { DoceoMeta, LessonEvaluationRequest, LessonEvaluationResult, LoopEvidence } from '$lib/types';

const LessonEvaluateBodySchema = z.object({
  request: z.object({
    studentId: z.string().min(1),
    lessonSessionId: z.string().min(1),
    nodeId: z.string().min(1).nullable().optional(),
    lessonArtifactId: z.string().min(1).nullable().optional(),
    loopId: z.string().min(1).nullable().optional(),
    loopIndex: z.number().int().min(0).nullable().optional(),
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
- mustHitConceptsMet (array of strings from mustHitConcepts that the answer demonstrates)
- missingMustHitConcepts (array of strings from mustHitConcepts NOT demonstrated)
- criticalMisconceptions (array of strings from criticalMisconceptionTags triggered by the answer)
- feedback (string - short, concrete, names the exact missing or wrong idea)
- mode ("advance" | "targeted_revision" | "remediation" | "skip_with_accountability")
- loopEvidence (object - see schema below)

loopEvidence schema:
{
  "conceptsMet": [],
  "gaps": [],
  "misconceptions": [],
  "score": 0.0,
  "styleSignals": {
    "neededScaffolding": false,
    "askedClarifyingQuestion": false,
    "answeredOnFirstAttempt": false,
    "explanationWasVague": false,
    "usedConcreteLanguage": false
  }
}

Advancement rules:
- Advance only when score >= 0.75 AND all must-hit concepts covered AND no critical misconception.
- targeted_revision when score 0.50-0.74 with no critical misconception AND revisionAttemptCount is 0.
- remediation when critical misconception present, OR score < 0.50, OR revision already used.
- skip_with_accountability when remediationStep is already "worked_example" and score still < 0.75.
- feedback must name the exact missing concept or triggered misconception by its label.`;
}

function buildLessonEvaluateUserPrompt(request: LessonEvaluationRequest): string {
  return JSON.stringify({
    checkpoint: request.checkpoint,
    loopId: request.loopId ?? null,
    loopIndex: request.loopIndex ?? null,
    lesson: request.lesson,
    revisionAttemptCount: request.revisionAttemptCount,
    remediationStep: request.remediationStep,
    studentAnswer: request.answer
  });
}

function stringArray(value: unknown): string[] | null {
  return Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : null;
}

function normalizeLoopEvidence(raw: unknown, result: LessonEvaluationResult): LoopEvidence | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const input = raw as Record<string, unknown>;
  const styleSignals = input.styleSignals;

  if (
    typeof input.score !== 'number' ||
    !styleSignals ||
    typeof styleSignals !== 'object'
  ) {
    return null;
  }

  const signals = styleSignals as Record<string, unknown>;
  const conceptsMet = stringArray(input.conceptsMet) ?? result.mustHitConceptsMet;
  const gaps = stringArray(input.gaps) ?? result.missingMustHitConcepts;
  const misconceptions = stringArray(input.misconceptions) ?? result.criticalMisconceptions;

  if (
    !conceptsMet ||
    !gaps ||
    !misconceptions ||
    typeof signals.neededScaffolding !== 'boolean' ||
    typeof signals.askedClarifyingQuestion !== 'boolean' ||
    typeof signals.answeredOnFirstAttempt !== 'boolean' ||
    typeof signals.explanationWasVague !== 'boolean' ||
    typeof signals.usedConcreteLanguage !== 'boolean'
  ) {
    return null;
  }

  return {
    loopId: typeof input.loopId === 'string' ? input.loopId : 'unknown',
    loopIndex: typeof input.loopIndex === 'number' ? input.loopIndex : 0,
    loopTitle: typeof input.loopTitle === 'string' ? input.loopTitle : 'Unknown loop',
    conceptsMet,
    gaps,
    misconceptions,
    score: Math.max(0, Math.min(1, input.score)),
    attemptCount: typeof input.attemptCount === 'number' ? input.attemptCount : 1,
    styleSignals: {
      neededScaffolding: signals.neededScaffolding,
      askedClarifyingQuestion: signals.askedClarifyingQuestion,
      answeredOnFirstAttempt: signals.answeredOnFirstAttempt,
      explanationWasVague: signals.explanationWasVague,
      usedConcreteLanguage: signals.usedConcreteLanguage
    },
    evaluatedAt: typeof input.evaluatedAt === 'string' ? input.evaluatedAt : new Date().toISOString()
  };
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

    const result: LessonEvaluationResult = {
      score: Math.max(0, Math.min(1, parsed.score)),
      mustHitConceptsMet: parsed.mustHitConceptsMet.filter((item): item is string => typeof item === 'string'),
      missingMustHitConcepts: parsed.missingMustHitConcepts.filter((item): item is string => typeof item === 'string'),
      criticalMisconceptions: parsed.criticalMisconceptions.filter((item): item is string => typeof item === 'string'),
      feedback: parsed.feedback,
      mode: parsed.mode as LessonEvaluationResult['mode'],
      provider: payload.provider,
      model: payload.model
    };

    return {
      ...result,
      loopEvidence: normalizeLoopEvidence(parsed.loopEvidence, result) ?? null
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
