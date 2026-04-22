import { describe, expect, it } from 'vitest';
import {
  buildFallbackLessonPlan,
  createLessonPlanBody,
  createLessonPlanSystemPrompt,
  parseLessonPlanResponse
} from '$lib/ai/lesson-plan';
import type { LessonPlanRequest } from '$lib/types';

const baseRequest: LessonPlanRequest = {
  student: {
    id: 'student-1',
    fullName: 'Test Student',
    email: 'test@example.com',
    role: 'student',
    schoolYear: '2026',
    term: 'Term 1',
    grade: 'Grade 10',
    gradeId: 'grade-10',
    country: 'South Africa',
    countryId: 'za',
    curriculum: 'CAPS',
    curriculumId: 'caps',
    recommendedStartSubjectId: null,
    recommendedStartSubjectName: null
  },
  subjectId: 'subject-math',
  subject: 'Mathematics',
  topicTitle: 'Quadratic Equations',
  topicDescription: 'Solving quadratic equations by factoring and the quadratic formula.',
  curriculumReference: 'CAPS · Grade 10 · Mathematics'
};

// ─── Phase 4.1: buildLessonPlanPrompt / system prompt ──────────────────────

describe('lesson-plan system prompt', () => {
  it('P4: createLessonPlanSystemPrompt requests all 9 section names', () => {
    const prompt = createLessonPlanSystemPrompt();
    const required = [
      'orientation', 'mentalModel', 'concepts', 'guidedConstruction',
      'workedExample', 'practicePrompt', 'commonMistakes', 'transferChallenge', 'summary'
    ];
    for (const section of required) {
      expect(prompt).toContain(section);
    }
  });

  it('P4: createLessonPlanSystemPrompt instructs AI to return JSON only', () => {
    const prompt = createLessonPlanSystemPrompt();
    expect(prompt.toLowerCase()).toMatch(/json/);
  });

  it('P4: createLessonPlanBody includes grade and subject in user message', () => {
    const body = createLessonPlanBody(baseRequest, 'gpt-4.1-mini');
    const userMsg = body.messages.find((m) => m.role === 'user');
    expect(userMsg?.content).toContain('Grade 10');
    expect(userMsg?.content).toContain('Mathematics');
    expect(userMsg?.content).toContain('Quadratic Equations');
  });

  it('P4: createLessonPlanBody includes grade-appropriate instruction', () => {
    const prompt = createLessonPlanSystemPrompt();
    expect(prompt.toLowerCase()).toMatch(/grade.appropriate|age.appropriate|level/i);
  });

  it('P4: createLessonPlanSystemPrompt requires self-contained concrete practice tasks', () => {
    const prompt = createLessonPlanSystemPrompt();
    expect(prompt).toContain('self-contained');
    expect(prompt).toContain('Do not ask the learner to invent their own practical example');
    expect(prompt).toContain('Prefer clear task verbs');
    expect(prompt).toContain('Do not use generic learner check lines');
  });

  it('requests loop-based lesson output for v2 generation', () => {
    const prompt = createLessonPlanSystemPrompt({ lessonFlowVersion: 'v2' });

    expect(prompt).toContain('start, concepts, loops, synthesis, independentAttempt, exitCheck');
    expect(prompt).toContain('loops');
    expect(prompt).toContain('one_line_definition');
    expect(prompt).toContain('quick_check');
    expect(prompt).toContain('curriculum_alignment');
    expect(prompt).toContain('mustHitConcepts');
    expect(prompt).toContain('criticalMisconceptionTags');
  });
});

// ─── Phase 4.2: parseLessonPlanResponse ────────────────────────────────────

function makeValidAiPayload(overrides: Record<string, unknown> = {}) {
  const baseLesson = {
    orientation: { title: 'Orientation', body: 'In this lesson you will learn about Quadratic Equations. The key idea is...' },
    mentalModel: { title: 'Big Picture', body: 'Think of quadratic equations as a parabola shape...' },
    concepts: { title: 'Key Concepts', body: 'A quadratic equation has the form ax² + bx + c = 0. The discriminant...' },
    guidedConstruction: { title: 'Guided Construction', body: '**Step 1.** Identify a, b, and c.\n\n**Step 2.** Try factoring...\n\n**Step 3.** Apply the formula...\n\n**Step 4.** Verify by substituting back.' },
    workedExample: { title: 'Worked Example', body: 'Solve x² − 5x + 6 = 0. Factors: (x−2)(x−3)=0, so x=2 or x=3.' },
    practicePrompt: { title: 'Active Practice', body: 'Try solving x² + 3x − 4 = 0. Write out each step.' },
    commonMistakes: { title: 'Common Mistakes', body: 'Students often forget to check that the equation equals zero before applying the formula.' },
    transferChallenge: { title: 'Transfer Challenge', body: 'Can you solve a quadratic where the leading coefficient is not 1?' },
    summary: { title: 'Summary', body: '**Core rule:** ax² + bx + c = 0. **Watch out for:** forgetting to rearrange to zero first. **Transfer:** If you can solve any quadratic, you\'re ready for graphs of parabolas.' },
    keyConcepts: [
      { name: 'The Quadratic Formula', summary: 'The formula for finding roots.', detail: 'x = (-b ± √(b²-4ac)) / 2a', example: 'For x²-5x+6: a=1, b=-5, c=6.' },
      { name: 'Discriminant', summary: 'Tells you the number of real roots.', detail: 'b²-4ac: positive = 2 roots, zero = 1 root, negative = no real roots.', example: 'b²-4ac = 25-24 = 1 > 0, so 2 real roots.' },
      { name: 'Factoring', summary: 'Finding two brackets that multiply to give the quadratic.', detail: 'Look for two numbers that multiply to c and add to b.', example: 'x²-5x+6 = (x-2)(x-3)' }
    ],
    ...overrides
  };
  return {
    choices: [{ message: { content: JSON.stringify(baseLesson) } }]
  };
}

function makeValidV2AiPayload(overrides: Record<string, unknown> = {}) {
  return {
    choices: [{
      message: {
        content: JSON.stringify({
          start: { title: 'Start', body: 'Quadratic equations help you find the x-values where a parabola crosses the axis.' },
          concepts: [
            {
              name: 'Standard Form',
              one_line_definition: 'A quadratic must be rewritten as ax^2 + bx + c = 0 before you choose a solving method.',
              example: '2x^2 + 4 = 6x becomes 2x^2 - 6x + 4 = 0.',
              quick_check: 'Rewrite x^2 + 9 = 4x into standard form.',
              concept_type: 'procedure',
              curriculum_alignment: {
                topic_match: 'Quadratic Equations',
                grade_match: 'Grade 10',
                alignment_note: 'Standard form is the entry point for solving quadratics in this topic.'
              },
              why_it_matters: 'It puts every term in one place so the structure of the quadratic is visible.',
              common_misconception: 'Trying to factor or use the formula before moving every term to one side.',
              extended_example: 'x^2 + 9 = 4x becomes x^2 - 4x + 9 = 0, which shows a = 1, b = -4, c = 9.'
            },
            {
              name: 'Factoring',
              one_line_definition: 'Factoring solves a quadratic by splitting it into brackets whose product is zero.',
              example: 'x^2 - 5x + 6 factors to (x - 2)(x - 3) = 0.',
              quick_check: 'Factor x^2 + x - 6.',
              concept_type: 'strategy',
              curriculum_alignment: {
                topic_match: 'Quadratic Equations',
                grade_match: 'Grade 10',
                alignment_note: 'Factoring is a core solving method at this level when simple factors exist.'
              },
              why_it_matters: 'It turns one quadratic expression into two simpler linear conditions.',
              common_misconception: 'Choosing numbers that multiply correctly but do not add to the middle coefficient.',
              extended_example: 'For x^2 + x - 6, the correct pair is 3 and -2 because 3 x -2 = -6 and 3 + -2 = 1.'
            },
            {
              name: 'Checking Solutions',
              one_line_definition: 'Substitute each solution back into the original equation to confirm it works.',
              example: 'If x = 2, then 2^2 - 5(2) + 6 = 4 - 10 + 6 = 0.',
              quick_check: 'Check whether x = -3 solves x^2 + x - 6 = 0.',
              concept_type: 'verification',
              curriculum_alignment: {
                topic_match: 'Quadratic Equations',
                grade_match: 'Grade 10',
                alignment_note: 'Checking solutions confirms that a factorised answer actually satisfies the equation.'
              },
              why_it_matters: 'A checked answer catches sign mistakes and false roots before you move on.',
              common_misconception: 'Stopping after factorising without testing the answers in the original equation.',
              extended_example: 'Substitute x = 3 into x^2 - 5x + 6 = 0 to confirm 9 - 15 + 6 = 0.'
            }
          ],
          loops: [
            {
              id: 'loop-1',
              title: 'Standard Form',
              teaching: { title: 'Teach', body: 'A quadratic must first be written in standard form.' },
              example: { title: 'Example', body: 'x² - 5x + 6 = 0 is already in standard form.' },
              learnerTask: { title: 'Task', body: 'Rewrite 2x² + 4 = 6x into standard form.' },
              retrievalCheck: { title: 'Check', body: 'Explain why standard form matters before solving.' },
              mustHitConcepts: ['standard form'],
              criticalMisconceptionTags: ['solving-before-rearranging']
            },
            {
              id: 'loop-2',
              title: 'Factoring',
              teaching: { title: 'Teach', body: 'Look for factors that multiply to c and add to b.' },
              example: { title: 'Example', body: 'x² - 5x + 6 factors to (x-2)(x-3).' },
              learnerTask: { title: 'Task', body: 'Factor x² + x - 6.' },
              retrievalCheck: { title: 'Check', body: 'State the pair of numbers and why they work.' },
              mustHitConcepts: ['factor pair'],
              criticalMisconceptionTags: ['incorrect-factor-pair']
            },
            {
              id: 'loop-3',
              title: 'Checking Solutions',
              teaching: { title: 'Teach', body: 'Substitute solutions back into the original equation.' },
              example: { title: 'Example', body: 'Substitute x = 2 into x² - 5x + 6 = 0.' },
              learnerTask: { title: 'Task', body: 'Check whether x = -3 solves x² + x - 6 = 0.' },
              retrievalCheck: { title: 'Check', body: 'Explain what a failed substitution tells you.' },
              mustHitConcepts: ['substitution check'],
              criticalMisconceptionTags: ['unchecked-answer']
            }
          ],
          synthesis: { title: 'Synthesis', body: 'Standard form, factoring, and checking work together as one solving routine.' },
          independentAttempt: { title: 'Independent Attempt', body: 'Solve x² - 7x + 10 = 0 and justify each step.' },
          exitCheck: { title: 'Exit Check', body: 'Explain the full solving process for a fresh quadratic and name one blocking mistake.' },
          ...overrides
        })
      }
    }]
  };
}

describe('parseLessonPlanResponse', () => {
  it('P4: parses valid AI response into Lesson with all 9 sections populated', () => {
    const result = parseLessonPlanResponse(makeValidAiPayload(), baseRequest);
    expect(result).not.toBeNull();
    expect(result?.lesson).toBeDefined();
    const sections = ['orientation', 'mentalModel', 'concepts', 'guidedConstruction',
      'workedExample', 'practicePrompt', 'commonMistakes', 'transferChallenge', 'summary'] as const;
    for (const section of sections) {
      expect(result?.lesson[section]?.body?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('P4: returns null on malformed JSON', () => {
    const bad = { choices: [{ message: { content: 'not json at all' } }] };
    expect(parseLessonPlanResponse(bad, baseRequest)).toBeNull();
  });

  it('P4: returns null when a required section is missing', () => {
    const bad = makeValidAiPayload();
    const parsed = JSON.parse(bad.choices[0].message.content);
    delete parsed.commonMistakes;
    bad.choices[0].message.content = JSON.stringify(parsed);
    expect(parseLessonPlanResponse(bad, baseRequest)).toBeNull();
  });

  it('P4: returns null when a required section has an empty body', () => {
    const bad = makeValidAiPayload();
    const parsed = JSON.parse(bad.choices[0].message.content);
    parsed.summary.body = '';
    bad.choices[0].message.content = JSON.stringify(parsed);
    expect(parseLessonPlanResponse(bad, baseRequest)).toBeNull();
  });

  it('P4: returns null when choices array is empty', () => {
    expect(parseLessonPlanResponse({ choices: [] }, baseRequest)).toBeNull();
  });

  it('P4: returns null when practice and transfer sections use the old generic wording', () => {
    const bad = makeValidAiPayload({
      practicePrompt: {
        title: 'Active Practice',
        body: 'Now try it yourself. Apply Quadratic Equations to a similar problem. Write out each step and explain your reasoning.'
      },
      transferChallenge: {
        title: 'Transfer Challenge',
        body: 'Can you apply Quadratic Equations to a problem you have not seen before?'
      }
    });

    expect(parseLessonPlanResponse(bad, baseRequest)).toBeNull();
  });

  it('P4: produces keyConcepts with at least 2 items', () => {
    const result = parseLessonPlanResponse(makeValidAiPayload(), baseRequest);
    expect(result?.lesson.keyConcepts?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it('P4: each keyConcept has name, summary, detail, and example', () => {
    const result = parseLessonPlanResponse(makeValidAiPayload(), baseRequest);
    for (const concept of result?.lesson.keyConcepts ?? []) {
      expect(concept.name.length).toBeGreaterThan(0);
      expect(concept.summary.length).toBeGreaterThan(0);
      expect(concept.detail.length).toBeGreaterThan(0);
      expect(concept.example.length).toBeGreaterThan(0);
    }
  });

  it('P4: falls back to buildDynamicConceptItems when AI omits keyConcepts', () => {
    const noKeyConceptsPayload = makeValidAiPayload({ keyConcepts: undefined });
    const result = parseLessonPlanResponse(noKeyConceptsPayload, baseRequest);
    expect(result?.lesson.keyConcepts?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it('rejects malformed v2 loop payloads', () => {
    const malformed = makeValidV2AiPayload({
      loops: [
        {
          id: 'loop-1',
          title: 'Bad Loop',
          teaching: { title: 'Teach', body: 'Teach body' }
        }
      ]
    });

    expect(parseLessonPlanResponse(malformed, baseRequest, { lessonFlowVersion: 'v2' })).toBeNull();
  });

  it('rejects v2 payloads with vague concept records', () => {
    const malformed = makeValidV2AiPayload({
      concepts: [
        {
          name: 'Understanding Quadratics',
          one_line_definition: 'This topic helps you understand quadratic equations better.',
          example: 'You will use this in many questions about quadratics.',
          quick_check: 'Explain the topic again in your own words.',
          concept_type: 'topic',
          curriculum_alignment: {
            topic_match: 'Quadratic Equations',
            grade_match: 'Grade 10',
            alignment_note: 'This is about the topic in general.'
          }
        },
        {
          name: 'Factoring',
          one_line_definition: 'Factoring splits a quadratic into brackets.',
          example: 'x^2 - 5x + 6 = (x - 2)(x - 3).',
          quick_check: 'Factor x^2 + x - 6.',
          concept_type: 'strategy',
          curriculum_alignment: {
            topic_match: 'Quadratic Equations',
            grade_match: 'Grade 10',
            alignment_note: 'Factoring is used in this topic.'
          }
        }
      ]
    });

    expect(parseLessonPlanResponse(malformed, baseRequest, { lessonFlowVersion: 'v2' })).toBeNull();
  });

  it('rejects v2 payloads with duplicate or near-duplicate concept records', () => {
    const malformed = makeValidV2AiPayload({
      concepts: [
        {
          name: 'Standard Form',
          one_line_definition: 'Rewrite the quadratic as ax^2 + bx + c = 0.',
          example: 'x^2 + 9 = 4x becomes x^2 - 4x + 9 = 0.',
          quick_check: 'Rewrite 2x^2 + 4 = 6x into standard form.',
          concept_type: 'procedure',
          curriculum_alignment: {
            topic_match: 'Quadratic Equations',
            grade_match: 'Grade 10',
            alignment_note: 'This is the standard rearrangement step.'
          }
        },
        {
          name: 'Writing in Standard Form',
          one_line_definition: 'Rewrite the quadratic as ax^2 + bx + c = 0 before solving.',
          example: 'x^2 + 9 = 4x becomes x^2 - 4x + 9 = 0.',
          quick_check: 'Move all terms in 2x^2 + 4 = 6x to one side.',
          concept_type: 'procedure',
          curriculum_alignment: {
            topic_match: 'Quadratic Equations',
            grade_match: 'Grade 10',
            alignment_note: 'This repeats the same rearrangement idea.'
          }
        },
        {
          name: 'Checking Solutions',
          one_line_definition: 'Substitute each solution back into the original equation.',
          example: 'If x = 2, then 2^2 - 5(2) + 6 = 0.',
          quick_check: 'Check whether x = -3 solves x^2 + x - 6 = 0.',
          concept_type: 'verification',
          curriculum_alignment: {
            topic_match: 'Quadratic Equations',
            grade_match: 'Grade 10',
            alignment_note: 'Checking prevents sign mistakes from slipping through.'
          }
        }
      ]
    });

    expect(parseLessonPlanResponse(malformed, baseRequest, { lessonFlowVersion: 'v2' })).toBeNull();
  });

  it('rejects v2 payloads when concept records are missing required fields', () => {
    const malformed = makeValidV2AiPayload({
      concepts: [
        {
          name: 'Standard Form',
          one_line_definition: 'Rewrite the quadratic as ax^2 + bx + c = 0.',
          example: 'x^2 + 9 = 4x becomes x^2 - 4x + 9 = 0.',
          concept_type: 'procedure',
          curriculum_alignment: {
            topic_match: 'Quadratic Equations',
            grade_match: 'Grade 10',
            alignment_note: 'This is the first solving step.'
          }
        },
        {
          name: 'Factoring',
          one_line_definition: 'Factoring splits a quadratic into brackets.',
          example: 'x^2 - 5x + 6 = (x - 2)(x - 3).',
          quick_check: 'Factor x^2 + x - 6.',
          concept_type: 'strategy',
          curriculum_alignment: {
            topic_match: 'Quadratic Equations',
            grade_match: 'Grade 10',
            alignment_note: 'Factoring is used in this topic.'
          }
        }
      ]
    });

    expect(parseLessonPlanResponse(malformed, baseRequest, { lessonFlowVersion: 'v2' })).toBeNull();
  });

  it('parses valid v2 payloads into a loop lesson with required metadata', () => {
    const result = parseLessonPlanResponse(makeValidV2AiPayload(), baseRequest, { lessonFlowVersion: 'v2' });

    expect(result?.lesson.lessonFlowVersion).toBe('v2');
    expect(result?.lesson.flowV2?.loops).toHaveLength(3);
    expect(result?.lesson.flowV2?.loops[0]?.mustHitConcepts.length).toBeGreaterThan(0);
    expect(result?.lesson.flowV2?.loops[0]?.criticalMisconceptionTags.length).toBeGreaterThan(0);
  });

  it('preserves richer concept metadata on valid v2 payloads', () => {
    const result = parseLessonPlanResponse(makeValidV2AiPayload(), baseRequest, { lessonFlowVersion: 'v2' });
    const firstConcept = result?.lesson.keyConcepts?.[0];

    expect(firstConcept?.oneLineDefinition).toContain('ax^2 + bx + c = 0');
    expect(firstConcept?.quickCheck).toContain('standard form');
    expect(firstConcept?.conceptType).toBe('procedure');
    expect(firstConcept?.curriculumAlignment?.alignmentNote).toContain('solving quadratics');
    expect(result?.lesson.flowV2?.concepts?.[0]?.quickCheck).toContain('standard form');
  });
});

// ─── Phase 4 fallback ──────────────────────────────────────────────────────

describe('buildFallbackLessonPlan', () => {
  it('P4: buildFallbackLessonPlan returns a valid lesson with provider local-fallback', () => {
    const result = buildFallbackLessonPlan(baseRequest);
    expect(result.provider).toBe('local-fallback');
    expect(result.lesson).toBeDefined();
    expect(result.lesson.orientation.body.length).toBeGreaterThan(0);
  });

  it('P4: fallback lesson has all 9 sections', () => {
    const result = buildFallbackLessonPlan(baseRequest);
    const sections = ['orientation', 'mentalModel', 'concepts', 'guidedConstruction',
      'workedExample', 'practicePrompt', 'commonMistakes', 'transferChallenge', 'summary'] as const;
    for (const section of sections) {
      expect(result.lesson[section]?.body?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('P4: fallback includes questions array', () => {
    const result = buildFallbackLessonPlan(baseRequest);
    expect(Array.isArray(result.questions)).toBe(true);
    expect(result.questions.length).toBeGreaterThanOrEqual(2);
  });

  it('builds a v2 fallback lesson with a default loop count near 3', () => {
    const result = buildFallbackLessonPlan(baseRequest, { lessonFlowVersion: 'v2' });

    expect(result.lesson.lessonFlowVersion).toBe('v2');
    expect(result.lesson.flowV2?.loops.length).toBe(3);
    expect(result.lesson.flowV2?.groupedLabels).toEqual([
      'orientation',
      'concepts',
      'practice',
      'check',
      'complete'
    ]);
  });
});
