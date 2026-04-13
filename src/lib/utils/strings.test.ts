import { describe, expect, it } from 'vitest';
import { yearSlug } from './strings';

describe('yearSlug', () => {
  it('converts "Year 1" to "year-1"', () => {
    expect(yearSlug('Year 1')).toBe('year-1');
  });

  it('converts "2nd Year" to "year-2"', () => {
    expect(yearSlug('2nd Year')).toBe('year-2');
  });

  it('converts "3rd Year" to "year-3"', () => {
    expect(yearSlug('3rd Year')).toBe('year-3');
  });

  it('converts "4th Year" to "year-4"', () => {
    expect(yearSlug('4th Year')).toBe('year-4');
  });

  it('converts "First Year" to "year-1"', () => {
    expect(yearSlug('First Year')).toBe('year-1');
  });

  it('converts "Second Year" to "year-2"', () => {
    expect(yearSlug('Second Year')).toBe('year-2');
  });

  it('converts "year-1" to "year-1"', () => {
    expect(yearSlug('year-1')).toBe('year-1');
  });

  it('converts "year_3" to "year-3"', () => {
    expect(yearSlug('year_3')).toBe('year-3');
  });

  it('handles empty string and returns "year-1"', () => {
    expect(yearSlug('')).toBe('year-1');
  });

  it('handles whitespace-only string and returns "year-1"', () => {
    expect(yearSlug('   ')).toBe('year-1');
  });

  it('is case insensitive', () => {
    expect(yearSlug('YEAR 1')).toBe('year-1');
    expect(yearSlug('FIRST YEAR')).toBe('year-1');
  });
});