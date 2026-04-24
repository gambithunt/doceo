import type { ConceptDiagnostic, QuestionOption } from '$lib/types';

export interface ConceptDiagnosticDraft {
  name: string;
  simpleDefinition: string;
  example: string;
  explanation: string;
  quickCheck: string;
  commonMisconception?: string;
  whyItMatters?: string;
}

function uniqueOptionTexts(options: QuestionOption[]): QuestionOption[] {
  const seen = new Set<string>();
  return options.filter((option) => {
    const normalized = option.text.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  });
}

function buildInterpretationDiagnosticOptions(
  draft: ConceptDiagnosticDraft,
  distractors: [string, string, string]
): QuestionOption[] {
  return uniqueOptionTexts([
    {
      id: 'a',
      label: 'A',
      text: draft.explanation
    },
    {
      id: 'b',
      label: 'B',
      text: distractors[0]
    },
    {
      id: 'c',
      label: 'C',
      text: distractors[1]
    },
    {
      id: 'd',
      label: 'D',
      text: distractors[2]
    }
  ]);
}

function deriveAlignedDiagnosticOptions(draft: ConceptDiagnosticDraft): QuestionOption[] | null {
  const conceptName = draft.name.trim().toLowerCase();
  const prompt = draft.quickCheck.trim().toLowerCase();
  const example = draft.example.trim();

  if (conceptName.includes('metaphor') && /what does .+ suggest\??$/.test(prompt)) {
    return buildInterpretationDiagnosticOptions(draft, [
      'It means the moon is literally a ship sailing at sea.',
      draft.simpleDefinition,
      'It makes the moon feel cheerful, ordinary, and safe.'
    ]);
  }

  if (conceptName.includes('imagery') && prompt.includes('which sense stands out')) {
    return [
      { id: 'a', label: 'A', text: 'Hearing' },
      { id: 'b', label: 'B', text: 'Sight' },
      { id: 'c', label: 'C', text: 'Taste' },
      { id: 'd', label: 'D', text: 'Touch' }
    ];
  }

  if (conceptName.includes('tone') && prompt.startsWith('what tone')) {
    return [
      { id: 'a', label: 'A', text: 'Subdued and weary' },
      { id: 'b', label: 'B', text: 'Cheerful and playful' },
      { id: 'c', label: 'C', text: 'Angry and aggressive' },
      { id: 'd', label: 'D', text: 'Triumphant and proud' }
    ];
  }

  if (conceptName.includes('self-concept') && prompt.startsWith('what does this sentence reveal')) {
    return [
      { id: 'a', label: 'A', text: 'The learner sees themselves as persistent and resilient.' },
      { id: 'b', label: 'B', text: 'The learner is being pressured by friends to change.' },
      { id: 'c', label: 'C', text: 'The learner values honesty more than success.' },
      { id: 'd', label: 'D', text: 'The learner is describing what happened in a test.' }
    ];
  }

  if (conceptName.includes('values') && prompt.startsWith('which value')) {
    return [
      { id: 'a', label: 'A', text: 'Honesty' },
      { id: 'b', label: 'B', text: 'Popularity' },
      { id: 'c', label: 'C', text: 'Convenience' },
      { id: 'd', label: 'D', text: 'Competition' }
    ];
  }

  if (conceptName.includes('influence') && prompt.startsWith('who is influencing')) {
    return [
      { id: 'a', label: 'A', text: 'The new friend group' },
      { id: 'b', label: 'B', text: 'The learner’s teacher' },
      { id: 'c', label: 'C', text: 'The learner’s family' },
      { id: 'd', label: 'D', text: 'No one; the learner is acting independently' }
    ];
  }

  if (conceptName.includes('ratio') && prompt.startsWith('why are')) {
    return [
      { id: 'a', label: 'A', text: 'Because both ratios compare the quantities in the same proportion.' },
      { id: 'b', label: 'B', text: 'Because both ratios use even numbers.' },
      { id: 'c', label: 'C', text: 'Because the second ratio has larger numbers, so it is automatically equivalent.' },
      { id: 'd', label: 'D', text: 'Because both ratios add up to the same total.' }
    ];
  }

  if (conceptName.includes('equilateral') && prompt.startsWith('which feature tells')) {
    return [
      { id: 'a', label: 'A', text: 'All three sides are the same length.' },
      { id: 'b', label: 'B', text: 'Only two sides are the same length.' },
      { id: 'c', label: 'C', text: 'It has one right angle.' },
      { id: 'd', label: 'D', text: 'All three sides are different lengths.' }
    ];
  }

  if (conceptName.includes('isosceles') && prompt.startsWith('which two sides')) {
    return [
      { id: 'a', label: 'A', text: 'The two equal sides' },
      { id: 'b', label: 'B', text: 'All three sides' },
      { id: 'c', label: 'C', text: 'The shortest and longest side' },
      { id: 'd', label: 'D', text: 'No sides; only the angles matter' }
    ];
  }

  if (conceptName.includes('scalene') && prompt.startsWith('what feature shows')) {
    return [
      { id: 'a', label: 'A', text: 'All three sides have different lengths.' },
      { id: 'b', label: 'B', text: 'Two sides are equal.' },
      { id: 'c', label: 'C', text: 'All three angles are right angles.' },
      { id: 'd', label: 'D', text: `The triangle uses the example ${example}.` }
    ];
  }

  return null;
}

function buildGenericDiagnosticOptions(draft: ConceptDiagnosticDraft): QuestionOption[] {
  return uniqueOptionTexts([
    {
      id: 'a',
      label: 'A',
      text: draft.explanation
    },
    {
      id: 'b',
      label: 'B',
      text: draft.simpleDefinition
    },
    {
      id: 'c',
      label: 'C',
      text:
        draft.commonMisconception ??
        draft.whyItMatters ??
        `It only repeats the example instead of answering the question about ${draft.name}.`
    },
    {
      id: 'd',
      label: 'D',
      text: `It means exactly this: ${draft.example}`
    }
  ]);
}

export function buildConceptDiagnostic(draft: ConceptDiagnosticDraft): ConceptDiagnostic {
  return {
    prompt: draft.quickCheck,
    options: deriveAlignedDiagnosticOptions(draft) ?? buildGenericDiagnosticOptions(draft),
    correctOptionId: 'a',
    rationale: draft.explanation
  };
}
