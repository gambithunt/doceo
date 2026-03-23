import { describe, expect, it } from 'vitest';
import { screenForPath } from './routing';

describe('screenForPath', () => {
  it('prefers dashboard for the dashboard URL', () => {
    expect(screenForPath('/dashboard')).toBe('dashboard');
  });

  it('maps other app routes correctly', () => {
    expect(screenForPath('/settings')).toBe('settings');
    expect(screenForPath('/progress')).toBe('progress');
    expect(screenForPath('/revision')).toBe('revision');
  });

  it('maps nested routes correctly', () => {
    expect(screenForPath('/lesson/session-123')).toBe('lesson');
    expect(screenForPath('/subjects/mathematics')).toBe('subject');
  });

  it('falls back to landing for unknown paths', () => {
    expect(screenForPath('/')).toBe('landing');
    expect(screenForPath('/something-else')).toBe('landing');
  });
});
