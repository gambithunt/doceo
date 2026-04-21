import { beforeEach, describe, expect, it, vi } from 'vitest';

const createServerSupabaseAdmin = vi.fn();
const isSupabaseConfigured = vi.fn();

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseAdmin,
  isSupabaseConfigured
}));

describe('state repository ai interaction logging', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    isSupabaseConfigured.mockReturnValue(true);
  });

  it('uses provider override pricing at write time and persists the pricing snapshot', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });

    createServerSupabaseAdmin.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'admin_settings') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    value: {
                      openai: [
                        {
                          id: 'custom/edu-model',
                          label: 'Custom EDU',
                          tier: 'thinking',
                          inputPer1M: 1.23,
                          outputPer1M: 4.56
                        }
                      ]
                    }
                  }
                })
              }))
            }))
          };
        }

        if (table === 'ai_interactions') {
          return {
            insert
          };
        }

        throw new Error(`Unexpected table ${table}`);
      })
    });

    const { logAiInteraction } = await import('./state-repository');
    await logAiInteraction(
      'student-1',
      '{"question":"Explain photosynthesis"}',
      JSON.stringify({
        usage: {
          input_tokens: 1000,
          output_tokens: 500
        }
      }),
      'openai',
      {
        mode: 'tutor',
        modelTier: 'thinking',
        model: 'custom/edu-model',
        latencyMs: 120
      }
    );

    const inserted = insert.mock.calls[0]?.[0];
    expect(inserted.input_tokens).toBe(1000);
    expect(inserted.output_tokens).toBe(500);
    expect(inserted.cost_usd).toBeCloseTo(0.00351, 8);
    expect(inserted.input_cost_usd).toBeCloseTo(0.00123, 8);
    expect(inserted.output_cost_usd).toBeCloseTo(0.00228, 8);
    expect(inserted.pricing_input_per_1m_usd).toBeCloseTo(1.23, 8);
    expect(inserted.pricing_output_per_1m_usd).toBeCloseTo(4.56, 8);
    expect(inserted.pricing_source).toBe('provider_override');
  });
});
