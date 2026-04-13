export function deduplicateSubjects(subjects: string[]): string[] {
  return Array.from(
    new Set(subjects.map((subject) => subject.trim()).filter((subject) => subject.length > 0))
  );
}

const YEAR_NUMERIC_MAP: Record<string, string> = {
  '1st': '1',
  '2nd': '2',
  '3rd': '3',
  '4th': '4',
  '5th': '5',
  '6th': '6',
  '7th': '7',
  '8th': '8',
  '9th': '9',
  '10th': '10'
};

const YEAR_WORDS_MAP: Record<string, string> = {
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
  ten: '10',
  first: '1',
  second: '2',
  third: '3',
  fourth: '4',
  fifth: '5',
  sixth: '6',
  seventh: '7',
  eighth: '8',
  ninth: '9',
  tenth: '10'
};

export function yearSlug(level: string): string {
  if (!level) {
    return 'year-1';
  }

  const normalized = level.trim().toLowerCase();

  const numericMatch = normalized.match(/^(\d+)(?:st|nd|rd|th)?\s*year$/i);
  if (numericMatch) {
    const num = numericMatch[1]!;
    return `year-${num}`;
  }

  const ordinalMatch = normalized.match(/^(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\s*year$/i);
  if (ordinalMatch) {
    const word = ordinalMatch[1]!.toLowerCase();
    const num = YEAR_WORDS_MAP[word];
    if (num) {
      return `year-${num}`;
    }
  }

  const plainWordMatch = normalized.match(/^(one|two|three|four|five|six|seven|eight|nine|ten)\s*year$/i);
  if (plainWordMatch) {
    const word = plainWordMatch[1]!.toLowerCase();
    const num = YEAR_WORDS_MAP[word];
    if (num) {
      return `year-${num}`;
    }
  }

  const justYearMatch = normalized.match(/^year[-_\s]*(\d+)$/i);
  if (justYearMatch) {
    return `year-${justYearMatch[1]}`;
  }

  return 'year-1';
}
