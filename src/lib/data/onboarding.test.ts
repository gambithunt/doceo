import { describe, expect, it } from 'vitest';
import { getCurriculumsByCountry, getRecommendedCountryId, onboardingCountries } from './onboarding';

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

describe('country recommendation', () => {
  it('returns a country id when timezone matches a supported country', () => {
    const result = getRecommendedCountryId({ timezone: 'Africa/Johannesburg' });
    expect(result).toBe('za');
  });

  it('returns a country id when locale language matches a supported country', () => {
    const result = getRecommendedCountryId({ localeLanguage: 'en-ZA' });
    expect(result).toBe('za');
  });

  it('returns null when no valid signals are provided', () => {
    const result = getRecommendedCountryId({});
    expect(result).toBeNull();
  });

  it('falls back to null for unknown timezone', () => {
    const result = getRecommendedCountryId({ timezone: 'Unknown/Unknown' });
    expect(result).toBeNull();
  });

  it('falls back to null for unknown locale language', () => {
    const result = getRecommendedCountryId({ localeLanguage: 'xx-XX' });
    expect(result).toBeNull();
  });

  it('prefers timezone over locale when both are provided', () => {
    const result = getRecommendedCountryId({
      timezone: 'Africa/Johannesburg',
      localeLanguage: 'en-US'
    });
    expect(result).toBe('za');
  });

  it('returns null when timezone is not in the supported list', () => {
    const result = getRecommendedCountryId({ timezone: 'Antarctica/DumontDUrville' });
    expect(result).toBeNull();
  });

  it('maps US timezone to US country', () => {
    const result = getRecommendedCountryId({ timezone: 'America/New_York' });
    expect(result).toBe('us');
  });

  it('maps UK timezone to GB country', () => {
    const result = getRecommendedCountryId({ timezone: 'Europe/London' });
    expect(result).toBe('gb');
  });

  it('maps Australia timezone to AU country', () => {
    const result = getRecommendedCountryId({ timezone: 'Australia/Sydney' });
    expect(result).toBe('au');
  });

  it('maps India timezone to IN country', () => {
    const result = getRecommendedCountryId({ timezone: 'Asia/Kolkata' });
    expect(result).toBe('in');
  });

  it('returns a country id when ipCountryCode matches a supported country', () => {
    const result = getRecommendedCountryId({ ipCountryCode: 'ZA' });
    expect(result).toBe('za');
  });

  it('returns a country id when ipCountryCode is lowercase', () => {
    const result = getRecommendedCountryId({ ipCountryCode: 'us' });
    expect(result).toBe('us');
  });

  it('prefers ipCountryCode over timezone when both are provided', () => {
    const result = getRecommendedCountryId({
      ipCountryCode: 'us',
      timezone: 'Africa/Johannesburg'
    });
    expect(result).toBe('us');
  });

  it('prefers ipCountryCode over localeLanguage when both are provided', () => {
    const result = getRecommendedCountryId({
      ipCountryCode: 'gb',
      localeLanguage: 'en-ZA'
    });
    expect(result).toBe('gb');
  });

  it('prefers ipCountryCode over timezone and localeLanguage when all are provided', () => {
    const result = getRecommendedCountryId({
      ipCountryCode: 'au',
      timezone: 'Africa/Johannesburg',
      localeLanguage: 'en-US'
    });
    expect(result).toBe('au');
  });

  it('falls back to timezone when ipCountryCode is not a supported country', () => {
    const result = getRecommendedCountryId({
      ipCountryCode: 'xx',
      timezone: 'America/New_York'
    });
    expect(result).toBe('us');
  });

  it('falls back to locale when ipCountryCode is not supported and timezone is unknown', () => {
    const result = getRecommendedCountryId({
      ipCountryCode: 'xx',
      timezone: 'Unknown/Unknown',
      localeLanguage: 'en-GB'
    });
    expect(result).toBe('gb');
  });

  it('returns null when ipCountryCode is unsupported and no fallback signals exist', () => {
    const result = getRecommendedCountryId({
      ipCountryCode: 'xx'
    });
    expect(result).toBeNull();
  });

  it('treats unsupported ipCountryCode as missing and falls through to timezone', () => {
    const result = getRecommendedCountryId({
      ipCountryCode: 'zz',
      timezone: 'Europe/London'
    });
    expect(result).toBe('gb');
  });
});
