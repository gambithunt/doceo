const CANONICAL_SUBJECT_KEYS = [
  'computer-science',
  'mathematics',
  'physics',
  'chemistry',
  'biology',
  'engineering',
  'psychology',
  'economics',
  'business-management',
  'law',
  'accounting',
  'english',
  'statistics'
];

const SUBJECT_ALIASES: Record<string, string[]> = {
  'computer-science': [
    'computer science',
    'comp sci',
    'cs',
    'computer sci',
    'computing',
    'informatics'
  ],
  mathematics: ['maths', 'math', 'pure mathematics', 'applied mathematics'],
  physics: ['physical science', 'fundamentals of physics'],
  chemistry: [
    'chem',
    'organic chemistry',
    'inorganic chemistry',
    'physical chemistry'
  ],
  biology: ['bio', 'life sciences', 'biological sciences'],
  engineering: [
    'eng',
    'chemical engineering',
    'mechanical engineering',
    'electrical engineering',
    'civil engineering'
  ],
  psychology: ['psych', 'behavioural science', 'behavioral science'],
  economics: ['econ', 'political economy', 'economic studies'],
  'business-management': [
    'business management',
    'business',
    'management',
    'bba',
    'mba'
  ],
  law: ['jurisprudence', 'legal studies', 'llb'],
  accounting: [
    'accountancy',
    'bookkeeping',
    'financial accounting',
    'management accounting'
  ],
  english: [
    'english language',
    'literature',
    'english literature',
    'academic writing'
  ],
  statistics: [
    'stats',
    'statistical analysis',
    'data science',
    'data analysis'
  ]
};

function normalizeSubjectKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function stripStubPrefix(slug: string): string {
  return slug.replace(/^subject-stub-/, '');
}

interface MatchCandidate {
  canonicalKey: string;
  slug: string;
}

function buildMatchCandidates(): MatchCandidate[] {
  const candidates: MatchCandidate[] = CANONICAL_SUBJECT_KEYS.map((key) => ({
    canonicalKey: key,
    slug: key
  }));

  for (const [canonicalKey, aliases] of Object.entries(SUBJECT_ALIASES)) {
    for (const alias of aliases) {
      candidates.push({ canonicalKey, slug: normalizeSubjectKey(alias) });
    }
  }

  return candidates.sort((a, b) => b.slug.length - a.slug.length);
}

const MATCH_CANDIDATES = buildMatchCandidates();

function findSubjectKey(input: string): string | null {
  if (!input) return null;

  const normalized = stripStubPrefix(normalizeSubjectKey(input));

  if (!normalized) return null;

  if (CANONICAL_SUBJECT_KEYS.includes(normalized)) {
    return normalized;
  }

  for (const { canonicalKey, slug } of MATCH_CANDIDATES) {
    if (slug === normalized) {
      return canonicalKey;
    }
  }

  const padded = `-${normalized}-`;
  for (const { canonicalKey, slug } of MATCH_CANDIDATES) {
    if (padded.includes(`-${slug}-`)) {
      return canonicalKey;
    }
  }

  return null;
}

export { normalizeSubjectKey, findSubjectKey, CANONICAL_SUBJECT_KEYS };