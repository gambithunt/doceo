import { describe, expect, it } from 'vitest';

interface OnboardingRow {
  profile_id: string;
  education_type: string | null;
  level: string | null;
  programme: string | null;
}

interface SelectedSubjectRow {
  profile_id: string;
  subject_name: string | null;
}

interface CustomSubjectRow {
  profile_id: string;
  subject_name: string | null;
}

interface SubjectPopularityMap {
  [subjectKey: string]: number;
}

function normalizeSubjectToKey(subjectName: string): string {
  return subjectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function computeSubjectPopularity(
  onboardingRows: OnboardingRow[],
  selectedSubjectRows: SelectedSubjectRow[],
  customSubjectRows: CustomSubjectRow[]
): SubjectPopularityMap {
  const universityProfileIds = new Set<string>();

  for (const row of onboardingRows) {
    if (row.education_type === 'University' && row.profile_id) {
      universityProfileIds.add(row.profile_id);
    }
  }

  const subjectCounts = new Map<string, number>();

  for (const row of selectedSubjectRows) {
    if (row.profile_id && row.subject_name && universityProfileIds.has(row.profile_id)) {
      const key = normalizeSubjectToKey(row.subject_name);
      subjectCounts.set(key, (subjectCounts.get(key) ?? 0) + 1);
    }
  }

  for (const row of customSubjectRows) {
    if (row.profile_id && row.subject_name && universityProfileIds.has(row.profile_id)) {
      const key = normalizeSubjectToKey(row.subject_name);
      subjectCounts.set(key, (subjectCounts.get(key) ?? 0) + 1);
    }
  }

  return Object.fromEntries(subjectCounts);
}

describe('analyze-subject-popularity', () => {
  describe('normalizeSubjectToKey', () => {
    it('converts "Computer Science" to "computer-science"', () => {
      expect(normalizeSubjectToKey('Computer Science')).toBe('computer-science');
    });

    it('converts "Data Science" to "data-science"', () => {
      expect(normalizeSubjectToKey('Data Science')).toBe('data-science');
    });

    it('handles multiple spaces', () => {
      expect(normalizeSubjectToKey('Machine  Learning')).toBe('machine-learning');
    });

    it('trims leading and trailing hyphens', () => {
      expect(normalizeSubjectToKey('  Computer Science  ')).toBe('computer-science');
    });
  });

  describe('computeSubjectPopularity', () => {
    it('returns empty map when no data', () => {
      const result = computeSubjectPopularity([], [], []);
      expect(result).toEqual({});
    });

    it('counts subject picks from selected subjects', () => {
      const onboarding: OnboardingRow[] = [
        { profile_id: 'p1', education_type: 'University', level: 'year-1', programme: 'CS' }
      ];
      const selected: SelectedSubjectRow[] = [
        { profile_id: 'p1', subject_name: 'Computer Science' },
        { profile_id: 'p1', subject_name: 'Mathematics' }
      ];
      const custom: CustomSubjectRow[] = [];

      const result = computeSubjectPopularity(onboarding, selected, custom);

      expect(result['computer-science']).toBe(1);
      expect(result['mathematics']).toBe(1);
    });

    it('counts subject picks from custom subjects', () => {
      const onboarding: OnboardingRow[] = [
        { profile_id: 'p1', education_type: 'University', level: 'year-1', programme: 'CS' }
      ];
      const selected: SelectedSubjectRow[] = [];
      const custom: CustomSubjectRow[] = [
        { profile_id: 'p1', subject_name: 'Data Science' }
      ];

      const result = computeSubjectPopularity(onboarding, selected, custom);

      expect(result['data-science']).toBe(1);
    });

    it('accumulates counts across multiple students', () => {
      const onboarding: OnboardingRow[] = [
        { profile_id: 'p1', education_type: 'University', level: 'year-1', programme: 'CS' },
        { profile_id: 'p2', education_type: 'University', level: 'year-2', programme: 'CS' }
      ];
      const selected: SelectedSubjectRow[] = [
        { profile_id: 'p1', subject_name: 'Computer Science' },
        { profile_id: 'p2', subject_name: 'Computer Science' }
      ];
      const custom: CustomSubjectRow[] = [];

      const result = computeSubjectPopularity(onboarding, selected, custom);

      expect(result['computer-science']).toBe(2);
    });

    it('ignores school education type', () => {
      const onboarding: OnboardingRow[] = [
        { profile_id: 'p1', education_type: 'School', level: 'grade-10', programme: '' }
      ];
      const selected: SelectedSubjectRow[] = [
        { profile_id: 'p1', subject_name: 'Mathematics' }
      ];
      const custom: CustomSubjectRow[] = [];

      const result = computeSubjectPopularity(onboarding, selected, custom);

      expect(result).toEqual({});
    });

    it('handles null values gracefully', () => {
      const onboarding: OnboardingRow[] = [
        { profile_id: 'p1', education_type: null, level: null, programme: null }
      ];
      const selected: SelectedSubjectRow[] = [
        { profile_id: 'p1', subject_name: null }
      ];
      const custom: CustomSubjectRow[] = [
        { profile_id: 'p1', subject_name: null }
      ];

      const result = computeSubjectPopularity(onboarding, selected, custom);

      expect(result).toEqual({});
    });
  });
});

export { normalizeSubjectToKey, computeSubjectPopularity };
export type { SubjectPopularityMap, OnboardingRow, SelectedSubjectRow, CustomSubjectRow };