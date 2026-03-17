export type GradeBand = 'intermediate' | 'senior' | 'fet';

export interface SubjectVerifyRequest {
  name: string;
  curriculumId: string;
  curriculum: string;
  gradeId: string;
  grade: string;
  country: string;
}

export interface SubjectVerifyResult {
  valid: boolean;
  normalizedName: string | null;
  category: 'core' | 'language' | 'elective' | null;
  gradeBand: GradeBand | null;
  reason: string | null;
  suggestion: string | null;
}

export interface SubjectVerifyResponse {
  result: SubjectVerifyResult;
  provider: string;
  provisional?: boolean;
}

export function buildSubjectVerifySystemPrompt(): string {
  return [
    'You are a curriculum expert for South African school education (Grades 5–12).',
    'You validate whether a subject name is a real, recognised school subject for a given curriculum and grade.',
    'Return JSON only — no markdown, no explanation — with exactly these keys:',
    '{ "valid": boolean, "normalizedName": string | null, "category": "core" | "language" | "elective" | null,',
    '"gradeBand": "intermediate" | "senior" | "fet" | null, "reason": string | null, "suggestion": string | null }',
    'Grade bands: intermediate = Grades 5–6, senior = Grades 7–9, fet = Grades 10–12.',
    'Rules:',
    '- Set valid=true only if the subject is legitimately taught in South African schools for the given curriculum and grade band.',
    '- normalizedName must be the official, correctly capitalised subject name (e.g. "Business Studies", not "business studies" or "bussiness").',
    '- category: "core" for Mathematics/Mathematical Literacy, "language" for any language subject, "elective" for everything else.',
    '- gradeBand: the grade band where this subject is offered. If offered in multiple bands, return the band that matches the student\'s grade.',
    '- reason: brief explanation if valid=false, otherwise null.',
    '- suggestion: the correct name if the student likely misspelled, otherwise null.',
    '- If the input is gibberish, a person\'s name, or clearly not a school subject, set valid=false.'
  ].join(' ');
}

export function buildSubjectVerifyUserPrompt(request: SubjectVerifyRequest): string {
  return JSON.stringify({
    subject_name: request.name,
    curriculum: request.curriculum,
    grade: request.grade,
    country: request.country
  });
}

export function parseSubjectVerifyResponse(content: string): SubjectVerifyResult | null {
  try {
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned) as SubjectVerifyResult;
    if (typeof parsed.valid === 'boolean') {
      return parsed;
    }
  } catch {
    // fall through
  }
  return null;
}

/** Grade numbers that belong to each band for a given curriculum. */
export function gradeNumbersForBand(band: GradeBand): number[] {
  if (band === 'intermediate') return [5, 6];
  if (band === 'senior') return [7, 8, 9];
  return [10, 11, 12];
}

/** Build the curriculum_subjects row ID matching makeSubject() in onboarding.ts */
export function buildSubjectId(curriculumId: string, gradeId: string, name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return `${curriculumId}-${gradeId}-${slug}`;
}

/** Build gradeId strings for all grades in a band, matching the pattern in onboarding.ts */
export function gradeIdsForBand(curriculumId: string, band: GradeBand): string[] {
  const numbers = gradeNumbersForBand(band);
  return numbers.map((n) =>
    curriculumId === 'caps' ? `grade-${n}` : `ieb-grade-${n}`
  );
}

/** Local fallback — used when the edge function is unavailable */
export function buildProvisionalResult(name: string): SubjectVerifyResult {
  return {
    valid: false,
    normalizedName: null,
    category: null,
    gradeBand: null,
    reason: null,
    suggestion: null
  };
}

// keeps the linter happy — name is used by callers
void buildProvisionalResult;
