import { describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { lessonSessionStore, profileStore, uiStore, revisionStore } from './app-state';

describe('domain store slices', () => {
  // T5.1a: derived slices return the correct sub-state
  it('lessonSessionStore returns active lesson sessions', () => {
    const sessions = get(lessonSessionStore);
    expect(Array.isArray(sessions)).toBe(true);
  });

  it('profileStore returns the user profile', () => {
    const profile = get(profileStore);
    expect(profile).toHaveProperty('id');
    expect(profile).toHaveProperty('fullName');
  });

  it('uiStore returns the ui slice', () => {
    const ui = get(uiStore);
    expect(ui).toHaveProperty('currentScreen');
    expect(ui).toHaveProperty('composerDraft');
  });

  it('revisionStore returns revision topics', () => {
    const revision = get(revisionStore);
    expect(Array.isArray(revision)).toBe(true);
  });
});
