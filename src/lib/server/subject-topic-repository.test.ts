import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createServerSupabaseAdmin, isSupabaseConfigured } = vi.hoisted(() => ({
  createServerSupabaseAdmin: vi.fn(),
  isSupabaseConfigured: vi.fn()
}));

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseAdmin,
  isSupabaseConfigured
}));

import {
  listRankedSubjectTopics,
  insertCandidateTopic
} from './subject-topic-repository';

describe('subject-topic-repository', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    isSupabaseConfigured.mockReturnValue(true);
  });

  describe('listRankedSubjectTopics', () => {
    it('selects from subject_topic_ranked filtered by status=active ordered by rank_score DESC', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) =>
          resolve({
            data: [
              {
                id: 'topic-1',
                subject_key: 'computer-science',
                subject_display: 'Computer Science',
                level: 'university',
                year: 'year-1',
                topic_label: 'Data Structures',
                topic_signature: 'abc123',
                textbook_ref: 'Introduction to Algorithms',
                blurb: 'Learn about arrays, linked lists, and trees',
                source: 'manual',
                status: 'active',
                admin_weight: 5,
                admin_notes: null,
                impression_count: 100,
                click_count: 50,
                thumbs_up_count: 10,
                thumbs_down_count: 2,
                completion_rate: 0.8,
                rank_score: 95
              }
            ],
            error: null
          })
        )
      };
      createServerSupabaseAdmin.mockReturnValue(mockSupabase);

      const result = await listRankedSubjectTopics({
        subjectKey: 'computer-science',
        level: 'university',
        year: 'year-1',
        limit: 10
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('subject_topic_ranked');
      expect(mockSupabase.select).toHaveBeenCalledWith('*');
      expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'active');
      expect(mockSupabase.eq).toHaveBeenCalledWith('subject_key', 'computer-science');
      expect(mockSupabase.eq).toHaveBeenCalledWith('level', 'university');
      expect(mockSupabase.eq).toHaveBeenCalledWith('year', 'year-1');
      expect(mockSupabase.order).toHaveBeenCalledWith('rank_score', { ascending: false });
      expect(mockSupabase.limit).toHaveBeenCalledWith(10);

      expect(result).toHaveLength(1);
      expect(result[0]!.topic_label).toBe('Data Structures');
      expect(result[0]!.rank_score).toBe(95);
    });

    it('returns empty array when no topics found', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => resolve({ data: [], error: null }))
      };
      createServerSupabaseAdmin.mockReturnValue(mockSupabase);

      const result = await listRankedSubjectTopics({
        subjectKey: 'unknown-subject',
        level: 'university',
        year: 'year-1',
        limit: 10
      });

      expect(result).toEqual([]);
    });

    it('returns empty array when Supabase is not configured', async () => {
      isSupabaseConfigured.mockReturnValue(false);
      createServerSupabaseAdmin.mockReturnValue(null);

      const result = await listRankedSubjectTopics({
        subjectKey: 'computer-science',
        level: 'university',
        year: 'year-1',
        limit: 10
      });

      expect(result).toEqual([]);
    });
  });

  describe('insertCandidateTopic', () => {
    it('upserts a row with status=candidate and source=ai_generated, deduped on topic_signature', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) =>
          resolve({
            data: [{ id: 'new-topic-id' }],
            error: null
          })
        )
      };
      createServerSupabaseAdmin.mockReturnValue(mockSupabase);

      const result = await insertCandidateTopic({
        subjectKey: 'computer-science',
        subjectDisplay: 'Computer Science',
        level: 'university',
        year: 'year-1',
        topicLabel: 'Machine Learning Basics',
        textbookRef: 'Pattern Recognition and Machine Learning',
        blurb: 'Introduction to ML concepts'
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('subject_topics');
      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          subject_key: 'computer-science',
          subject_display: 'Computer Science',
          level: 'university',
          year: 'year-1',
          topic_label: 'Machine Learning Basics',
          textbook_ref: 'Pattern Recognition and Machine Learning',
          blurb: 'Introduction to ML concepts',
          source: 'ai_generated',
          status: 'candidate'
        }),
        expect.objectContaining({ onConflict: 'topic_signature', ignoreDuplicates: true })
      );

      expect(result.ok).toBe(true);
    });

    it('generates deterministic topic_signature using sha256', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) =>
          resolve({
            data: [{ id: 'new-topic-id' }],
            error: null
          })
        )
      };
      createServerSupabaseAdmin.mockReturnValue(mockSupabase);

      await insertCandidateTopic({
        subjectKey: 'computer-science',
        subjectDisplay: 'Computer Science',
        level: 'university',
        year: 'year-1',
        topicLabel: 'Data Structures',
        textbookRef: 'CLRS',
        blurb: 'Arrays and linked lists'
      });

      const insertCall = mockSupabase.upsert.mock.calls[0]![0];
      expect(insertCall.topic_signature).toBeDefined();
      expect(typeof insertCall.topic_signature).toBe('string');
      expect(insertCall.topic_signature).toHaveLength(64);
    });

    it('returns error result when Supabase is not configured', async () => {
      isSupabaseConfigured.mockReturnValue(false);
      createServerSupabaseAdmin.mockReturnValue(null);

      const result = await insertCandidateTopic({
        subjectKey: 'computer-science',
        subjectDisplay: 'Computer Science',
        level: 'university',
        year: 'year-1',
        topicLabel: 'Test Topic',
        textbookRef: 'Test Ref',
        blurb: 'Test blurb'
      });

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Database unavailable');
    });

    it('returns error result when insert fails', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) =>
          resolve({
            data: null,
            error: { message: 'Insert failed' }
          })
        )
      };
      createServerSupabaseAdmin.mockReturnValue(mockSupabase);

      const result = await insertCandidateTopic({
        subjectKey: 'computer-science',
        subjectDisplay: 'Computer Science',
        level: 'university',
        year: 'year-1',
        topicLabel: 'Test Topic',
        textbookRef: 'Test Ref',
        blurb: 'Test blurb'
      });

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Insert failed');
    });
  });
});