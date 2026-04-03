import { describe, expect, it } from 'vitest';
import {
  normalizeDiscoveryCandidateLabels,
  parseDashboardTopicDiscoveryRequest,
  parseDashboardTopicDiscoveryModelResponse
} from '../../../supabase/functions/dashboard-topic-discovery/validation';

describe('topic discovery edge validation', () => {
  it('validates request fields and optional forceRefresh/model overrides', () => {
    expect(
      parseDashboardTopicDiscoveryRequest({
        subjectId: 'caps-grade-6-mathematics',
        curriculumId: 'caps',
        gradeId: 'grade-6',
        forceRefresh: true,
        provider: 'github-models',
        model: 'openai/gpt-4.1-nano',
        excludeTopicSignatures: ['caps-grade-6-mathematics::caps::grade-6::fractions']
      })
    ).toEqual({
      success: true,
      data: {
        subjectId: 'caps-grade-6-mathematics',
        curriculumId: 'caps',
        gradeId: 'grade-6',
        forceRefresh: true,
        provider: 'github-models',
        model: 'openai/gpt-4.1-nano',
        excludeTopicSignatures: ['caps-grade-6-mathematics::caps::grade-6::fractions'],
        limit: 12
      }
    });

    expect(
      parseDashboardTopicDiscoveryRequest({
        subjectId: '',
        curriculumId: 'caps',
        gradeId: 'grade-6'
      })
    ).toEqual({
      success: false,
      error: 'subjectId, curriculumId, and gradeId are required.'
    });
  });

  it('filters empty, generic, repeated, and over-limit model candidates', () => {
    expect(
      normalizeDiscoveryCandidateLabels([
        ' Fractions ',
        'fractions',
        'Key Concepts',
        '',
        'Ratios',
        'Equivalent Fractions',
        'Problem Solving',
        'Decimals',
        'Percentages',
        'Algebra',
        'Geometry',
        'Patterns',
        'Measurement',
        'Data Handling'
      ])
    ).toEqual([
      'Fractions',
      'Ratios',
      'Equivalent Fractions',
      'Decimals',
      'Percentages',
      'Algebra',
      'Geometry',
      'Patterns'
    ]);
  });

  it('parses the model JSON contract and rejects malformed payloads', () => {
    expect(parseDashboardTopicDiscoveryModelResponse('{"topics":["Fractions","Ratios"]}')).toEqual({
      topics: ['Fractions', 'Ratios']
    });

    expect(parseDashboardTopicDiscoveryModelResponse('{"items":["Fractions"]}')).toBeNull();
    expect(parseDashboardTopicDiscoveryModelResponse('not-json')).toBeNull();
  });
});
