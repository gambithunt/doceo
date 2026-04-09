import { describe, expect, it } from 'vitest';
import {
  activeCountries,
  getCurriculumsByCountry,
  getRecommendedCountryId,
  onboardingCountries
} from './onboarding';

describe('Phase 2: active countries', () => {
  it('activeCountries contains only South Africa', () => {
    expect(activeCountries.length).toBe(1);
    expect(activeCountries[0]).toEqual(
      expect.objectContaining({ id: 'za', name: 'South Africa', enabled: true })
    );
  });

  it('onboardingCountries preserves all country data for future use', () => {
    expect(onboardingCountries.length).toBe(11);
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

describe('country recommendation', () => {
  it('returns za when timezone matches South Africa', () => {
    const result = getRecommendedCountryId({ timezone: 'Africa/Johannesburg' });
    expect(result).toBe('za');
  });

  it('returns za when locale language matches South Africa', () => {
    const result = getRecommendedCountryId({ localeLanguage: 'en-ZA' });
    expect(result).toBe('za');
  });

  it('defaults to za when no valid signals are provided', () => {
    const result = getRecommendedCountryId({});
    expect(result).toBe('za');
  });

  it('defaults to za for unknown timezone', () => {
    const result = getRecommendedCountryId({ timezone: 'Unknown/Unknown' });
    expect(result).toBe('za');
  });

  it('defaults to za for unknown locale language', () => {
    const result = getRecommendedCountryId({ localeLanguage: 'xx-XX' });
    expect(result).toBe('za');
  });

  it('prefers timezone over locale when both are provided', () => {
    const result = getRecommendedCountryId({
      timezone: 'Africa/Johannesburg',
      localeLanguage: 'en-US'
    });
    expect(result).toBe('za');
  });

  it('defaults to za when timezone is not in the active list', () => {
    const result = getRecommendedCountryId({ timezone: 'Antarctica/DumontDUrville' });
    expect(result).toBe('za');
  });

  it('defaults to za when US timezone is detected', () => {
    const result = getRecommendedCountryId({ timezone: 'America/New_York' });
    expect(result).toBe('za');
  });

  it('defaults to za when UK timezone is detected', () => {
    const result = getRecommendedCountryId({ timezone: 'Europe/London' });
    expect(result).toBe('za');
  });

  it('defaults to za when Australia timezone is detected', () => {
    const result = getRecommendedCountryId({ timezone: 'Australia/Sydney' });
    expect(result).toBe('za');
  });

  it('defaults to za when India timezone is detected', () => {
    const result = getRecommendedCountryId({ timezone: 'Asia/Kolkata' });
    expect(result).toBe('za');
  });

  it('returns za when ipCountryCode is ZA', () => {
    const result = getRecommendedCountryId({ ipCountryCode: 'ZA' });
    expect(result).toBe('za');
  });

  it('defaults to za when ipCountryCode is unsupported', () => {
    const result = getRecommendedCountryId({ ipCountryCode: 'us' });
    expect(result).toBe('za');
  });

  it('defaults to za when ipCountryCode is xx', () => {
    const result = getRecommendedCountryId({ ipCountryCode: 'xx' });
    expect(result).toBe('za');
  });

  it('defaults to za when ipCountryCode is unsupported, ignoring timezone', () => {
    const result = getRecommendedCountryId({
      ipCountryCode: 'xx',
      timezone: 'America/New_York'
    });
    expect(result).toBe('za');
  });

  it('defaults to za when ipCountryCode is unsupported and timezone is unknown', () => {
    const result = getRecommendedCountryId({
      ipCountryCode: 'xx',
      timezone: 'Unknown/Unknown',
      localeLanguage: 'en-GB'
    });
    expect(result).toBe('za');
  });

  it('defaults to za when ipCountryCode is zz', () => {
    const result = getRecommendedCountryId({ ipCountryCode: 'zz' });
    expect(result).toBe('za');
  });

  it('defaults to za when ipCountryCode is au', () => {
    const result = getRecommendedCountryId({
      ipCountryCode: 'au',
      timezone: 'Africa/Johannesburg',
      localeLanguage: 'en-US'
    });
    expect(result).toBe('za');
  });
});
