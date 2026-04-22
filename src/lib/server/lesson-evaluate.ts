import type { LessonEvaluationRequest, LessonEvaluationResult } from '$lib/types';

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function conceptCovered(answer: string, concept: string): boolean {
  const normalizedAnswer = normalizeText(answer);
  const normalizedConcept = normalizeText(concept);

  if (!normalizedConcept) {
    return false;
  }

  if (normalizedAnswer.includes(normalizedConcept)) {
    return true;
  }

  const conceptWords = normalizedConcept.split(' ').filter((word) => word.length > 3);
  return conceptWords.length > 0 && conceptWords.every((word) => normalizedAnswer.includes(word));
}

function misconceptionDetected(answer: string, tag: string): boolean {
  const normalizedAnswer = normalizeText(answer);
  const normalizedTag = normalizeText(tag.replace(/-/g, ' '));

  if (!normalizedTag) {
    return false;
  }

  if (normalizedAnswer.includes(normalizedTag)) {
    return true;
  }

  const tagWords = normalizedTag.split(' ').filter((word) => word.length > 3);
  return tagWords.length > 1 && tagWords.every((word) => normalizedAnswer.includes(word));
}

export function evaluateLessonResponseHeuristically(request: LessonEvaluationRequest): LessonEvaluationResult {
  const mustHitConceptsMet = request.lesson.mustHitConcepts.filter((concept) => conceptCovered(request.answer, concept));
  const missingMustHitConcepts = request.lesson.mustHitConcepts.filter((concept) => !mustHitConceptsMet.includes(concept));
  const criticalMisconceptions = request.lesson.criticalMisconceptionTags.filter((tag) =>
    misconceptionDetected(request.answer, tag)
  );
  const normalizedAnswer = normalizeText(request.answer);
  const detailSignal = Math.min(0.25, normalizedAnswer.split(' ').filter(Boolean).length / 40);
  const mustHitSignal =
    request.lesson.mustHitConcepts.length === 0
      ? 0.5
      : mustHitConceptsMet.length / request.lesson.mustHitConcepts.length;
  const misconceptionPenalty = criticalMisconceptions.length > 0 ? 0.45 : 0;
  const rawScore = Math.max(0, Math.min(1, 0.25 + mustHitSignal * 0.6 + detailSignal - misconceptionPenalty));
  const score =
    missingMustHitConcepts.length > 0 && rawScore >= 0.75
      ? 0.74
      : rawScore;

  let mode: LessonEvaluationResult['mode'];
  if (criticalMisconceptions.length > 0) {
    mode = 'remediation';
  } else if (missingMustHitConcepts.length === 0 && score >= 0.75) {
    mode = 'advance';
  } else if (score >= 0.5 && request.revisionAttemptCount === 0) {
    mode = 'targeted_revision';
  } else if (request.remediationStep === 'worked_example') {
    mode = 'skip_with_accountability';
  } else {
    mode = 'remediation';
  }

  const feedback =
    mode === 'advance'
      ? 'You hit the required idea clearly enough to move on.'
      : mode === 'targeted_revision'
        ? `Revise this once by fixing: ${missingMustHitConcepts.join(', ') || 'precision and completeness'}.`
        : mode === 'skip_with_accountability'
          ? `This gap is being marked to revisit: ${missingMustHitConcepts.join(', ') || 'core concept still missing'}.`
          : `This needs support on: ${criticalMisconceptions[0] ?? missingMustHitConcepts[0] ?? 'the core concept'}.`;

  return {
    score,
    mustHitConceptsMet,
    missingMustHitConcepts,
    criticalMisconceptions,
    feedback,
    mode,
    provider: 'local-heuristic',
    model: 'local-heuristic'
  };
}
