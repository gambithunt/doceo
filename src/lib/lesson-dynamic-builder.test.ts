import { describe, expect, it } from 'vitest';
import { validateConceptRecords } from '$lib/lesson-concept-contract';
import {
  buildDynamicLessonFlowV2FromTopic,
  buildDynamicLessonFromTopic,
  buildDynamicQuestionsForLesson,
  classifyLessonTopicShape
} from '$lib/lesson-dynamic-builder';

function buildLoopQualityLesson() {
  return buildDynamicLessonFlowV2FromTopic({
    subjectId: 'subject-life-sciences',
    subjectName: 'Life Sciences',
    grade: 'Grade 11',
    topicTitle: 'Plant Reproduction And Growth',
    topicDescription: 'Exploration candidate',
    curriculumReference: 'CAPS · Grade 11 · Life Sciences'
  });
}

function getFirstLoopQualityCase() {
  const lesson = buildLoopQualityLesson();
  const flow = lesson.flowV2;
  const concept = flow?.concepts?.[0];
  const loop = flow?.loops[0];

  if (!concept || !loop) {
    throw new Error('Expected v2 lesson to include at least one concept loop');
  }

  return { concept, loop };
}

describe('lesson-dynamic-builder', () => {
  it('buildDynamicLessonFromTopic exists', () => {
    expect(buildDynamicLessonFromTopic).toBeDefined();
  });

it('builds a lesson with all 9 sections around the exact chosen subject and topic', () => {
    const lesson = buildDynamicLessonFromTopic({
      subjectId: 'subject-english',
      subjectName: 'English Home Language',
      grade: 'Grade 6',
      topicTitle: 'Verbs',
      topicDescription: 'Focus on action and helping verbs in simple sentences.',
      curriculumReference: 'CAPS · Grade 6 · English Home Language'
    });

    expect(lesson.subjectId).toBe('subject-english');
    expect(lesson.title).toContain('Verbs');

    // All 9 sections must be present with non-empty title and body
    const sections = [
      lesson.orientation, lesson.mentalModel, lesson.concepts,
      lesson.guidedConstruction, lesson.workedExample, lesson.practicePrompt,
      lesson.commonMistakes, lesson.transferChallenge, lesson.summary
    ];
    for (const section of sections) {
      expect(section).toBeDefined();
      expect(section.title.length).toBeGreaterThan(0);
      expect(section.body.length).toBeGreaterThan(0);
    }

    // Topic name should appear in content
    expect(lesson.orientation.body.toLowerCase()).toContain('verbs');
    expect(lesson.concepts.body.toLowerCase()).toContain('verbs');
    expect(lesson.workedExample.body.toLowerCase()).toContain('verbs');
  });

  it('construction stage content is distinct from concepts stage content', () => {
    const lesson = buildDynamicLessonFromTopic({
      subjectId: 'subject-math',
      subjectName: 'Mathematics',
      grade: 'Grade 6',
      topicTitle: 'Fractions',
      topicDescription: 'Adding and subtracting fractions with unlike denominators.',
      curriculumReference: 'CAPS · Grade 6 · Mathematics'
    });

    expect(lesson.guidedConstruction.body).not.toBe(lesson.concepts.body);
    expect(lesson.guidedConstruction.body.toLowerCase()).toContain('fractions');
  });

// T1.4: lesson questions should be bounded and answerable, not broad intuition prompts
  it('dynamic lesson questions use a bounded check and a structured task frame', () => {
    const lesson = buildDynamicLessonFromTopic({
      subjectId: 'subject-math',
      subjectName: 'Mathematics',
      grade: 'Grade 6',
      topicTitle: 'Fractions',
      topicDescription: 'Adding and subtracting fractions.',
      curriculumReference: 'CAPS · Grade 6 · Mathematics'
    });
    const questions = buildDynamicQuestionsForLesson(lesson, 'Mathematics', 'Fractions');
    const checkQuestion = questions[0]!;
    const structuredQuestion = questions[1]!;

    expect(checkQuestion.type).toBe('multiple-choice');
    expect(checkQuestion.options).toHaveLength(4);
    expect(checkQuestion.expectedAnswer.toLowerCase()).not.toBe('fractions');
    expect(checkQuestion.prompt.toLowerCase()).not.toContain('practical example');
    expect(structuredQuestion.prompt).toContain('Use this task');
    expect(structuredQuestion.prompt).toContain(lesson.practicePrompt.body);
    expect(structuredQuestion.prompt).toContain('the first step');
  });

// ─── Phase 3: Summary rewrite ────────────────────────────────────────────────

  it('P3: dynamic lesson summary contains core rule reference', () => {
    const lesson = buildDynamicLessonFromTopic({
      subjectId: 'subject-math',
      subjectName: 'Mathematics',
      grade: 'Grade 8',
      topicTitle: 'Linear Equations',
      topicDescription: 'Solving one-variable equations.',
      curriculumReference: 'CAPS · Grade 8 · Mathematics'
    });
    const summaryLower = lesson.summary.body.toLowerCase();
    // Must contain all three parts: rule, mistake warning, transfer hook
    expect(summaryLower).toMatch(/core|rule|key/);
    expect(summaryLower).toMatch(/watch out|mistake|avoid|common error/);
    expect(summaryLower).toMatch(/transfer|ready|if you can/i);
  });

  it('P3: dynamic lesson summary references the lesson misconception', () => {
    const lesson = buildDynamicLessonFromTopic({
      subjectId: 'subject-science',
      subjectName: 'Physical Sciences',
      grade: 'Grade 10',
      topicTitle: 'Newton\'s Laws',
      topicDescription: 'Forces and motion.',
      curriculumReference: 'CAPS · Grade 10 · Physical Sciences'
    });
    // Extract the actual misconception text — it follows " is " in the commonMistakes body
    const isIdx = lesson.commonMistakes.body.indexOf(' is ');
    const misconceptionText = (isIdx >= 0 ? lesson.commonMistakes.body.slice(isIdx + 4) : lesson.commonMistakes.body)
      .toLowerCase().split(' ').slice(0, 5).join(' ');
    // Summary's "Watch out for" section should share the same misconception wording
    expect(lesson.summary.body.toLowerCase()).toContain(misconceptionText);
  });

it('buildDynamicLessonFlowV2FromTopic fallback concepts satisfy the stronger minimum contract', () => {
    const lesson = buildDynamicLessonFlowV2FromTopic({
      subjectId: 'subject-math',
      subjectName: 'Mathematics',
      grade: 'Grade 10',
      topicTitle: 'Quadratic Equations',
      topicDescription: 'Solving quadratic equations by factoring and the quadratic formula.',
      curriculumReference: 'CAPS · Grade 10 · Mathematics'
    });

    expect(lesson.flowV2?.concepts).toHaveLength(3);
    for (const concept of lesson.flowV2?.concepts ?? []) {
      expect(concept.name.length).toBeGreaterThan(0);
      expect(concept.simpleDefinition?.length ?? 0).toBeGreaterThan(0);
      expect(concept.oneLineDefinition?.length ?? 0).toBeGreaterThan(0);
      expect(concept.explanation?.length ?? 0).toBeGreaterThan(0);
      expect(concept.example.length).toBeGreaterThan(0);
      expect(concept.quickCheck?.length ?? 0).toBeGreaterThan(0);
      expect(concept.curriculumAlignment?.topicMatch).toBe('Quadratic Equations');
      expect(concept.curriculumAlignment?.gradeMatch).toBe('Grade 10');
    }
  });

  it('buildDynamicLessonFlowV2FromTopic fallback concepts expose concrete example and quick-check data', () => {
    const lesson = buildDynamicLessonFlowV2FromTopic({
      subjectId: 'subject-math',
      subjectName: 'Mathematics',
      grade: 'Grade 10',
      topicTitle: 'Quadratic Equations',
      topicDescription: 'Solving quadratic equations by factoring and the quadratic formula.',
      curriculumReference: 'CAPS · Grade 10 · Mathematics'
    });
    const firstConcept = lesson.keyConcepts?.[0];

    expect(firstConcept?.example).not.toMatch(/quick test|you use it in many|read the problem again/i);
    expect(firstConcept?.quickCheck).toMatch(/rewrite|factor|check|solve|state|what|why|how/i);
    expect(firstConcept?.detail).toContain(firstConcept?.explanation ?? '');
  });

  it('v2 loop sections are structurally distinct with no identical bodies', () => {
    const { loop } = getFirstLoopQualityCase();
    const bodies = [loop.teaching.body, loop.example.body, loop.learnerTask.body, loop.retrievalCheck.body];
    expect(new Set(bodies).size).toBe(4);
  });

  it('v2 loop teaching body does not contain the practice task text', () => {
    const { loop } = getFirstLoopQualityCase();
    expect(loop.teaching.body).not.toContain(loop.learnerTask.body);
    expect(loop.teaching.body).not.toMatch(/Write 2-3 sentences or steps/i);
  });

  it('v2 loop example body contains step labels and the concept example', () => {
    const { concept, loop } = getFirstLoopQualityCase();
    expect(loop.example.body).toMatch(/Step 1/);
    expect(loop.example.body).toMatch(/Step 2/);
    expect(loop.example.body).toMatch(/Step 3/);
    expect(loop.example.body).toContain(concept.example);
  });

  it('v2 loop learnerTask body does not paste teaching detail verbatim', () => {
    const { concept, loop } = getFirstLoopQualityCase();
    expect(loop.learnerTask.body).not.toContain(concept.detail);
    expect(loop.learnerTask.body).toMatch(/Name the|Point to|Write the first step/i);
  });

  it('v2 loop retrievalCheck body references the concept name', () => {
    const { concept, loop } = getFirstLoopQualityCase();
    expect(loop.retrievalCheck.body).toContain(concept.name);
  });

  it('classifies the initial topic-shape buckets deterministically', () => {
    expect(classifyLessonTopicShape('English Home Language', 'Poetry and Prose Techniques')).toBe('technique_or_feature');
    expect(classifyLessonTopicShape('Mathematics', 'Equivalent Fractions')).toBe('principle_or_rule');
    expect(classifyLessonTopicShape('Life Sciences', 'Osmosis')).toBe('process_or_mechanism');
    expect(classifyLessonTopicShape('History', 'Causes of World War I')).toBe('cause_and_effect');
    expect(classifyLessonTopicShape('Accounting', 'Debit and Credit')).toBe('comparison_or_distinction');
  });

  it('buildDynamicLessonFlowV2FromTopic uses shape-only fallback concepts for non-bespoke principle topics', () => {
    const lesson = buildDynamicLessonFlowV2FromTopic({
      subjectId: 'subject-math',
      subjectName: 'Mathematics',
      grade: 'Grade 7',
      topicTitle: 'Equivalent Ratios',
      topicDescription: 'Focus on equal ratios, scaling both quantities, and checking matching pairs like 2:3 and 4:6.',
      curriculumReference: 'CAPS · Grade 7 · Mathematics'
    });
    const concepts = lesson.flowV2?.concepts ?? [];
    const names = concepts.map((concept) => concept.name);
    const validation = validateConceptRecords(concepts, {
      topicTitle: 'Equivalent Ratios',
      grade: 'Grade 7',
      subject: 'Mathematics'
    });

    expect(concepts).toHaveLength(3);
    expect(validation.hardFailures).toEqual([]);
    expect(new Set(names).size).toBe(3);
    expect(names.every((name) => !/^(core rule|worked pattern|check and apply|central idea|using the idea|checking the result)$/i.test(name))).toBe(true);
    expect(names.some((name) => /ratio/i.test(name))).toBe(true);
    expect(concepts[0]).toEqual(
      expect.objectContaining({
        simpleDefinition: expect.stringMatching(/\w{4,}/),
        example: expect.stringMatching(/2:3|4:6|ratio/i),
        explanation: expect.stringMatching(/\w{4,}/),
        quickCheck: expect.stringMatching(/\?$/)
      })
    );
    expect(concepts[0]?.example).toMatch(/2:3|4:6|ratio/i);
    expect(concepts[0]?.quickCheck).toMatch(/what|which|why|how|solve|check|state|compare/i);
  });

  it('buildDynamicLessonFlowV2FromTopic produces classification concepts without wrapper labels', () => {
    const lesson = buildDynamicLessonFlowV2FromTopic({
      subjectId: 'subject-math',
      subjectName: 'Mathematics',
      grade: 'Grade 8',
      topicTitle: 'Types of Triangles',
      topicDescription: 'Compare equilateral, isosceles, and scalene triangles by their sides and angles.',
      curriculumReference: 'CAPS · Grade 8 · Mathematics'
    });
    const concepts = lesson.flowV2?.concepts ?? [];
    const names = concepts.map((concept) => concept.name);
    const validation = validateConceptRecords(concepts, {
      topicTitle: 'Types of Triangles',
      grade: 'Grade 8',
      subject: 'Mathematics'
    });
    const combinedText = concepts
      .map((concept) => [concept.summary, concept.detail, concept.example, concept.quickCheck].join(' '))
      .join(' ');

    expect(concepts).toHaveLength(3);
    expect(validation.hardFailures).toEqual([]);
    expect(new Set(names).size).toBe(3);
    expect(names.every((name) => !/^(first category|second category|category test)$/i.test(name))).toBe(true);
    expect(names.some((name) => /triangle|equilateral|isosceles|scalene/i.test(name))).toBe(true);
    expect(combinedText).not.toMatch(/identify the rule|show the first step|use the evidence|name the clue|apply the rule/i);
    expect(combinedText).not.toMatch(/this topic|this lesson|helps you understand|important idea/i);
    expect(concepts[0]).toEqual(
      expect.objectContaining({
        simpleDefinition: expect.stringMatching(/\w{4,}/),
        example: expect.stringMatching(/triangle|equilateral|isosceles|scalene/i),
        explanation: expect.stringMatching(/\w{4,}/),
        quickCheck: expect.stringMatching(/\?$/)
      })
    );
    expect(concepts[0]?.example).toMatch(/triangle|equilateral|isosceles|scalene/i);
  });

  it('buildDynamicLessonFlowV2FromTopic still produces boundary-valid concepts for uncatalogued technique topics', () => {
    const lesson = buildDynamicLessonFlowV2FromTopic({
      subjectId: 'subject-english',
      subjectName: 'English Home Language',
      grade: 'Grade 9',
      topicTitle: 'Sound Devices in Poetry',
      topicDescription: 'Including alliteration, onomatopoeia, and repetition in short lines to shape mood and emphasis.',
      curriculumReference: 'CAPS · Grade 9 · English Home Language'
    });
    const concepts = lesson.flowV2?.concepts ?? [];
    const names = concepts.map((concept) => concept.name);
    const validation = validateConceptRecords(concepts, {
      topicTitle: 'Sound Devices in Poetry',
      grade: 'Grade 9',
      subject: 'English Home Language'
    });
    const combinedText = concepts
      .map((concept) => [concept.name, concept.summary, concept.detail, concept.example, concept.quickCheck].join(' '))
      .join(' ');

    expect(concepts).toHaveLength(3);
    expect(validation.hardFailures).toEqual([]);
    expect(new Set(names).size).toBe(3);
    expect(names.some((name) => /alliteration|onomatopoeia|repetition|sound/i.test(name))).toBe(true);
    expect(combinedText).not.toMatch(/identify the rule|show the first step|use the evidence|name the clue|apply the rule/i);
    expect(combinedText).not.toMatch(/this topic|this lesson|helps you understand|important idea/i);
    expect(concepts[0]).toEqual(
      expect.objectContaining({
        simpleDefinition: expect.stringMatching(/\w{4,}/),
        example: expect.stringMatching(/\w{4,}/),
        explanation: expect.stringMatching(/\w{4,}/),
        quickCheck: expect.stringMatching(/\?$/)
      })
    );
  });

  it('buildDynamicLessonFlowV2FromTopic ignores placeholder descriptions and rejects slot-style fallback content for poetry and prose techniques', () => {
    const lesson = buildDynamicLessonFlowV2FromTopic({
      subjectId: 'subject-english',
      subjectName: 'English Home Language',
      grade: 'Grade 11',
      topicTitle: 'Poetry and Prose Techniques',
      topicDescription: 'AI-suggested topic',
      curriculumReference: 'CAPS · Grade 11 · English Home Language'
    });
    const concepts = lesson.flowV2?.concepts ?? [];
    const names = concepts.map((concept) => concept.name);
    const combinedText = concepts
      .map((concept) => [concept.name, concept.summary, concept.detail, concept.example, concept.quickCheck].join(' '))
      .join(' ');

    expect(concepts).toHaveLength(3);
    expect(names.every((name) => !/^ai-suggested topic$/i.test(name))).toBe(true);
    expect(names.every((name) => !/^poetry and prose techniques (effect|detail|example|check)$/i.test(name))).toBe(true);
    expect(names.some((name) => /metaphor|imagery|tone/i.test(name))).toBe(true);
    expect(combinedText).not.toMatch(/ai-suggested topic/i);
    expect(combinedText).not.toMatch(/quote the technique|identify the author's purpose|analyse how word choice or structure/i);
  });

  it('buildDynamicLessonFlowV2FromTopic derives real opening concepts for broad life orientation topics', () => {
    const lesson = buildDynamicLessonFlowV2FromTopic({
      subjectId: 'subject-lo',
      subjectName: 'Life Orientation',
      grade: 'Grade 11',
      topicTitle: 'Understanding Personal Identity',
      topicDescription: 'AI-suggested topic',
      curriculumReference: 'CAPS · Grade 11 · Life Orientation'
    });
    const concepts = lesson.flowV2?.concepts ?? [];
    const names = concepts.map((concept) => concept.name);
    const validation = validateConceptRecords(concepts, {
      topicTitle: 'Understanding Personal Identity',
      grade: 'Grade 11',
      subject: 'Life Orientation'
    });

    expect(concepts).toHaveLength(3);
    expect(validation.hardFailures).toEqual([]);
    expect(names.every((name) => !/^ai-suggested topic$/i.test(name))).toBe(true);
    expect(names.every((name) => !/^understanding personal identity (example|check|effect|detail)$/i.test(name))).toBe(true);
    expect(names.some((name) => /self|identity|values|belonging|influence/i.test(name))).toBe(true);
  });

  it('buildDynamicLessonFlowV2FromTopic derives real biology concepts for plant reproduction and growth', () => {
    const lesson = buildDynamicLessonFlowV2FromTopic({
      subjectId: 'subject-life-sciences',
      subjectName: 'Life Sciences',
      grade: 'Grade 11',
      topicTitle: 'Plant Reproduction And Growth',
      topicDescription: 'Exploration candidate',
      curriculumReference: 'CAPS · Grade 11 · Life Sciences'
    });
    const concepts = lesson.flowV2?.concepts ?? [];
    const names = concepts.map((concept) => concept.name);
    const combinedText = concepts
      .map((concept) => [concept.name, concept.summary, concept.detail, concept.example, concept.quickCheck].join(' '))
      .join(' ');
    const validation = validateConceptRecords(concepts, {
      topicTitle: 'Plant Reproduction And Growth',
      grade: 'Grade 11',
      subject: 'Life Sciences'
    });

    expect(concepts).toHaveLength(3);
    expect(validation.hardFailures).toEqual([]);
    expect(names).toEqual(['Pollination', 'Fertilisation', 'Germination']);
    expect(combinedText).not.toMatch(/exploration candidate|real-world case|reflection check/i);
    expect(concepts[0]).toEqual(
      expect.objectContaining({
        name: 'Pollination',
        simpleDefinition: expect.stringMatching(/pollen|anther|stigma/i),
        example: expect.stringMatching(/bee|pollen|anther|stigma/i),
        explanation: expect.stringMatching(/seed/i),
        quickCheck: expect.stringMatching(/stigma|pollen/i)
      })
    );
    expect(lesson.flowV2?.start.title).toBe('Pollination');
    expect(lesson.flowV2?.start.body).toMatch(/What it is:.*Pollination|pollen/i);
  });

  it('buildDynamicLessonFlowV2FromTopic uses concept 1 as the v2 opening teaching surface instead of the generic orientation scaffold', () => {
    const lesson = buildDynamicLessonFlowV2FromTopic({
      subjectId: 'subject-english',
      subjectName: 'English Home Language',
      grade: 'Grade 11',
      topicTitle: 'Poetry and Prose Techniques',
      topicDescription: 'AI-suggested topic',
      curriculumReference: 'CAPS · Grade 11 · English Home Language'
    });
    const firstConcept = lesson.flowV2?.concepts?.[0];

    expect(lesson.flowV2?.start.title).toBe(firstConcept?.name);
    expect(lesson.flowV2?.start.body).toContain(firstConcept?.simpleDefinition ?? '');
    expect(lesson.flowV2?.start.body).toContain(firstConcept?.example ?? '');
    expect(lesson.flowV2?.start.body).toContain(firstConcept?.explanation ?? '');
    expect(lesson.flowV2?.start.body).toContain(firstConcept?.quickCheck ?? '');
    expect(lesson.flowV2?.start.body).not.toMatch(/in this lesson you're exploring|by the end you should be able to|this topic matters because/i);
  });
});
