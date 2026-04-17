export type TopicLoadingCopyFamily =
  | 'mathematics'
  | 'language'
  | 'science'
  | 'humanities'
  | 'business'
  | 'geography'
  | 'generic';

interface TopicLoadingCopyInput {
  subjectName: string;
  topicTitle: string;
}

interface TopicLoadingCopy {
  family: TopicLoadingCopyFamily;
  headline: string;
  supportingLine: string;
}

const SUPPORTING_LINE = 'Finding the clearest way in.';

const PHRASE_BANKS: Record<TopicLoadingCopyFamily, string[]> = {
  mathematics: [
    'Coalescing numbers...',
    'Synthesizing equations...',
    'Calculating patterns...',
    'Crunching variables...',
    'Aligning proofs...',
    'Unravelling ratios...'
  ],
  language: [
    'Inferring verbs...',
    'Weaving meaning...',
    'Deciphering tone...',
    'Crafting sentences...',
    'Elucidating language...',
    'Perusing themes...'
  ],
  science: [
    'Tracing reactions...',
    'Synthesizing forces...',
    'Inferring energy...',
    'Coalescing cells...',
    'Calculating motion...',
    'Channelling momentum...'
  ],
  humanities: [
    'Aligning timelines...',
    'Tracing causes...',
    'Deciphering movements...',
    'Synthesizing sources...',
    'Contemplating turning points...',
    'Perusing evidence...'
  ],
  business: [
    'Calculating value...',
    'Synthesizing markets...',
    'Coalescing ledgers...',
    'Inferring trends...',
    'Wrangling accounts...',
    'Tracing incentives...'
  ],
  geography: [
    'Mapping terrain...',
    'Tracing regions...',
    'Synthesizing climates...',
    'Inferring landscapes...',
    'Coalescing maps...',
    'Perusing patterns...'
  ],
  generic: [
    'Crafting your lesson...',
    'Mapping the way in...',
    'Preparing your path...',
    'Synthesizing ideas...',
    'Gathering the route...',
    'Shaping your mission...'
  ]
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function resolveFamily(subjectName: string): TopicLoadingCopyFamily {
  const normalizedSubject = normalize(subjectName);

  if (normalizedSubject.includes('math')) return 'mathematics';
  if (
    normalizedSubject.includes('english') ||
    normalizedSubject.includes('afrikaans') ||
    normalizedSubject.includes('language')
  ) {
    return 'language';
  }
  if (
    normalizedSubject.includes('physics') ||
    normalizedSubject.includes('chemistry') ||
    normalizedSubject.includes('biology') ||
    normalizedSubject.includes('life science') ||
    normalizedSubject.includes('science')
  ) {
    return 'science';
  }
  if (normalizedSubject.includes('history') || normalizedSubject.includes('social')) return 'humanities';
  if (
    normalizedSubject.includes('economics') ||
    normalizedSubject.includes('business') ||
    normalizedSubject.includes('accounting')
  ) {
    return 'business';
  }
  if (normalizedSubject.includes('geography')) return 'geography';
  return 'generic';
}

function pickDeterministicIndex(subjectName: string, topicTitle: string, size: number): number {
  const seed = `${normalize(subjectName)}|${normalize(topicTitle)}`;
  let hash = 0;

  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  return hash % size;
}

export function selectTopicLoadingCopy(input: TopicLoadingCopyInput): TopicLoadingCopy {
  const family = resolveFamily(input.subjectName);
  const bank = PHRASE_BANKS[family];
  const headline = bank[pickDeterministicIndex(input.subjectName, input.topicTitle, bank.length)] ?? PHRASE_BANKS.generic[0];

  return {
    family,
    headline,
    supportingLine: SUPPORTING_LINE
  };
}
