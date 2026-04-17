import { describe, expect, it } from 'vitest';
import { selectTopicLoadingCopy } from './topic-loading-copy';

describe('selectTopicLoadingCopy', () => {
  it('returns deterministic subject-aware copy for mathematics topics', () => {
    const result = selectTopicLoadingCopy({
      subjectName: 'Mathematics',
      topicTitle: 'Equivalent Fractions'
    });

    expect(result.family).toBe('mathematics');
    expect(result.headline).toBe('Synthesizing equations...');
    expect(result.supportingLine).toBe('Finding the clearest way in.');
  });

  it('returns deterministic language copy for english topics', () => {
    const result = selectTopicLoadingCopy({
      subjectName: 'English',
      topicTitle: 'Parts of Speech'
    });

    expect(result.family).toBe('language');
    expect(result.headline).toBe('Perusing themes...');
  });

  it('falls back to the generic bank for unknown subjects', () => {
    const result = selectTopicLoadingCopy({
      subjectName: 'Study Skills',
      topicTitle: 'Note Taking'
    });

    expect(result.family).toBe('generic');
    expect(result.headline).toBe('Mapping the way in...');
  });
});
