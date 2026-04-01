import { beforeEach, describe, expect, it, vi } from 'vitest';

type MockFetch = typeof fetch;
type FetchMock = ReturnType<typeof vi.fn> & MockFetch;

// ── GitHub Models ─────────────────────────────────────────────────────────
describe('GitHubModelsAdapter', () => {
  let fetcher: FetchMock;

  beforeEach(() => {
    fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        choices: [{ message: { content: 'Hello from GPT' } }],
        usage: { prompt_tokens: 100, completion_tokens: 50 }
      })
    }) as unknown as FetchMock;
  });

  it('sends correct Authorization bearer header', async () => {
    const { createGitHubModelsAdapter } = await import('./github-models');
    const adapter = createGitHubModelsAdapter({ apiKey: 'ghp_test', fetch: fetcher as MockFetch });
    await adapter.complete({ model: 'openai/gpt-4o-mini', messages: [{ role: 'user', content: 'Hi' }], systemPrompt: 'Tutor.' });
    const [, init] = fetcher.mock.calls[0];
    expect(init.headers['Authorization']).toBe('Bearer ghp_test');
  });

  it('prepends system message before user messages', async () => {
    const { createGitHubModelsAdapter } = await import('./github-models');
    const adapter = createGitHubModelsAdapter({ apiKey: 'ghp_test', fetch: fetcher as MockFetch });
    await adapter.complete({ model: 'openai/gpt-4o-mini', messages: [{ role: 'user', content: 'What is photosynthesis?' }], systemPrompt: 'You are a tutor.' });
    const body = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(body.messages[0]).toEqual({ role: 'system', content: 'You are a tutor.' });
    expect(body.messages[1]).toEqual({ role: 'user', content: 'What is photosynthesis?' });
  });

  it('returns content and token counts', async () => {
    const { createGitHubModelsAdapter } = await import('./github-models');
    const adapter = createGitHubModelsAdapter({ apiKey: 'ghp_test', fetch: fetcher as MockFetch });
    const result = await adapter.complete({ model: 'openai/gpt-4o-mini', messages: [{ role: 'user', content: 'Hi' }], systemPrompt: '' });
    expect(result.content).toBe('Hello from GPT');
    expect(result.tokensUsed).toEqual({ inputTokens: 100, outputTokens: 50 });
  });

  it('returns null tokensUsed when usage absent', async () => {
    const { createGitHubModelsAdapter } = await import('./github-models');
    fetcher.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({ choices: [{ message: { content: 'Hi' } }] }) });
    const adapter = createGitHubModelsAdapter({ apiKey: 'ghp_test', fetch: fetcher as MockFetch });
    const result = await adapter.complete({ model: 'openai/gpt-4o-mini', messages: [], systemPrompt: '' });
    expect(result.tokensUsed).toBeNull();
  });
});

// ── OpenAI ────────────────────────────────────────────────────────────────
describe('OpenAIAdapter', () => {
  let fetcher: FetchMock;

  beforeEach(() => {
    fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        choices: [{ message: { content: 'OpenAI response' } }],
        usage: { prompt_tokens: 200, completion_tokens: 80 }
      })
    }) as unknown as FetchMock;
  });

  it('calls api.openai.com with Bearer key', async () => {
    const { createOpenAIAdapter } = await import('./openai');
    const adapter = createOpenAIAdapter({ apiKey: 'sk-test', fetch: fetcher as MockFetch });
    await adapter.complete({ model: 'gpt-4o-mini', messages: [], systemPrompt: 'sys' });
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toContain('api.openai.com');
    expect(init.headers['Authorization']).toBe('Bearer sk-test');
  });

  it('returns content and token counts', async () => {
    const { createOpenAIAdapter } = await import('./openai');
    const adapter = createOpenAIAdapter({ apiKey: 'sk-test', fetch: fetcher as MockFetch });
    const result = await adapter.complete({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'Hi' }], systemPrompt: '' });
    expect(result.content).toBe('OpenAI response');
    expect(result.tokensUsed?.inputTokens).toBe(200);
    expect(result.tokensUsed?.outputTokens).toBe(80);
  });
});

// ── Anthropic ─────────────────────────────────────────────────────────────
describe('AnthropicAdapter', () => {
  let fetcher: FetchMock;

  beforeEach(() => {
    fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Anthropic response' }],
        usage: { input_tokens: 150, output_tokens: 60 }
      })
    }) as unknown as FetchMock;
  });

  it('calls api.anthropic.com with x-api-key header', async () => {
    const { createAnthropicAdapter } = await import('./anthropic');
    const adapter = createAnthropicAdapter({ apiKey: 'sk-ant-test', fetch: fetcher as MockFetch });
    await adapter.complete({ model: 'claude-sonnet-4-6', messages: [{ role: 'user', content: 'Hi' }], systemPrompt: 'sys' });
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toContain('anthropic.com');
    expect(init.headers['x-api-key']).toBe('sk-ant-test');
  });

  it('passes system prompt as top-level field, not a message', async () => {
    const { createAnthropicAdapter } = await import('./anthropic');
    const adapter = createAnthropicAdapter({ apiKey: 'sk-ant-test', fetch: fetcher as MockFetch });
    await adapter.complete({ model: 'claude-sonnet-4-6', messages: [{ role: 'user', content: 'Hi' }], systemPrompt: 'Be a tutor.' });
    const body = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(body.system).toBe('Be a tutor.');
    expect(body.messages.every((m: { role: string }) => m.role !== 'system')).toBe(true);
  });

  it('returns content and Anthropic token counts', async () => {
    const { createAnthropicAdapter } = await import('./anthropic');
    const adapter = createAnthropicAdapter({ apiKey: 'sk-ant-test', fetch: fetcher as MockFetch });
    const result = await adapter.complete({ model: 'claude-sonnet-4-6', messages: [{ role: 'user', content: 'Hi' }], systemPrompt: '' });
    expect(result.content).toBe('Anthropic response');
    expect(result.tokensUsed).toEqual({ inputTokens: 150, outputTokens: 60 });
  });
});

// ── Kimi ──────────────────────────────────────────────────────────────────
describe('KimiAdapter', () => {
  let fetcher: FetchMock;

  beforeEach(() => {
    fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        choices: [{ message: { content: 'Kimi response' } }],
        usage: { prompt_tokens: 120, completion_tokens: 40 }
      })
    }) as unknown as FetchMock;
  });

  it('calls api.moonshot.cn with Bearer key', async () => {
    const { createKimiAdapter } = await import('./kimi');
    const adapter = createKimiAdapter({ apiKey: 'sk-kimi-test', fetch: fetcher as MockFetch });
    await adapter.complete({ model: 'kimi-k2-0711-preview', messages: [{ role: 'user', content: 'Hi' }], systemPrompt: '' });
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toContain('moonshot.cn');
    expect(init.headers['Authorization']).toBe('Bearer sk-kimi-test');
  });

  it('returns content and token counts', async () => {
    const { createKimiAdapter } = await import('./kimi');
    const adapter = createKimiAdapter({ apiKey: 'sk-kimi-test', fetch: fetcher as MockFetch });
    const result = await adapter.complete({ model: 'kimi-k2-0711-preview', messages: [], systemPrompt: 'sys' });
    expect(result.content).toBe('Kimi response');
    expect(result.tokensUsed?.inputTokens).toBe(120);
    expect(result.tokensUsed?.outputTokens).toBe(40);
  });
});
