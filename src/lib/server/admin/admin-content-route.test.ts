import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createServerSupabaseAdmin, getSubjectStats } = vi.hoisted(() => ({
  createServerSupabaseAdmin: vi.fn(),
  getSubjectStats: vi.fn()
}));

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseAdmin
}));

vi.mock('$lib/server/admin/admin-queries', () => ({
  getSubjectStats
}));

describe('admin content route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    createServerSupabaseAdmin.mockReturnValue({ id: 'supabase-admin' });
  });

  it('loads graph and artifact health summaries without seeded coverage labels', async () => {
    getSubjectStats.mockResolvedValue([
      {
        subject: 'Mathematics',
        totalSessions: 18,
        completedSessions: 12,
        completionRate: 67,
        reteachCount: 2,
        reteachRate: 11
      },
      {
        subject: 'Natural Sciences',
        totalSessions: 6,
        completedSessions: 2,
        completionRate: 33,
        reteachCount: 3,
        reteachRate: 50
      },
      {
        subject: 'History',
        totalSessions: 0,
        completedSessions: 0,
        completionRate: 0,
        reteachCount: 0,
        reteachRate: 0
      }
    ]);

    const { load } = await import('../../../routes/admin/content/+page.server');
    const result = await load();

    expect(result).toEqual(
      expect.objectContaining({
        subjectHealth: [
          expect.objectContaining({ name: 'Mathematics', health: 'stable' }),
          expect.objectContaining({ name: 'Natural Sciences', health: 'attention' }),
          expect.objectContaining({ name: 'History', health: 'emerging' })
        ],
        artifactStats: expect.objectContaining({
          totalSessions: 24,
          activeSubjects: 2,
          attentionSubjects: 1,
          emergingSubjects: 1
        })
      })
    );
  });
});
