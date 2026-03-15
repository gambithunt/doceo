import { describe, expect, it } from 'vitest';
import { extractHintChipLabels } from '$lib/components/dashboard-hints';

describe('extractHintChipLabels', () => {
  it('returns unique, trimmed chip labels in order', () => {
    expect(
      extractHintChipLabels(`
        Photosynthesis
        Food webs
        Photosynthesis

        Digestive system
      `)
    ).toEqual(['Photosynthesis', 'Food webs', 'Digestive system']);
  });
});
