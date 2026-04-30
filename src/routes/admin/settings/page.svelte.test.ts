import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSession } = vi.hoisted(() => ({
  getSession: vi.fn()
}));

vi.mock('$lib/supabase', () => ({
  supabase: {
    auth: {
      getSession
    }
  }
}));

import AdminSettingsPage from './+page.svelte';

function stubPreviewEnvironment(fetchMock = vi.fn().mockResolvedValue(
  new Response(new Uint8Array([1, 2, 3]), {
    status: 200,
    headers: { 'content-type': 'audio/mpeg' }
  })
)) {
  const play = vi.fn().mockResolvedValue(undefined);

  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('Audio', class {
    onended: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(_src: string) {}
    play = play;
    pause = vi.fn();
  } as never);
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn().mockReturnValue('blob:preview-audio'),
    revokeObjectURL: vi.fn()
  } as never);

  return { fetchMock, play };
}

function createPageData() {
  return {
    aiConfig: {
      provider: 'openai' as const,
      tiers: {
        fast: { model: 'gpt-4.1-mini' },
        default: { model: 'gpt-4.1-mini' },
        thinking: { model: 'gpt-4.1' }
      },
      routeOverrides: {}
    },
    ttsConfig: {
      enabled: true,
      defaultProvider: 'openai' as const,
      fallbackProvider: 'elevenlabs' as const,
      previewEnabled: true,
      previewMaxChars: 280,
      cacheEnabled: true,
      languageDefault: 'en' as const,
      rolloutScope: 'lessons' as const,
      openai: {
        enabled: true,
        model: 'gpt-4o-mini-tts',
        voice: 'alloy',
        speed: 1,
        styleInstruction: null,
        format: 'mp3' as const,
        timeoutMs: 15000,
        retries: 1
      },
      elevenlabs: {
        enabled: true,
        model: 'eleven_multilingual_v2',
        voiceId: 'JBFqnCBsd6RMkjVDRZzb',
        format: 'mp3' as const,
        languageCode: 'en' as const,
        stability: 0.5,
        similarityBoost: 0.8,
        style: 0,
        speakerBoost: true,
        timeoutMs: 15000,
        retries: 1
      }
    },
    ttsFallbackSummary: {
      enabled: false,
      lastOccurredAt: '2026-04-20T08:00:00.000Z',
      lastResultSummary: 'OpenAI → ElevenLabs succeeded after provider_outage.'
    },
    ttsAnalyticsCard: {
      windowLabel: 'Last 30 days',
      estimatedCostUsd: 0.02,
      synthRequestCount: 8,
      previewRequestCount: 2,
      cacheHitRate: 62.5,
      providerShare: [
        { provider: 'openai' as const, count: 6, sharePct: 75 },
        { provider: 'elevenlabs' as const, count: 2, sharePct: 25 }
      ],
      fallbackCount: 1,
      lastFallbackAt: '2026-04-20T08:00:00.000Z',
      lastFallbackSummary: 'OpenAI → ElevenLabs succeeded after provider_outage.'
    },
    providers: [
      {
        id: 'openai' as const,
        label: 'OpenAI',
        envKeyVar: 'OPENAI_API_KEY',
        baseUrl: 'https://api.openai.com/v1',
        authStyle: 'bearer' as const,
        format: 'openai' as const,
        models: [
          {
            id: 'gpt-4.1-mini',
            label: 'GPT-4.1 Mini',
            inputPer1M: 0.4,
            outputPer1M: 1.6,
            tier: 'default' as const
          }
        ]
      }
    ],
    budgetCapUsd: 50,
    alertThresholds: { errorRatePct: 5, spendPct: 75 },
    registrationMode: 'open' as const,
    invites: []
  };
}

describe('admin settings page tts section', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'admin-token-123',
          user: { id: 'user-1' }
        }
      }
    });
  });

  it('renders the TTS settings, analytics card, preview tools, and fallback summary', () => {
    render(AdminSettingsPage, {
      props: {
        data: createPageData(),
        form: null
      }
    });

    expect(screen.getByRole('heading', { name: /text to speech/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/default provider/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/preview text/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /preview voice/i })).toBeInTheDocument();
    expect(screen.getByText(/fallback enabled/i)).toBeInTheDocument();
    expect(screen.getByText(/tts analytics/i)).toBeInTheDocument();
    expect(screen.getByText(/\$0\.02/i)).toBeInTheDocument();
    expect(screen.getByText(/cache hit rate/i)).toBeInTheDocument();
    expect(screen.getByText(/62\.5%/i)).toBeInTheDocument();
    expect(screen.getByText(/synth requests/i)).toBeInTheDocument();
    expect(screen.getByText(/^8$/)).toBeInTheDocument();
    expect(screen.getByText(/openai → elevenlabs succeeded after provider_outage\./i)).toBeInTheDocument();
    expect(screen.getByText(/^no$/i)).toBeInTheDocument();
  });

  it('sends the admin bearer token when previewing tts audio', async () => {
    const { fetchMock } = stubPreviewEnvironment();

    render(AdminSettingsPage, {
      props: {
        data: createPageData(),
        form: null
      }
    });

    await fireEvent.click(screen.getByRole('button', { name: /preview voice/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/admin/tts/preview',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer admin-token-123'
          })
        })
      );
    });
  });

  it('sends the unsaved openai voice draft in the preview payload without calling save', async () => {
    const { fetchMock } = stubPreviewEnvironment();

    render(AdminSettingsPage, {
      props: {
        data: createPageData(),
        form: null
      }
    });

    await fireEvent.change(screen.getByLabelText(/^voice$/i), {
      target: { value: 'nova' }
    });
    await fireEvent.click(screen.getByRole('button', { name: /preview voice/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const [url, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body as string);

    expect(url).toBe('/api/admin/tts/preview');
    expect(body).toEqual(
      expect.objectContaining({
        content: 'Preview the current teaching voice.',
        draftConfig: expect.objectContaining({
          openai: expect.objectContaining({
            voice: 'nova'
          })
        })
      })
    );
  });

  it('sends the unsaved provider choice in the preview payload and does not submit the save action', async () => {
    const { fetchMock } = stubPreviewEnvironment();

    render(AdminSettingsPage, {
      props: {
        data: createPageData(),
        form: null
      }
    });

    await fireEvent.change(screen.getByLabelText(/default provider/i), {
      target: { value: 'elevenlabs' }
    });
    await fireEvent.click(screen.getByRole('button', { name: /preview voice/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const [url, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body as string);

    expect(url).toBe('/api/admin/tts/preview');
    expect(body).toEqual(
      expect.objectContaining({
        draftConfig: expect.objectContaining({
          defaultProvider: 'elevenlabs'
        })
      })
    );
    expect(fetchMock.mock.calls.some(([calledUrl]) => String(calledUrl).includes('?/saveTtsConfig'))).toBe(false);
  });
});
