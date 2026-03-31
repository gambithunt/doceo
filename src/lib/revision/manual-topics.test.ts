import { describe, expect, it } from 'vitest';
import {
  appendManualTopic,
  parseManualTopicDraft,
  resolveMatchedManualTopics
} from './manual-topics';

describe('revision manual topic helpers', () => {
  it('parses comma and newline separated manual topic drafts', () => {
    expect(parseManualTopicDraft('Fractions, Area\nRatio')).toEqual(['Fractions', 'Area', 'Ratio']);
  });

  it('replaces the selected topic when a new suggestion pill is clicked', () => {
    expect(appendManualTopic(['Fractions'], 'Fractions')).toEqual(['Fractions']);
    expect(appendManualTopic(['Fractions'], 'Area')).toEqual(['Area']);
  });

  it('prefers selected topics over typed draft when manual topics were chosen directly', () => {
    expect(
      resolveMatchedManualTopics({
        selectedTopics: ['Fractions', 'Area'],
        draft: 'fraxions',
        matches: []
      })
    ).toEqual(['Fractions', 'Area']);
  });

  it('uses AI matched topic titles to normalize free-typed manual topics', () => {
    expect(
      resolveMatchedManualTopics({
        selectedTopics: [],
        draft: 'fraxions, money mangement',
        matches: [
          { title: 'Fractions' },
          { title: 'Money management' }
        ]
      })
    ).toEqual(['Fractions', 'Money management']);
  });
});
