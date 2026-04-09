import { beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { createInitialState } from '$lib/data/platform';
import { createAppStore } from './app-state';

const { getAuthenticatedHeaders, fetchMock } = vi.hoisted(() => ({
  getAuthenticatedHeaders: vi.fn(),
  fetchMock: vi.fn()
}));

vi.mock('$lib/authenticated-fetch', () => ({
  getAuthenticatedHeaders
}));

describe('resolveAndApplyServerCountry', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getAuthenticatedHeaders.mockResolvedValue({
      Authorization: 'Bearer token'
    });
    fetchMock.mockImplementation(async () => {
      return new Response(JSON.stringify({ persisted: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  it('updates selectedCountryId when the server returns a supported country different from the current selection', async () => {
    fetchMock.mockImplementation(async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

      if (url.includes('/api/geo/country')) {
        return new Response(
          JSON.stringify({ countryCode: 'ZA' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(JSON.stringify({ persisted: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    });

    const baseState = createInitialState();
    const store = createAppStore({
      ...baseState,
      onboarding: {
        ...baseState.onboarding,
        selectedCountryId: 'other'
      }
    });

    await store.resolveAndApplyServerCountry();

    const state = get(store);
    expect(state.onboarding.selectedCountryId).toBe('za');
  });

  it('does not change state when the server returns the same country already selected', async () => {
    fetchMock.mockImplementation(async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

      if (url.includes('/api/geo/country')) {
        return new Response(
          JSON.stringify({ countryCode: 'ZA' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(JSON.stringify({ persisted: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    });

    const baseState = createInitialState();
    const store = createAppStore({
      ...baseState,
      onboarding: {
        ...baseState.onboarding,
        selectedCountryId: 'za'
      }
    });

    await store.resolveAndApplyServerCountry();

    const state = get(store);
    expect(state.onboarding.selectedCountryId).toBe('za');
  });

  it('does not change state when the server returns null', async () => {
    fetchMock.mockImplementation(async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

      if (url.includes('/api/geo/country')) {
        return new Response(
          JSON.stringify({ countryCode: null }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(JSON.stringify({ persisted: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    });

    const baseState = createInitialState();
    const store = createAppStore({
      ...baseState,
      onboarding: {
        ...baseState.onboarding,
        selectedCountryId: 'za'
      }
    });

    await store.resolveAndApplyServerCountry();

    const state = get(store);
    expect(state.onboarding.selectedCountryId).toBe('za');
  });
});
