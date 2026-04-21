import { beforeEach, describe, expect, it, vi } from 'vitest';

const createServerSupabaseAdmin = vi.fn();

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseAdmin
}));

describe('admin spend queries', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('getAiSpendByRoute sums numeric-string cost rows', async () => {
    createServerSupabaseAdmin.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table !== 'ai_interactions') {
          throw new Error(`Unexpected table ${table}`);
        }

        return {
          select: vi.fn(() => ({
            gte: vi.fn().mockResolvedValue({
              data: [
                { mode: 'lesson-plan', cost_usd: '0.1250', created_at: '2026-04-21T10:00:00.000Z' },
                { mode: 'lesson-plan', cost_usd: 0.25, created_at: '2026-04-21T11:00:00.000Z' }
              ]
            })
          }))
        };
      })
    });

    const { getAiSpendByRoute } = await import('./admin-queries');
    const result = await getAiSpendByRoute(new Date('2026-04-01T00:00:00.000Z'));

    expect(result).toEqual([
      {
        route: 'lesson-plan',
        requests: 2,
        estimatedCost: 0.375
      }
    ]);
  });

  it('getAdminKpis sums today spend when cost rows are returned as strings', async () => {
    createServerSupabaseAdmin.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              count: 3
            }))
          };
        }

        if (table === 'analytics_events') {
          return {
            select: vi.fn(() => ({
              gte: vi.fn().mockResolvedValue({
                count: 2
              })
            }))
          };
        }

        if (table === 'lesson_sessions') {
          return {
            select: vi.fn(() => ({
              gte: vi.fn().mockResolvedValue({ count: 4 }),
              eq: vi.fn().mockResolvedValue({ count: 3 }),
              count: 5
            }))
          };
        }

        if (table === 'ai_interactions') {
          return {
            select: vi.fn(() => ({
              gte: vi.fn().mockResolvedValue({
                data: [
                  { cost_usd: '0.1250' },
                  { cost_usd: 0.25 }
                ]
              })
            }))
          };
        }

        throw new Error(`Unexpected table ${table}`);
      })
    });

    const { getAdminKpis } = await import('./admin-queries');
    const result = await getAdminKpis();

    expect(result.aiSpendToday).toBe(0.375);
  });
});
