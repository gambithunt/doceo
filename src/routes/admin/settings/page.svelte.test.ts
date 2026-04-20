import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import AdminSettingsPage from './+page.svelte';

describe('admin settings page tts section', () => {
  it('renders the TTS settings, preview tools, and fallback summary', () => {
    render(AdminSettingsPage, {
      props: {
        data: {
          aiConfig: {
            provider: 'openai',
            tiers: {
              fast: { model: 'gpt-4.1-mini' },
              default: { model: 'gpt-4.1-mini' },
              thinking: { model: 'gpt-4.1' }
            },
            routeOverrides: {}
          },
          ttsConfig: {
            enabled: true,
            defaultProvider: 'openai',
            fallbackProvider: 'elevenlabs',
            previewEnabled: true,
            previewMaxChars: 280,
            cacheEnabled: true,
            languageDefault: 'en',
            rolloutScope: 'lessons',
            openai: {
              enabled: true,
              model: 'gpt-4o-mini-tts',
              voice: 'alloy',
              speed: 1,
              styleInstruction: null,
              format: 'mp3',
              timeoutMs: 15000,
              retries: 1
            },
            elevenlabs: {
              enabled: true,
              model: 'eleven_multilingual_v2',
              voiceId: 'JBFqnCBsd6RMkjVDRZzb',
              format: 'mp3',
              languageCode: 'en',
              stability: 0.5,
              similarityBoost: 0.8,
              style: 0,
              speakerBoost: true,
              timeoutMs: 15000,
              retries: 1
            }
          },
          ttsFallbackSummary: {
            enabled: true,
            lastOccurredAt: '2026-04-20T08:00:00.000Z',
            lastResultSummary: 'OpenAI → ElevenLabs succeeded after provider_outage.'
          },
          providers: [
            {
              id: 'openai',
              label: 'OpenAI',
              models: [
                {
                  id: 'gpt-4.1-mini',
                  label: 'GPT-4.1 Mini',
                  provider: 'openai',
                  inputPer1M: 0.4,
                  outputPer1M: 1.6,
                  tier: 'default'
                }
              ]
            }
          ],
          budgetCapUsd: 50,
          alertThresholds: { errorRatePct: 5, spendPct: 75 },
          registrationMode: 'open',
          invites: []
        },
        form: null
      }
    });

    expect(screen.getByRole('heading', { name: /text to speech/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/default provider/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/preview text/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /preview voice/i })).toBeInTheDocument();
    expect(screen.getByText(/fallback enabled/i)).toBeInTheDocument();
    expect(screen.getByText(/openai → elevenlabs succeeded after provider_outage\./i)).toBeInTheDocument();
  });
});
