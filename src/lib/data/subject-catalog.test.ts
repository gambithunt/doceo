import { describe, expect, it } from 'vitest';
import { normalizeSubjectKey, findSubjectKey, CANONICAL_SUBJECT_KEYS } from './subject-catalog';

describe('subject-catalog', () => {
  describe('normalizeSubjectKey', () => {
    it('converts "Computer Science" to "computer-science"', () => {
      expect(normalizeSubjectKey('Computer Science')).toBe('computer-science');
    });

    it('converts "Comp Sci" to "comp-sci"', () => {
      expect(normalizeSubjectKey('Comp Sci')).toBe('comp-sci');
    });

    it('converts "CS" to "cs"', () => {
      expect(normalizeSubjectKey('CS')).toBe('cs');
    });

    it('handles multiple spaces', () => {
      expect(normalizeSubjectKey('Computer  Science')).toBe('computer-science');
    });

    it('trims leading and trailing hyphens', () => {
      expect(normalizeSubjectKey('  Computer Science  ')).toBe('computer-science');
    });
  });

  describe('findSubjectKey', () => {
    it('returns canonical key for exact match', () => {
      expect(findSubjectKey('Computer Science')).toBe('computer-science');
    });

    it('returns canonical key for "Comp Sci" alias', () => {
      expect(findSubjectKey('Comp Sci')).toBe('computer-science');
    });

    it('returns canonical key for "CS" alias', () => {
      expect(findSubjectKey('CS')).toBe('computer-science');
    });

    it('returns canonical key for "maths" alias', () => {
      expect(findSubjectKey('maths')).toBe('mathematics');
    });

    it('returns canonical key for "math" alias', () => {
      expect(findSubjectKey('math')).toBe('mathematics');
    });

    it('returns canonical key for "stats" alias', () => {
      expect(findSubjectKey('stats')).toBe('statistics');
    });

    it('returns null for unknown subject', () => {
      expect(findSubjectKey('Quantum Basket Weaving')).toBeNull();
    });

    it('is case insensitive', () => {
      expect(findSubjectKey('COMPUTER SCIENCE')).toBe('computer-science');
    });

    it('strips "subject-stub-" prefix from onboarding subject IDs', () => {
      expect(findSubjectKey('subject-stub-computer-science')).toBe('computer-science');
      expect(findSubjectKey('subject-stub-mathematics')).toBe('mathematics');
    });

    it('resolves compound onboarding subject names via substring match', () => {
      expect(findSubjectKey('Mathematics for Science')).toBe('mathematics');
      expect(findSubjectKey('Computer Science Fundamentals')).toBe('computer-science');
      expect(findSubjectKey('Applied Physics')).toBe('physics');
      expect(findSubjectKey('Introduction to Biology')).toBe('biology');
    });

    it('resolves stub IDs with compound names', () => {
      expect(findSubjectKey('subject-stub-mathematics-for-science')).toBe('mathematics');
      expect(findSubjectKey('subject-stub-computer-science-fundamentals')).toBe('computer-science');
    });

    it('returns null for empty input', () => {
      expect(findSubjectKey('')).toBeNull();
    });
  });

  describe('CANONICAL_SUBJECT_KEYS', () => {
    it('contains expected canonical keys', () => {
      expect(CANONICAL_SUBJECT_KEYS).toContain('computer-science');
      expect(CANONICAL_SUBJECT_KEYS).toContain('mathematics');
      expect(CANONICAL_SUBJECT_KEYS).toContain('physics');
    });
  });
});
