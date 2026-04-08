import { describe, expect, it } from 'vitest';
import { getCurriculumsByCountry, onboardingCountries } from './onboarding';

describe('updated phase 5 global onboarding countries', () => {
  it('exposes a global fallback country list instead of only South Africa', () => {
    expect(onboardingCountries.length).toBeGreaterThan(5);
    expect(onboardingCountries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'za', name: 'South Africa' }),
        expect.objectContaining({ id: 'us', name: 'United States' }),
        expect.objectContaining({ id: 'gb', name: 'United Kingdom' })
      ])
    );
  });

  it('keeps structured school curriculums limited to supported countries', () => {
    expect(getCurriculumsByCountry('za').map((curriculum) => curriculum.id)).toEqual(['caps', 'ieb']);
    expect(getCurriculumsByCountry('us')).toEqual([]);
  });
});
