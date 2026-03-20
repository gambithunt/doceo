import { describe, expect, it, vi } from 'vitest';
import type { Subject } from '$lib/types';
import {
  SUBJECT_HINT_CACHE_TTL_MS,
  buildDeterministicSubjectHints,
  createSubjectHintsUserPrompt,
  resolveSubjectHints,
  validateSubjectHints
} from '$lib/ai/subject-hints';

function createBiologySubject(): Subject {
  return {
    id: 'subject-biology',
    name: 'Biology',
    topics: [
      {
        id: 'bio-topic-1',
        name: 'Cell structure',
        subtopics: [
          { id: 'bio-subtopic-1', name: 'Animal and plant cells', lessonIds: ['lesson-1'] },
          { id: 'bio-subtopic-2', name: 'Organelles and functions', lessonIds: ['lesson-2'] }
        ]
      },
      {
        id: 'bio-topic-2',
        name: 'Photosynthesis',
        subtopics: [
          { id: 'bio-subtopic-3', name: 'Conditions for photosynthesis', lessonIds: ['lesson-3'] },
          { id: 'bio-subtopic-4', name: 'Importance of chlorophyll', lessonIds: ['lesson-4'] }
        ]
      }
    ]
  };
}

describe('subject hints', () => {
  it('builds deterministic hints from the selected subject curriculum content', () => {
    const hints = buildDeterministicSubjectHints(createBiologySubject(), 'Term 1');

    expect(hints).toContain('Cell structure');
    expect(hints).toContain('Animal and plant cells');
    expect(hints).not.toContain('Photosynthesis');
    expect(hints).not.toContain('Foundations');
    expect(hints).not.toContain('Using what you know');
  });

  it('does not surface generic placeholder sections back to the learner', () => {
    const hints = buildDeterministicSubjectHints({
      id: 'subject-biology',
      name: 'Biology',
      topics: [
        {
          id: 'topic-1',
          name: 'Foundations',
          subtopics: [{ id: 'subtopic-1', name: 'Essential concepts', lessonIds: ['lesson-1'] }]
        },
        {
          id: 'topic-2',
          name: 'Application',
          subtopics: [{ id: 'subtopic-2', name: 'Using what you know', lessonIds: ['lesson-2'] }]
        }
      ]
    }, 'Term 1');

    expect(hints).toContain('Biology basics');
    expect(hints).not.toContain('Foundations');
    expect(hints).not.toContain('Essential concepts');
  });

  it('narrows deterministic hints to the selected term window', () => {
    const hints = buildDeterministicSubjectHints(
      {
        id: 'subject-biology',
        name: 'Biology',
        topics: [
          { id: 'topic-1', name: 'Cell structure', subtopics: [{ id: 's1', name: 'Plant cells', lessonIds: ['l1'] }] },
          { id: 'topic-2', name: 'Transport systems', subtopics: [{ id: 's2', name: 'Diffusion', lessonIds: ['l2'] }] },
          { id: 'topic-3', name: 'Photosynthesis', subtopics: [{ id: 's3', name: 'Chlorophyll', lessonIds: ['l3'] }] },
          { id: 'topic-4', name: 'Respiration', subtopics: [{ id: 's4', name: 'Aerobic respiration', lessonIds: ['l4'] }] }
        ]
      },
      'Term 1'
    );

    expect(hints).toContain('Cell structure');
    expect(hints).toContain('Plant cells');
    expect(hints).not.toContain('Respiration');
  });

  it('reuses cached hints before expiry to avoid extra model calls', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
        json: async () => ({
          response: {
            hints: [
              'Animal and plant cells',
              'Organelles and functions',
              'Photosynthesis',
              'Conditions for photosynthesis',
              'Chlorophyll'
            ]
          },
          provider: 'github-models'
      })
    });

    const storage = new Map<string, string>();
    const now = new Date('2026-03-14T10:00:00.000Z').getTime();

    const first = await resolveSubjectHints({
      subject: createBiologySubject(),
      curriculumId: 'caps',
      curriculumName: 'CAPS',
      gradeId: 'grade-10',
      gradeLabel: 'Grade 10',
      term: 'Term 1',
      fetcher,
      storage,
      now
    });

    const second = await resolveSubjectHints({
      subject: createBiologySubject(),
      curriculumId: 'caps',
      curriculumName: 'CAPS',
      gradeId: 'grade-10',
      gradeLabel: 'Grade 10',
      term: 'Term 1',
      fetcher,
      storage,
      now: now + 60_000
    });

    expect(first.hints).toEqual(second.hints);
    expect(second.provider).toBe('cache');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('can force refresh hints even while the cached pack is still fresh', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: {
            hints: [
              'Animal and plant cells',
              'Organelles and functions',
              'Photosynthesis',
              'Conditions for photosynthesis',
              'Chlorophyll'
            ]
          },
          provider: 'github-models'
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: {
            hints: [
              'Cell structure',
              'Animal and plant cells',
              'Chlorophyll',
              'Conditions for photosynthesis',
              'Photosynthesis'
            ]
          },
          provider: 'github-models'
        })
      });

    const storage = new Map<string, string>();
    const now = new Date('2026-03-14T10:00:00.000Z').getTime();

    const first = await resolveSubjectHints({
      subject: createBiologySubject(),
      curriculumId: 'caps',
      curriculumName: 'CAPS',
      gradeId: 'grade-10',
      gradeLabel: 'Grade 10',
      term: 'Term 1',
      fetcher,
      storage,
      now
    });

    const second = await resolveSubjectHints({
      subject: createBiologySubject(),
      curriculumId: 'caps',
      curriculumName: 'CAPS',
      gradeId: 'grade-10',
      gradeLabel: 'Grade 10',
      term: 'Term 1',
      forceRefresh: true,
      fetcher,
      storage,
      now: now + 60_000
    });

    expect(first.hints).not.toEqual(second.hints);
    expect(second.hints).toContain('Cell structure');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('refreshes expired hints and replaces the cached pack', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: {
            hints: [
              'Animal and plant cells',
              'Organelles and functions',
              'Photosynthesis',
              'Conditions for photosynthesis',
              'Chlorophyll'
            ]
          },
          provider: 'github-models'
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: {
            hints: [
              'Conditions for photosynthesis',
              'Chlorophyll',
              'Photosynthesis',
              'Cell structure',
              'Animal and plant cells'
            ]
          },
          provider: 'github-models'
        })
      });

    const storage = new Map<string, string>();
    const now = new Date('2026-03-14T10:00:00.000Z').getTime();

    const first = await resolveSubjectHints({
      subject: createBiologySubject(),
      curriculumId: 'caps',
      curriculumName: 'CAPS',
      gradeId: 'grade-10',
      gradeLabel: 'Grade 10',
      term: 'Term 1',
      fetcher,
      storage,
      now
    });

    const second = await resolveSubjectHints({
      subject: createBiologySubject(),
      curriculumId: 'caps',
      curriculumName: 'CAPS',
      gradeId: 'grade-10',
      gradeLabel: 'Grade 10',
      term: 'Term 1',
      fetcher,
      storage,
      now: now + SUBJECT_HINT_CACHE_TTL_MS + 1
    });

    expect(first.hints).not.toEqual(second.hints);
    expect(second.hints).toContain('Conditions for photosynthesis');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('rejects off-subject model output when there is no cached hint pack', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        response: {
          hints: ['Solve linear equations', 'Factorise quadratic expressions']
        },
        provider: 'github-models'
      })
    });

    await expect(
      resolveSubjectHints({
        subject: createBiologySubject(),
        curriculumId: 'caps',
        curriculumName: 'CAPS',
        gradeId: 'grade-10',
        gradeLabel: 'Grade 10',
        term: 'Term 1',
        fetcher,
        storage: new Map<string, string>(),
        now: Date.now()
      })
    ).rejects.toThrow('Subject hints response was invalid.');
  });

  it('does not reuse cached hints across different terms', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: {
            hints: [
              'Cell structure',
              'Plant cells',
              'Animal and plant cells',
              'Organelles and functions',
              'Photosynthesis'
            ]
          },
          provider: 'github-models'
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: {
            hints: [
              'Photosynthesis',
              'Chlorophyll',
              'Conditions for photosynthesis',
              'Cell structure',
              'Organelles and functions'
            ]
          },
          provider: 'github-models'
        })
      });

    const storage = new Map<string, string>();

    const termOne = await resolveSubjectHints({
      subject: createBiologySubject(),
      curriculumId: 'caps',
      curriculumName: 'CAPS',
      gradeId: 'grade-10',
      gradeLabel: 'Grade 10',
      term: 'Term 1',
      fetcher,
      storage,
      now: Date.now()
    });

    const termTwo = await resolveSubjectHints({
      subject: createBiologySubject(),
      curriculumId: 'caps',
      curriculumName: 'CAPS',
      gradeId: 'grade-10',
      gradeLabel: 'Grade 10',
      term: 'Term 2',
      fetcher,
      storage,
      now: Date.now()
    });

    expect(termOne.hints).not.toEqual(termTwo.hints);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('rejects sentence-style hints when there is no cached hint pack', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        response: {
          hints: [
            'Define essential concepts in biology.',
            'Apply biological concepts to real-world scenarios.'
          ]
        },
        provider: 'github-models'
      })
    });

    await expect(
      resolveSubjectHints({
        subject: createBiologySubject(),
        curriculumId: 'caps',
        curriculumName: 'CAPS',
        gradeId: 'grade-10',
        gradeLabel: 'Grade 10',
        term: 'Term 1',
        fetcher,
        storage: new Map<string, string>(),
        now: Date.now()
      })
    ).rejects.toThrow('Subject hints response was invalid.');
  });

  it('includes curriculum-specific biology reference topics for IEB Grade 6 Term 1', () => {
    const prompt = createSubjectHintsUserPrompt({
      curriculumId: 'ieb',
      curriculumName: 'IEB',
      gradeId: 'grade-6',
      gradeLabel: 'Grade 6',
      term: 'Term 1',
      subject: {
        id: 'subject-biology',
        name: 'Biology',
        topics: []
      }
    });

    expect(prompt).toContain('Photosynthesis');
    expect(prompt).toContain('Nutrients in Food');
    expect(prompt).toContain('The Human Digestive System');
    expect(prompt).toContain('Ecosystems and Food Webs');
  });

  it('accepts validated hints through reference topics when the subject has no structured sections', () => {
    const result = validateSubjectHints(
      [
        'Photosynthesis',
        'Nutrients in Food',
        'Nutrition and Diet-Related Diseases',
        'The Human Digestive System',
        'Ecosystems and Food Webs'
      ],
      {
        id: 'subject-biology',
        name: 'Biology',
        topics: []
      },
      [
        'Photosynthesis',
        'Nutrients in Food',
        'Nutrition and Diet-Related Diseases',
        'The Human Digestive System',
        'Ecosystems and Food Webs'
      ]
    );

    expect(result).toHaveLength(5);
    expect(result).toContain('Photosynthesis');
  });
});
