import { describe, expect, it } from 'vitest';
import { getSubjectLens } from '$lib/lesson-subject-lens';
import { buildDynamicLessonFromTopic } from '$lib/lesson-system';

describe('lesson-subject-lens', () => {
  it('P2: getSubjectLens returns unique lens for Life Sciences', () => {
    const lens = getSubjectLens('Life Sciences');
    expect(lens.conceptWord).not.toBe('core idea');
    expect(lens.conceptWord.toLowerCase()).toContain('biolog');
  });

  it('P2: getSubjectLens returns unique lens for Physical Sciences', () => {
    const lens = getSubjectLens('Physical Sciences');
    expect(lens.conceptWord.toLowerCase()).toMatch(/law|formula|principle/);
  });

  it('P2: getSubjectLens returns unique lens for History', () => {
    const lens = getSubjectLens('History');
    expect(lens.conceptWord.toLowerCase()).toMatch(/histor|cause|consequence/);
  });

  it('P2: getSubjectLens returns unique lens for Geography', () => {
    const lens = getSubjectLens('Geography');
    expect(lens.conceptWord.toLowerCase()).toMatch(/spatial|pattern|process/);
  });

  it('P2: getSubjectLens returns unique lens for Accounting', () => {
    const lens = getSubjectLens('Accounting');
    expect(lens.conceptWord.toLowerCase()).toMatch(/financ|account|econom/);
  });

  it('P2: getSubjectLens returns unique lens for Business Studies', () => {
    const lens = getSubjectLens('Business Studies');
    expect(lens.conceptWord.toLowerCase()).toMatch(/financ|business|econom/);
  });

  it('P2: getSubjectLens returns unique lens for Computer Applications Technology', () => {
    const lens = getSubjectLens('Computer Applications Technology');
    expect(lens.conceptWord.toLowerCase()).toMatch(/system|algorithm|component/);
  });

  it('P2: getSubjectLens returns unique lens for Information Technology', () => {
    const lens = getSubjectLens('Information Technology');
    expect(lens.conceptWord.toLowerCase()).toMatch(/system|algorithm|component/);
  });

  it('P2: getSubjectLens returns unique lens for Creative Arts', () => {
    const lens = getSubjectLens('Creative Arts');
    expect(lens.conceptWord.toLowerCase()).toMatch(/design|element|technique/);
  });

  it('P2: getSubjectLens accepts grade and returns grade-calibrated example for Math foundation', () => {
    const lensF = getSubjectLens('Mathematics', 'Grade 5');
    const lensS = getSubjectLens('Mathematics', 'Grade 12');
    expect(lensF.example).not.toBe(lensS.example);
  });

  it('P2: getSubjectLens Mathematics Grade 5 uses concrete language', () => {
    const lens = getSubjectLens('Mathematics', 'Grade 5');
    const combined = lens.example.toLowerCase() + lens.actionWord.toLowerCase();
    expect(combined).toMatch(/whole number|count|concrete|step/);
  });

  it('P2: getSubjectLens Mathematics Grade 12 uses abstract language', () => {
    const lens = getSubjectLens('Mathematics', 'Grade 12');
    const combined = lens.example.toLowerCase() + lens.evidenceWord.toLowerCase();
    expect(combined).toMatch(/function|proof|justif|formal|equat|theorem/i);
  });

  it('P2: buildDynamicLessonFromTopic Grade 12 guidedConstruction differs from Grade 5', () => {
    const lessonGr5 = buildDynamicLessonFromTopic({
      subjectId: 'subject-math',
      subjectName: 'Mathematics',
      grade: 'Grade 5',
      topicTitle: 'Fractions',
      topicDescription: 'Equal parts.',
      curriculumReference: 'CAPS · Grade 5 · Mathematics'
    });
    const lessonGr12 = buildDynamicLessonFromTopic({
      subjectId: 'subject-math',
      subjectName: 'Mathematics',
      grade: 'Grade 12',
      topicTitle: 'Fractions',
      topicDescription: 'Algebraic fractions.',
      curriculumReference: 'CAPS · Grade 12 · Mathematics'
    });
    expect(lessonGr5.guidedConstruction.body).not.toBe(lessonGr12.guidedConstruction.body);
  });
});
