import { createConceptItem } from '$lib/lesson-concept-contract';
import { getSubjectLens } from '$lib/lesson-subject-lens';
import type { ConceptItem, Lesson, LessonFlowV2Loop, LessonSection, Question, QuestionOption } from '$lib/types';

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function toTopicLabel(value: string): string {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return 'Core Ideas';
  }

  return trimmed.replace(/\s+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function buildBoundedPracticePrompt(topicTitle: string, subjectName: string, lens: ReturnType<typeof getSubjectLens>): string {
  return [
    `Use the worked example as a model for **${topicTitle}** in ${subjectName}.`,
    ``,
    `**Task:** Name the ${lens.conceptWord} or rule you would use, point to the clue, value, quote, or piece of evidence that makes it fit, and show the first step clearly.`,
    ``,
    `**Response frame:**`,
    `1. Rule or ${lens.conceptWord}: ...`,
    `2. Clue or evidence from the lesson: ...`,
    `3. First step: ...`,
    ``,
    `Stay with the information already given in the lesson. Do not start by inventing a separate practical example.`
  ].join('\n');
}

function buildBoundedTransferChallenge(topicTitle: string, subjectName: string, lens: ReturnType<typeof getSubjectLens>): string {
  return [
    `Try a slightly changed version of **${topicTitle}** in ${subjectName}.`,
    ``,
    `**Task:** Say what stays the same from the original method or idea, what changes in this new case, and what first adapted step you would take.`,
    ``,
    `**Response frame:**`,
    `1. What stays the same: ...`,
    `2. What changes: ...`,
    `3. First adapted step with ${lens.evidenceWord}: ...`,
    ``,
    `Keep your answer tied to the given task or case, not an unrelated example.`
  ].join('\n');
}

function buildCheckQuestionOptions(lens: ReturnType<typeof getSubjectLens>): QuestionOption[] {
  return [
    {
      id: 'a',
      label: 'A',
      text: `Name the ${lens.conceptWord} or rule first, then use evidence from the question.`
    },
    {
      id: 'b',
      label: 'B',
      text: 'Start with a practical example from daily life, even if the question already gives enough information.'
    },
    {
      id: 'c',
      label: 'C',
      text: 'Write only the final answer and add steps later if someone asks for them.'
    },
    {
      id: 'd',
      label: 'D',
      text: 'Repeat the topic name and hope the marker can infer the method.'
    }
  ];
}

export function buildDynamicLessonFromTopic(input: {
  subjectId: string;
  subjectName: string;
  grade: string;
  topicTitle: string;
  topicDescription: string;
  curriculumReference: string;
}): Lesson {
  const topicTitle = toTopicLabel(input.topicTitle);
  // Pass grade so lens vocabulary and examples are calibrated to the student's level
  const lens = getSubjectLens(input.subjectName, input.grade);
  const rootId = `generated-${input.subjectId}-${slugify(topicTitle)}`;
  const topicId = `${rootId}-topic`;
  const subtopicId = `${rootId}-subtopic`;

  return {
    id: `${rootId}-lesson`,
    topicId,
    subtopicId,
    subjectId: input.subjectId,
    grade: input.grade,
    lessonFlowVersion: 'v1',
    title: `${input.subjectName}: ${topicTitle}`,
    orientation: {
      title: 'Orientation',
      body: `In this lesson you're exploring **${topicTitle}** in ${input.subjectName} (${input.grade}). By the end you should be able to name the key ${lens.conceptWord}, explain how it works, and apply it to a real example. This topic matters because it unlocks a core pattern you'll use again and again.`
    },
    mentalModel: {
      title: 'Big Picture',
      body: `Think of **${topicTitle}** as a lens that helps you see patterns in ${input.subjectName}. Before diving into rules, picture the overall shape of the idea: there is a ${lens.conceptWord} at the centre, a process that connects things, and a way to check if you've applied it correctly. Hold that picture in mind as we build the details.`
    },
    concepts: {
      title: 'Key Concepts',
      body: `The main ${lens.conceptWord} in **${topicTitle}** is what holds the idea together. To understand ${topicTitle} in ${input.subjectName}, you need to ${lens.actionWord}. Focus on no more than three core ideas at once: (1) what ${topicTitle} is, (2) why the rule works, and (3) when to apply it. Avoid ${lens.misconception}.`
    },
    guidedConstruction: {
      title: 'Guided Construction',
      body: `Here is how to think through **${topicTitle}** step by step:\n\n**Step 1.** Read the problem and identify the ${lens.conceptWord} you are working with.\n\n**Step 2.** Write down what you know and what you need to find.\n\n**Step 3.** Apply the rule: ${lens.actionWord}.\n\n**Step 4.** Check your reasoning — does your answer match the ${lens.evidenceWord}? Have you avoided ${lens.misconception}?\n\nNarrate each decision as you go. The goal is to make your thinking visible.`
    },
    workedExample: {
      title: 'Worked Example',
      body: `**Example — ${topicTitle} in ${input.subjectName}:**\n\n${lens.example}\n\nNotice how each step stays connected to the rule for ${topicTitle}. The key move is to name the ${lens.conceptWord} first, then apply it. Avoid ${lens.misconception} — always justify each step before writing the answer.`
    },
    practicePrompt: {
      title: 'Active Practice',
      body: buildBoundedPracticePrompt(topicTitle, input.subjectName, lens)
    },
    commonMistakes: {
      title: 'Common Mistakes',
      body: `The most common error with **${topicTitle}** is ${lens.misconception}. When this happens, students often get the right process but wrong result — or skip a step that looks obvious but isn't. Fix: always name the ${lens.conceptWord} before applying it, and check each step against the ${lens.evidenceWord}.`
    },
    transferChallenge: {
      title: 'Transfer Challenge',
      body: buildBoundedTransferChallenge(topicTitle, input.subjectName, lens)
    },
    summary: {
      title: 'Summary',
      body: [
        `**${topicTitle} — key takeaways:**`,
        ``,
        `**Core rule:** The central ${lens.conceptWord} is what defines this topic. Apply it by: ${lens.actionWord}.`,
        ``,
        `**Watch out for:** ${lens.misconception}. Always confirm your answer with ${lens.evidenceWord}.`,
        ``,
        `**Transfer:** If you can ${lens.actionWord.split(' and ')[0]} on a problem you haven't seen before, you're ready for exam questions on ${topicTitle}.`
      ].join('\n')
    },
    keyConcepts: buildDynamicConceptItems(
      topicTitle,
      input.topicDescription,
      input.subjectName,
      input.grade
    ),
    flowV2: null,
    practiceQuestionIds: [`${rootId}-q-1`],
    masteryQuestionIds: [`${rootId}-q-2`]
  };
}

export type LessonTopicShape =
  | 'technique_or_feature'
  | 'process_or_mechanism'
  | 'principle_or_rule'
  | 'comparison_or_distinction'
  | 'cause_and_effect'
  | 'classification_or_categories';

interface FallbackConceptContext {
  topicTitle: string;
  topicDescription: string;
  subjectName: string;
  grade: string;
}

interface ConceptTeachingSeed {
  simpleDefinition: string;
  example: string;
  explanation: string;
  quickCheck: string;
}

const GENERIC_TOPIC_LABEL_WORDS = new Set([
  'types',
  'type',
  'forms',
  'form',
  'kinds',
  'kind',
  'categories',
  'category',
  'basics',
  'introduction',
  'overview',
  'causes',
  'cause',
  'effects',
  'effect',
  'difference',
  'between',
  'and',
  'of'
]);

const PLACEHOLDER_TOPIC_DESCRIPTION_PATTERN =
  /^\s*(ai[- ]suggested topic|suggested topic|provisional planner topic(?: for .+)?|topic description|exploration candidate)\s*$/i;
const PLACEHOLDER_TOPIC_DESCRIPTION_FRAGMENT_PATTERN =
  /\b(ai[- ]suggested topic|suggested topic|provisional planner topic(?: for .+)?|exploration candidate)\b/gi;
const INSTRUCTIONAL_DESCRIPTION_PATTERN =
  /^(quote|identify|define|state|explain|compare|choose|use|look at)\b|^(a worked example shows|a final check compares|the example shows how)\b/i;

function normalizeLabelKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizeTopicDescription(topicDescription: string, topicTitle: string): string {
  const trimmed = topicDescription.trim();

  if (!trimmed) {
    return '';
  }

  if (PLACEHOLDER_TOPIC_DESCRIPTION_PATTERN.test(trimmed)) {
    return '';
  }

  const cleaned = trimmed
    .replace(PLACEHOLDER_TOPIC_DESCRIPTION_FRAGMENT_PATTERN, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned || normalizeLabelKey(cleaned) === normalizeLabelKey(topicTitle)) {
    return '';
  }

  return cleaned;
}

function deriveFallbackSeedLabels(shape: LessonTopicShape, context: FallbackConceptContext): string[] {
  const subject = context.subjectName.toLowerCase();
  const topic = context.topicTitle.toLowerCase();

  if (shape === 'technique_or_feature' && (subject.includes('english') || subject.includes('language'))) {
    if (/(sound|sound devices)/.test(topic)) {
      return ['Alliteration', 'Onomatopoeia', 'Repetition'];
    }

    if (/(poetry|prose|techniques?|devices?|literary|rhetorical)/.test(topic)) {
      return ['Metaphor', 'Imagery', 'Tone'];
    }
  }

  if (shape === 'principle_or_rule' && (subject.includes('life orientation') || subject.includes('social'))) {
    if (/(identity|self)/.test(topic)) {
      return ['Self-concept', 'Values', 'Influence'];
    }
  }

  if (subject.includes('science') || subject.includes('biology')) {
    if (/(plant|flower).*(reproduction|growth)|reproduction.*plant|growth.*plant/.test(topic)) {
      return ['Pollination', 'Fertilisation', 'Germination'];
    }

    if (/(photosynthesis)/.test(topic)) {
      return ['Chlorophyll', 'Light energy', 'Glucose'];
    }

    if (/(osmosis)/.test(topic)) {
      return ['Partially permeable membrane', 'Water movement', 'Concentration gradient'];
    }
  }

  return [];
}

function deriveConceptExampleSeed(context: FallbackConceptContext, conceptName: string): string | null {
  const subject = context.subjectName.toLowerCase();
  const concept = conceptName.toLowerCase();

  if (subject.includes('english') || subject.includes('language')) {
    if (concept.includes('metaphor')) {
      return '“The moon was a ghostly galleon.”';
    }

    if (concept.includes('imagery')) {
      return '“Cold rain tapped against the tin roof.”';
    }

    if (concept.includes('tone')) {
      return '“He drifted home in the grey evening, too tired to speak.”';
    }

    if (concept.includes('alliteration')) {
      return '“Silver ships sailed silently.”';
    }

    if (concept.includes('onomatopoeia')) {
      return '“Buzz, hiss, and crack echoed through the room.”';
    }

    if (concept.includes('repetition')) {
      return '“Never, never, never give up.”';
    }
  }

  if (subject.includes('life orientation') || subject.includes('social')) {
    if (concept.includes('self-concept')) {
      return 'A learner says, “I am someone who keeps trying even when I struggle.”';
    }

    if (concept.includes('values')) {
      return 'A learner refuses to cheat in a test because honesty matters to them.';
    }

    if (concept.includes('belonging')) {
      return 'A learner feels more confident after joining a club where they feel accepted.';
    }

    if (concept.includes('influence')) {
      return 'A learner starts dressing differently because they want to fit in with a new friend group.';
    }

    if (concept.includes('identity')) {
      return 'A learner notices that they act one way at home and another way with friends while still holding on to their values.';
    }
  }

  if (subject.includes('math')) {
    if (concept.includes('ratio')) {
      return 'The ratios 2:3 and 4:6 are equivalent because both compare the same relationship.';
    }

    if (concept.includes('equilateral')) {
      return 'An equilateral triangle has sides 5 cm, 5 cm, and 5 cm.';
    }

    if (concept.includes('isosceles')) {
      return 'An isosceles triangle has sides 6 cm, 6 cm, and 4 cm.';
    }

    if (concept.includes('scalene')) {
      return 'A scalene triangle has sides 4 cm, 5 cm, and 6 cm.';
    }
  }

  if (subject.includes('science') || subject.includes('biology')) {
    if (concept.includes('pollination')) {
      return 'A bee carries pollen from the anther of one flower to the stigma of another flower.';
    }

    if (concept.includes('fertilisation')) {
      return 'After pollen reaches the stigma, a male cell joins with an egg cell inside the ovule.';
    }

    if (concept.includes('germination')) {
      return 'A seed in moist soil begins to grow a root and a small shoot.';
    }

    if (concept.includes('chlorophyll')) {
      return 'Green chlorophyll in a leaf absorbs light energy from the Sun.';
    }

    if (concept.includes('light energy')) {
      return 'A plant in bright light makes more glucose than a plant kept in darkness.';
    }

    if (concept.includes('glucose')) {
      return 'A leaf uses carbon dioxide and water to make glucose during photosynthesis.';
    }

    if (concept.includes('membrane')) {
      return 'Water moves through a partially permeable membrane while larger solute particles stay behind.';
    }

    if (concept.includes('water movement')) {
      return 'Water moves from the dilute side to the more concentrated side through the membrane.';
    }

    if (concept.includes('concentration gradient')) {
      return 'One side of the membrane has more dissolved particles than the other side.';
    }
  }

  return null;
}

function deriveConceptTeachingSeed(
  context: FallbackConceptContext,
  conceptName: string
): ConceptTeachingSeed | null {
  const subject = context.subjectName.toLowerCase();
  const concept = conceptName.toLowerCase();

  if (subject.includes('english') || subject.includes('language')) {
    if (concept.includes('metaphor')) {
      return {
        simpleDefinition: 'A metaphor describes one thing as another to sharpen meaning.',
        example: '“The moon was a ghostly galleon.”',
        explanation: 'Calling the moon a “ghostly galleon” makes it feel strange, distant, and dramatic.',
        quickCheck: 'What does calling the moon a “ghostly galleon” suggest?'
      };
    }

    if (concept.includes('imagery')) {
      return {
        simpleDefinition: 'Imagery uses sensory language to help the reader see, hear, or feel a scene.',
        example: '“Cold rain tapped against the tin roof.”',
        explanation: 'The detail helps the reader hear the scene and feel its harsh mood.',
        quickCheck: 'Which sense stands out most in this line?'
      };
    }

    if (concept.includes('tone')) {
      return {
        simpleDefinition: 'Tone is the attitude or emotional colouring created by the writer’s word choice.',
        example: '“He drifted home in the grey evening, too tired to speak.”',
        explanation: 'The words create a subdued, weary tone.',
        quickCheck: 'What tone is created by “grey evening” and “too tired to speak”?'
      };
    }

    if (concept.includes('alliteration')) {
      return {
        simpleDefinition: 'Alliteration repeats the same starting consonant sound in nearby words.',
        example: '“Silver ships sailed silently.”',
        explanation: 'The repeated “s” sound makes the line feel smooth and hushed.',
        quickCheck: 'Which repeated sound creates the smooth effect in this line?'
      };
    }

    if (concept.includes('onomatopoeia')) {
      return {
        simpleDefinition: 'Onomatopoeia uses words that sound like the noise they describe.',
        example: '“Buzz, hiss, and crack echoed through the room.”',
        explanation: 'The sound words make the noise feel immediate and vivid.',
        quickCheck: 'Which word in the line sounds like the noise it describes?'
      };
    }

    if (concept.includes('repetition')) {
      return {
        simpleDefinition: 'Repetition repeats a word or phrase to make it stand out.',
        example: '“Never, never, never give up.”',
        explanation: 'Repeating “never” makes the speaker sound forceful and determined.',
        quickCheck: 'What effect does repeating “never” create?'
      };
    }
  }

  if (subject.includes('life orientation') || subject.includes('social')) {
    if (concept.includes('self-concept')) {
      return {
        simpleDefinition: 'Self-concept is the picture you build of who you are.',
        example: 'A learner says, “I am someone who keeps trying even when I struggle.”',
        explanation: 'That statement shows how the learner understands their own character and strengths.',
        quickCheck: 'What does this sentence reveal about the learner’s self-concept?'
      };
    }

    if (concept.includes('values')) {
      return {
        simpleDefinition: 'Values are the beliefs that guide the choices you make.',
        example: 'A learner refuses to cheat in a test because honesty matters to them.',
        explanation: 'The choice shows that honesty shapes the learner’s behaviour.',
        quickCheck: 'Which value is guiding the learner’s choice here?'
      };
    }

    if (concept.includes('influence')) {
      return {
        simpleDefinition: 'Influence is the effect that people, groups, or media can have on your identity.',
        example: 'A learner starts dressing differently because they want to fit in with a new friend group.',
        explanation: 'The change shows how peer pressure can shape the way someone presents themselves.',
        quickCheck: 'Who is influencing the learner’s behaviour in this example?'
      };
    }
  }

  if (subject.includes('math')) {
    if (concept.includes('ratio')) {
      return {
        simpleDefinition: 'Equivalent ratios compare quantities in the same proportion.',
        example: 'The ratios 2:3 and 4:6 are equivalent because both compare the same relationship.',
        explanation: 'Doubling both numbers keeps the relationship the same because the proportion does not change.',
        quickCheck: 'Why are 2:3 and 4:6 equivalent ratios?'
      };
    }

    if (concept.includes('equilateral')) {
      return {
        simpleDefinition: 'An equilateral triangle has three sides of the same length.',
        example: 'An equilateral triangle has sides 5 cm, 5 cm, and 5 cm.',
        explanation: 'Because all three sides match, the triangle belongs in the equilateral category.',
        quickCheck: 'Which feature tells you this triangle is equilateral?'
      };
    }

    if (concept.includes('isosceles')) {
      return {
        simpleDefinition: 'An isosceles triangle has two sides of the same length.',
        example: 'An isosceles triangle has sides 6 cm, 6 cm, and 4 cm.',
        explanation: 'Two matching sides place the triangle in the isosceles category.',
        quickCheck: 'Which two sides show that this triangle is isosceles?'
      };
    }

    if (concept.includes('scalene')) {
      return {
        simpleDefinition: 'A scalene triangle has three sides of different lengths.',
        example: 'A scalene triangle has sides 4 cm, 5 cm, and 6 cm.',
        explanation: 'Because no sides match, the triangle is scalene.',
        quickCheck: 'What feature shows that this triangle is scalene?'
      };
    }
  }

  if (subject.includes('science') || subject.includes('biology')) {
    if (concept.includes('pollination')) {
      return {
        simpleDefinition: 'Pollination is the transfer of pollen from the anther to the stigma of a flower.',
        example: 'A bee carries pollen from the anther of one flower to the stigma of another flower.',
        explanation: 'This matters because pollination allows the flower to begin the process that can lead to seed formation.',
        quickCheck: 'Which part of the flower receives pollen during pollination?'
      };
    }

    if (concept.includes('fertilisation')) {
      return {
        simpleDefinition: 'Fertilisation happens when the male cell from pollen joins with the egg cell in the ovule.',
        example: 'After pollen reaches the stigma, a male cell joins with an egg cell inside the ovule.',
        explanation: 'This joining forms the start of a new plant because it creates the fertilised cell that can develop into a seed.',
        quickCheck: 'What joins together during fertilisation in a flowering plant?'
      };
    }

    if (concept.includes('germination')) {
      return {
        simpleDefinition: 'Germination is when a seed starts to grow into a new plant.',
        example: 'A seed in moist soil begins to grow a root and a small shoot.',
        explanation: 'The root and shoot show that the seed has started using its stored food to grow.',
        quickCheck: 'What two early growth signs show that a seed has germinated?'
      };
    }

    if (concept.includes('chlorophyll')) {
      return {
        simpleDefinition: 'Chlorophyll is the green pigment in leaves that absorbs light energy.',
        example: 'Green chlorophyll in a leaf absorbs light energy from the Sun.',
        explanation: 'The absorbed light energy helps the plant make food during photosynthesis.',
        quickCheck: 'What does chlorophyll absorb for photosynthesis?'
      };
    }

    if (concept.includes('light energy')) {
      return {
        simpleDefinition: 'Light energy powers the reactions plants use to make food.',
        example: 'A plant in bright light makes more glucose than a plant kept in darkness.',
        explanation: 'The bright light gives the plant more energy for photosynthesis.',
        quickCheck: 'Why does the plant in bright light make more glucose?'
      };
    }

    if (concept.includes('glucose')) {
      return {
        simpleDefinition: 'Glucose is the sugar plants make as food during photosynthesis.',
        example: 'A leaf uses carbon dioxide and water to make glucose during photosynthesis.',
        explanation: 'Glucose stores energy that the plant can use for growth and repair.',
        quickCheck: 'What food does the plant make during photosynthesis?'
      };
    }

    if (concept.includes('partially permeable membrane')) {
      return {
        simpleDefinition: 'A partially permeable membrane lets water pass through but blocks some larger particles.',
        example: 'Water moves through a partially permeable membrane while larger solute particles stay behind.',
        explanation: 'This selective movement is what makes osmosis possible.',
        quickCheck: 'What can pass through a partially permeable membrane in osmosis?'
      };
    }

    if (concept.includes('water movement')) {
      return {
        simpleDefinition: 'In osmosis, water moves from a more dilute solution to a more concentrated solution.',
        example: 'Water moves from the dilute side to the more concentrated side through the membrane.',
        explanation: 'The movement reduces the difference in water concentration across the membrane.',
        quickCheck: 'In which direction does water move during osmosis?'
      };
    }

    if (concept.includes('concentration gradient')) {
      return {
        simpleDefinition: 'A concentration gradient is the difference in concentration between two areas.',
        example: 'One side of the membrane has more dissolved particles than the other side.',
        explanation: 'That difference drives water movement during osmosis.',
        quickCheck: 'What difference creates the concentration gradient here?'
      };
    }
  }

  return null;
}

function resolveConceptExample(
  context: FallbackConceptContext,
  conceptName: string,
  fallbackExample: string
): string {
  const seededExample = deriveConceptExampleSeed(context, conceptName);

  if (seededExample) {
    return seededExample;
  }

  const description = sanitizeTopicDescription(context.topicDescription, context.topicTitle);
  if (description && !INSTRUCTIONAL_DESCRIPTION_PATTERN.test(description)) {
    return description;
  }

  return fallbackExample;
}

export function buildOpeningStartSectionFromConcept(concept: ConceptItem): LessonSection {
  return {
    title: concept.name,
    body: [
      `**What it is:** ${concept.simpleDefinition ?? concept.oneLineDefinition ?? concept.summary}`,
      '',
      `**Example:** ${concept.example}`,
      '',
      `**Why it matters:** ${concept.explanation ?? concept.detail}`,
      '',
      `**Your turn:** ${concept.quickCheck ?? `What do you notice about ${concept.name}?`}`
    ].join('\n')
  };
}

function buildConceptAlignment(topicTitle: string, grade: string, alignmentNote: string) {
  return {
    topicMatch: topicTitle,
    gradeMatch: grade,
    alignmentNote
  };
}

function cleanDerivedLabel(value: string): string | null {
  const trimmed = value
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(like|such as|for example)\b.*$/i, '')
    .replace(/\b(by|using|with|through|across|into|from)\b.*$/i, '')
    .replace(/[.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!trimmed) {
    return null;
  }

  const lower = trimmed.toLowerCase();
  if (GENERIC_TOPIC_LABEL_WORDS.has(lower)) {
    return null;
  }

  const words = lower.split(' ').filter((word) => word.length > 1 && !GENERIC_TOPIC_LABEL_WORDS.has(word));
  if (words.length === 0) {
    return null;
  }

  return toTopicLabel(words.join(' '));
}

function deriveTopicBaseLabel(topicTitle: string): string {
  const stripped = topicTitle
    .replace(/^(understanding|analysing|analyzing|working with|using)\s+/i, '')
    .replace(/^(types?|forms?|kinds?|categories?) of /i, '')
    .replace(/^(causes?|effects?|impact|consequences?) of /i, '')
    .replace(/^(difference between|compare|contrast) /i, '')
    .trim();

  return toTopicLabel(stripped.length > 0 ? stripped : topicTitle);
}

function deriveCandidateSubtopicLabels(context: FallbackConceptContext, max = 3): string[] {
  const description = sanitizeTopicDescription(context.topicDescription, context.topicTitle);
  if (!description) {
    return [];
  }

  const matches = Array.from(
    description.matchAll(/(?:such as|including|include|focus on|compare|for example|like)\s+([^.;]+)/gi)
  );
  const source = matches.map((match) => match[1]).filter((value): value is string => Boolean(value));
  const fallbackSource = source.length > 0 ? source : [description];

  const candidates = fallbackSource
    .flatMap((value) => value.split(/,| and | or /i))
    .map((value) => cleanDerivedLabel(value))
    .filter((value): value is string => Boolean(value));

  return [...new Set(candidates)].slice(0, max);
}

function buildTopicLabelSeries(
  shape: LessonTopicShape,
  context: FallbackConceptContext,
  defaults: [string, string, string]
): [string, string, string] {
  const derived = deriveCandidateSubtopicLabels(context, 3);
  const seeded = deriveFallbackSeedLabels(shape, context);
  const labels = [...new Set([...seeded, ...derived])].slice(0, 3);

  if (labels.length >= 3) {
    return [labels[0]!, labels[1]!, labels[2]!];
  }

  if (labels.length === 2) {
    return [labels[0]!, labels[1]!, defaults[2]];
  }

  if (labels.length === 1) {
    return [labels[0]!, defaults[1], defaults[2]];
  }

  return defaults;
}

function buildOpeningExample(
  context: FallbackConceptContext,
  conceptName: string,
  fallbackExample: string
): string {
  return resolveConceptExample(context, conceptName, fallbackExample);
}

export function classifyLessonTopicShape(subjectName: string, topicTitle: string): LessonTopicShape {
  const subject = subjectName.toLowerCase();
  const topic = topicTitle.toLowerCase();

  if (/(causes? of|effects? of|impact of|consequences? of)/.test(topic)) {
    return 'cause_and_effect';
  }

  if (/(types? of|forms? of|kinds? of|categories? of|market structures?)/.test(topic)) {
    return 'classification_or_categories';
  }

  if (/(difference between|compare|contrast|versus|\bvs\b|debit and credit)/.test(topic)) {
    return 'comparison_or_distinction';
  }

  if (/(osmosis|photosynthesis|respiration|diffusion|process|cycle|mechanism)/.test(topic)) {
    return 'process_or_mechanism';
  }

  if (
    /(techniques?|devices?|features?|elements?)/.test(topic) ||
    ((subject.includes('english') || subject.includes('language')) &&
      /(poetry|prose|literary|rhetorical)/.test(topic))
  ) {
    return 'technique_or_feature';
  }

  return 'principle_or_rule';
}

function buildGenericShapeConceptItems(
  shape: LessonTopicShape,
  context: FallbackConceptContext
): ConceptItem[] {
  const compactTopic = context.topicTitle.toLowerCase();
  const base = deriveTopicBaseLabel(context.topicTitle);

  switch (shape) {
    case 'comparison_or_distinction': {
      const parts = context.topicTitle.split(/\band\b|vs\.?|versus/i).map((part) => part.trim()).filter(Boolean);
      const first = parts[0] ?? 'First idea';
      const second = parts[1] ?? 'Second idea';

      return [
        createConceptItem({
          name: first,
          simpleDefinition: `${first} is one side of the contrast inside ${context.topicTitle}.`,
          example: `${first} appears when the example focuses on ${first.toLowerCase()} rather than ${second.toLowerCase()}.`,
          explanation: `This example shows what is distinctive about ${first.toLowerCase()} in the comparison.`,
          quickCheck: `What makes ${first} different from ${second}?`,
          conceptType: 'comparison',
          curriculumAlignment: buildConceptAlignment(
            context.topicTitle,
            context.grade,
            `${context.topicTitle} is taught by separating the two ideas clearly before comparing them together.`
          )
        }),
        createConceptItem({
          name: second,
          simpleDefinition: `${second} is the other side of the contrast inside ${context.topicTitle}.`,
          example: `${second} appears when the example focuses on ${second.toLowerCase()} rather than ${first.toLowerCase()}.`,
          explanation: `This example shows what is distinctive about ${second.toLowerCase()} in the comparison.`,
          quickCheck: `How is ${second} different from ${first}?`,
          conceptType: 'comparison',
          curriculumAlignment: buildConceptAlignment(
            context.topicTitle,
            context.grade,
            `${context.topicTitle} requires learners to distinguish the second idea just as clearly as the first.`
          )
        }),
        createConceptItem({
          name: `${first} and ${second} together`,
          simpleDefinition: `${context.topicTitle} makes sense when both sides are read together instead of in isolation.`,
          example: `${context.topicDescription || `${first} and ${second} are interpreted by comparing their roles in the same example.`}`,
          explanation: 'Placing the two ideas side by side shows the real difference the topic is asking about.',
          quickCheck: `What changes when you compare ${first} and ${second} directly?`,
          conceptType: 'comparison',
          curriculumAlignment: buildConceptAlignment(
            context.topicTitle,
            context.grade,
            `The final step in ${context.topicTitle} is explaining the relationship between the two contrasted ideas.`
          )
        })
      ];
    }
    case 'cause_and_effect': {
      const [backgroundLabel, triggerLabel, impactLabel] = buildTopicLabelSeries(shape, context, [
        'Long-term causes',
        'Immediate trigger',
        'Consequences'
      ]);
      const openingExample = buildOpeningExample(
        context,
        backgroundLabel,
        `${context.topicTitle} includes background conditions that made conflict more likely.`
      );

      return [
        createConceptItem({
          name: backgroundLabel,
          simpleDefinition: `${context.topicTitle} develops from conditions that build tension over time.`,
          example: openingExample,
          explanation: 'The example shows the underlying pressure that existed before any immediate trigger.',
          quickCheck: `What long-term pressure is visible in this ${compactTopic} example?`,
          conceptType: 'cause',
          curriculumAlignment: buildConceptAlignment(
            context.topicTitle,
            context.grade,
            `${context.topicTitle} should be explained through underlying causes as well as immediate events.`
          )
        }),
        createConceptItem({
          name: triggerLabel,
          simpleDefinition: `${context.topicTitle} also includes a trigger that turns pressure into action.`,
          example: `A specific event pushes the situation in ${context.topicTitle} from tension into response.`,
          explanation: 'The trigger matters because it explains why events moved when they did.',
          quickCheck: `Which event acts as the trigger in this ${compactTopic} example?`,
          conceptType: 'cause',
          curriculumAlignment: buildConceptAlignment(
            context.topicTitle,
            context.grade,
            `${context.topicTitle} is clearer when learners separate the trigger from the long-term causes.`
          )
        }),
        createConceptItem({
          name: impactLabel,
          simpleDefinition: `${context.topicTitle} is fully understood when the causes are linked to their impact.`,
          example: `Once the trigger happens, the consequences spread through the wider situation.`,
          explanation: 'This shows how the causes matter because they change what happens next.',
          quickCheck: `What impact follows from the causes in this ${compactTopic} example?`,
          conceptType: 'effect',
          curriculumAlignment: buildConceptAlignment(
            context.topicTitle,
            context.grade,
            `${context.topicTitle} should connect causes to consequences rather than leaving them as isolated facts.`
          )
        })
      ];
    }
    case 'classification_or_categories': {
      const [firstLabel, secondLabel, thirdLabel] = buildTopicLabelSeries(shape, context, [
        `${base} Type 1`,
        `${base} Type 2`,
        `${base} Type 3`
      ]);
      const firstSeed = deriveConceptTeachingSeed(context, firstLabel);
      const secondSeed = deriveConceptTeachingSeed(context, secondLabel);
      const thirdSeed = deriveConceptTeachingSeed(context, thirdLabel);
      const openingExample = buildOpeningExample(
        context,
        firstLabel,
        firstSeed?.example ?? `${context.topicTitle} can be grouped by the features each type shares.`
      );

      return [
        createConceptItem({
          name: firstLabel,
          simpleDefinition: firstSeed?.simpleDefinition ?? `${firstLabel} is one recognisable kind inside ${context.topicTitle}.`,
          example: openingExample,
          explanation: firstSeed?.explanation ?? `This example shows the features that place an item in ${firstLabel.toLowerCase()}.`,
          quickCheck: firstSeed?.quickCheck ?? `Which feature places this example in ${firstLabel}?`,
          conceptType: 'classification',
          curriculumAlignment: buildConceptAlignment(
            context.topicTitle,
            context.grade,
            `${context.topicTitle} is taught by separating examples into recognisable topic-shaped categories.`
          )
        }),
        createConceptItem({
          name: secondLabel,
          simpleDefinition: secondSeed?.simpleDefinition ?? `${secondLabel} is recognised by a different defining pattern inside ${context.topicTitle}.`,
          example: resolveConceptExample(
            context,
            secondLabel,
            secondSeed?.example ?? `Another example fits ${secondLabel} because its features differ from ${firstLabel.toLowerCase()}.`
          ),
          explanation: secondSeed?.explanation ?? 'The contrast between categories helps the learner classify accurately.',
          quickCheck: secondSeed?.quickCheck ?? `How does ${secondLabel} differ from ${firstLabel}?`,
          conceptType: 'classification',
          curriculumAlignment: buildConceptAlignment(
            context.topicTitle,
            context.grade,
            `${context.topicTitle} needs contrasting topic-shaped categories so learners can sort examples accurately.`
          )
        }),
        createConceptItem({
          name: thirdLabel,
          simpleDefinition: thirdSeed?.simpleDefinition ?? `${thirdLabel} helps the learner confirm which kind of ${base.toLowerCase()} they are looking at.`,
          example: resolveConceptExample(
            context,
            thirdLabel,
            thirdSeed?.example ?? `Look at the example and match its features to the correct category.`
          ),
          explanation: thirdSeed?.explanation ?? 'The feature check prevents guessing and keeps the classification tied to evidence in the example.',
          quickCheck: thirdSeed?.quickCheck ?? `Which category does this example belong to, and why?`,
          conceptType: 'classification',
          curriculumAlignment: buildConceptAlignment(
            context.topicTitle,
            context.grade,
            `${context.topicTitle} should end with a clear category test so the learner can classify new examples.`
          )
        })
      ];
    }
    case 'process_or_mechanism': {
      const [setupLabel, movementLabel, resultLabel] = buildTopicLabelSeries(shape, context, [
        'Starting conditions',
        'What changes',
        'Observed result'
      ]);
      const openingExample = buildOpeningExample(
        context,
        setupLabel,
        `${context.topicTitle} starts because the initial conditions make the process possible.`
      );

      return [
        createConceptItem({
          name: setupLabel,
          simpleDefinition: `${context.topicTitle} begins when the right starting condition is present.`,
          example: openingExample,
          explanation: 'The starting condition explains why the process can begin at all.',
          quickCheck: `What starting condition allows ${compactTopic} to begin?`,
          conceptType: 'process',
          curriculumAlignment: buildConceptAlignment(
            context.topicTitle,
            context.grade,
            `${context.topicTitle} should begin with the condition that starts the process.`
          )
        }),
        createConceptItem({
          name: movementLabel,
          simpleDefinition: `${context.topicTitle} involves a specific movement, transfer, or change.`,
          example: `The example shows what is moving or changing during ${compactTopic}.`,
          explanation: 'This is the central action that defines how the process works.',
          quickCheck: `What is moving or changing in this ${compactTopic} example?`,
          conceptType: 'process',
          curriculumAlignment: buildConceptAlignment(
            context.topicTitle,
            context.grade,
            `${context.topicTitle} needs a clear account of the movement or change at its centre.`
          )
        }),
        createConceptItem({
          name: resultLabel,
          simpleDefinition: `${context.topicTitle} produces a result you can observe or explain.`,
          example: `The end of the example shows the result of the process.`,
          explanation: 'The visible result helps the learner connect the mechanism to what happens next.',
          quickCheck: `What result does ${compactTopic} produce in this example?`,
          conceptType: 'process',
          curriculumAlignment: buildConceptAlignment(
            context.topicTitle,
            context.grade,
            `${context.topicTitle} should end with the result so the mechanism is tied to an outcome.`
          )
        })
      ];
    }
    case 'technique_or_feature': {
      const [exampleLabel, effectLabel, readingLabel] = buildTopicLabelSeries(shape, context, [
        base,
        'Effect in context',
        'Text detail'
      ]);
      const exampleSeed = deriveConceptTeachingSeed(context, exampleLabel);
      const effectSeed = deriveConceptTeachingSeed(context, effectLabel);
      const readingSeed = deriveConceptTeachingSeed(context, readingLabel);
      const openingExample = buildOpeningExample(
        context,
        exampleLabel,
        exampleSeed?.example ?? `A short extract or sentence shows ${compactTopic} at work.`
      );

      return [
        createConceptItem({
          name: exampleLabel,
          simpleDefinition: exampleSeed?.simpleDefinition ?? `${context.topicTitle} is recognised by the pattern it creates inside a real example.`,
          example: openingExample,
          explanation: exampleSeed?.explanation ?? 'The example matters because it shows how the feature appears in context rather than in isolation.',
          quickCheck: exampleSeed?.quickCheck ?? `What feature stands out in this ${compactTopic} example?`,
          conceptType: 'feature',
          curriculumAlignment: buildConceptAlignment(
            context.topicTitle,
            context.grade,
            `${context.topicTitle} should start from a real example so the feature is grounded in context.`
          )
        }),
        createConceptItem({
          name: effectLabel,
          simpleDefinition: effectSeed?.simpleDefinition ?? `${context.topicTitle} matters because it changes meaning, tone, or response in the example.`,
          example: resolveConceptExample(
            context,
            effectLabel,
            effectSeed?.example ?? `The same feature shifts how the line, passage, or case is understood.`
          ),
          explanation: effectSeed?.explanation ?? 'The explanation focuses on what the feature does, not just what it is called.',
          quickCheck: effectSeed?.quickCheck ?? `What effect does ${compactTopic} create here?`,
          conceptType: 'effect',
          curriculumAlignment: buildConceptAlignment(
            context.topicTitle,
            context.grade,
            `${context.topicTitle} needs an effect explanation so learners do more than just name the feature.`
          )
        }),
        createConceptItem({
          name: readingLabel,
          simpleDefinition: readingSeed?.simpleDefinition ?? `${context.topicTitle} is strongest when the learner connects the feature to the exact wording or detail in front of them.`,
          example: resolveConceptExample(
            context,
            readingLabel,
            readingSeed?.example ?? `A short detail in the example gives the clue that supports the interpretation.`
          ),
          explanation: readingSeed?.explanation ?? 'This keeps the reading anchored to the actual example instead of drifting into general talk.',
          quickCheck: readingSeed?.quickCheck ?? `Which word or detail supports your reading of ${compactTopic}?`,
          conceptType: 'analysis',
          curriculumAlignment: buildConceptAlignment(
            context.topicTitle,
            context.grade,
            `${context.topicTitle} should end with a focused reading question tied to a specific detail.`
          )
        })
      ];
    }
    case 'principle_or_rule':
    default: {
      const [coreLabel, exampleLabel, checkLabel] = buildTopicLabelSeries(shape, context, [
        base,
        'Real-world case',
        'Reflection check'
      ]);
      const coreSeed = deriveConceptTeachingSeed(context, coreLabel);
      const exampleSeed = deriveConceptTeachingSeed(context, exampleLabel);
      const checkSeed = deriveConceptTeachingSeed(context, checkLabel);
      const openingExample = buildOpeningExample(
        context,
        coreLabel,
        coreSeed?.example ?? `${context.topicTitle} appears in a worked example from ${context.subjectName}.`
      );

      return [
        createConceptItem({
          name: coreLabel,
          simpleDefinition: coreSeed?.simpleDefinition ?? `${coreLabel} is the main idea that stays true across examples in ${context.topicTitle}.`,
          example: openingExample,
          explanation: coreSeed?.explanation ?? 'The example shows what stays true when the topic is applied correctly.',
          quickCheck: coreSeed?.quickCheck ?? `What stays the same in this ${compactTopic} example?`,
          conceptType: 'principle',
          curriculumAlignment: buildConceptAlignment(
            context.topicTitle,
            context.grade,
            `${context.topicTitle} should begin with the topic-shaped core idea before the learner tries to use it.`
          )
        }),
        createConceptItem({
          name: exampleLabel,
          simpleDefinition: exampleSeed?.simpleDefinition ?? `${exampleLabel} shows how ${context.topicTitle} works in a concrete case.`,
          example: resolveConceptExample(
            context,
            exampleLabel,
            exampleSeed?.example ?? `A worked example shows how the idea operates step by step in ${compactTopic}.`
          ),
          explanation: exampleSeed?.explanation ?? 'The worked example turns the principle into something the learner can use accurately.',
          quickCheck: exampleSeed?.quickCheck ?? `How is the central idea used in this ${compactTopic} example?`,
          conceptType: 'application',
          curriculumAlignment: buildConceptAlignment(
            context.topicTitle,
            context.grade,
            `${context.topicTitle} should connect the principle to one concrete worked example.`
          )
        }),
        createConceptItem({
          name: checkLabel,
          simpleDefinition: checkSeed?.simpleDefinition ?? `${checkLabel} confirms that the result still fits the main idea in ${context.topicTitle}.`,
          example: resolveConceptExample(
            context,
            checkLabel,
            checkSeed?.example ?? `A final check compares the answer or interpretation back to the worked example.`
          ),
          explanation: checkSeed?.explanation ?? 'The check prevents the learner from giving an answer that looks finished but does not actually hold up.',
          quickCheck: checkSeed?.quickCheck ?? `What would you check to confirm the result in this ${compactTopic} example?`,
          conceptType: 'verification',
          curriculumAlignment: buildConceptAlignment(
            context.topicTitle,
            context.grade,
            `${context.topicTitle} should end with a check that ties the answer back to the central idea.`
          )
        })
      ];
    }
  }
}

function buildDynamicConceptItems(
  topicTitle: string,
  topicDescription: string,
  subjectName: string,
  grade: string
): ConceptItem[] {
  const context: FallbackConceptContext = {
    topicTitle,
    topicDescription,
    subjectName,
    grade
  };

  return buildGenericShapeConceptItems(classifyLessonTopicShape(subjectName, topicTitle), context);
}

export function buildDynamicQuestionsForLesson(lesson: Lesson, subjectName: string, topicTitle: string): Question[] {
  const lens = getSubjectLens(subjectName, lesson.grade);
  const options = buildCheckQuestionOptions(lens);

  return [
    {
      id: lesson.practiceQuestionIds[0],
      lessonId: lesson.id,
      type: 'multiple-choice',
      prompt: `Which response shows the best first move when you answer a question on **${topicTitle}**?`,
      expectedAnswer: options[0]!.label,
      acceptedAnswers: [options[0]!.label, options[0]!.text],
      rubric: `The strongest answer starts by naming the ${lens.conceptWord} or rule and then grounds the response in the information already given in the question. It should not rely on a random practical example, a guessed final answer, or repeating the topic name.`,
      explanation: `A good first move is concrete: identify the rule or ${lens.conceptWord} you are using, then point to the clue or evidence that makes it fit.`,
      hintLevels: [
        `Look for the option that starts with the rule, method, or ${lens.conceptWord}.`,
        `Avoid options that jump to a practical example, a final answer, or the topic name on its own.`
      ],
      misconceptionTags: [slugify(topicTitle), slugify(subjectName)],
      difficulty: 'foundation',
      topicId: lesson.topicId,
      subtopicId: lesson.subtopicId,
      options
    },
    {
      id: lesson.masteryQuestionIds[0],
      lessonId: lesson.id,
      type: 'step-by-step',
      prompt: [
        `Use this task for **${topicTitle}** in ${subjectName}:`,
        ``,
        lesson.practicePrompt.body,
        ``,
        `Now write:`,
        `1. the ${lens.conceptWord} or rule you would use,`,
        `2. the clue, value, quote, or piece of evidence you would use,`,
        `3. the first step you would take.`
      ].join('\n'),
      expectedAnswer: `name the ${slugify(lens.conceptWord)} and show the first step for ${slugify(topicTitle)}`,
      acceptedAnswers: [],
      rubric: `A strong answer completes all three parts in order: it names the correct ${lens.conceptWord} or rule, points to relevant evidence from the task, and shows the first step clearly. It should not skip straight to a final answer or drift into an unrelated practical example.`,
      explanation: `A real response to ${topicTitle} starts with the method and the evidence from the given task. Once those are clear, the first step becomes checkable instead of guessed.`,
      hintLevels: [
        `Start by naming the ${lens.conceptWord} or rule before you do anything else.`,
        `Use the task above and show the first step, not the whole final answer.`
      ],
      misconceptionTags: [slugify(`${topicTitle}-application`)],
      difficulty: 'core',
      topicId: lesson.topicId,
      subtopicId: lesson.subtopicId
    }
  ];
}

const DEFAULT_V2_GROUPED_LABELS = ['orientation', 'concepts', 'practice', 'check', 'complete'] as const;

function firstSentence(value: string | undefined): string {
  const trimmed = value?.trim() ?? '';

  if (!trimmed) {
    return '';
  }

  return trimmed.split(/(?<=[.!?])\s+/)[0] ?? trimmed;
}

function firstQuestionClause(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim() ?? '';

  if (!trimmed) {
    return fallback;
  }

  return trimmed.split(/[?,.]/)[0]?.trim() || fallback;
}

function buildLoopTeaching(concept: ConceptItem, lens: ReturnType<typeof getSubjectLens>): string {
  const definition = concept.simpleDefinition ?? concept.oneLineDefinition ?? concept.summary;
  const explanation = concept.explanation ?? concept.detail;
  const whyItMatters = concept.whyItMatters ?? `${concept.name} matters because it helps you apply the idea accurately instead of guessing.`;

  return [
    `**${concept.name}**`,
    '',
    whyItMatters,
    '',
    definition,
    '',
    explanation,
    '',
    `Watch out for: ${lens.misconception}`,
    '',
    `Notice this: connect the definition to the ${lens.evidenceWord} before you move on.`
  ].join('\n');
}

function buildLoopExample(concept: ConceptItem): string {
  const application = firstSentence(concept.explanation ?? concept.detail) || concept.detail;
  const checkTarget = firstQuestionClause(concept.quickCheck, `the rule for ${concept.name}`);

  return [
    `**Worked example - ${concept.name}**`,
    '',
    `**Step 1 - Identify:** ${concept.name} appears here: ${concept.example}`,
    '',
    `**Step 2 - Apply:** ${application}`,
    '',
    `**Step 3 - Check:** Does this match ${checkTarget}?`
  ].join('\n');
}

function buildLoopLearnerTask(concept: ConceptItem, subjectName: string, grade: string): string {
  const lens = getSubjectLens(subjectName, grade);

  return [
    `**Your turn - ${concept.name}**`,
    '',
    `The example above showed ${concept.name} in action. Now apply the same approach:`,
    '',
    `1. Name the ${lens.conceptWord} you are using: ...`,
    `2. Point to the ${lens.evidenceWord} that makes it fit: ...`,
    `3. Write the first step: ...`,
    '',
    `Keep your answer tied to the information already given. Do not introduce a new external example.`
  ].join('\n');
}

function buildLoopRetrievalCheck(concept: ConceptItem): string {
  const quickCheck = concept.quickCheck?.trim();

  if (quickCheck?.endsWith('?')) {
    return [`**Check - ${concept.name}**`, '', quickCheck].join('\n');
  }

  return [
    `**Check - ${concept.name}**`,
    '',
    `In one sentence, state the rule for ${concept.name}. Then name the one clue or step from the example above that shows you have applied it correctly.`
  ].join('\n');
}

export function buildDynamicLessonFlowV2FromTopic(input: {
  subjectId: string;
  subjectName: string;
  grade: string;
  topicTitle: string;
  topicDescription: string;
  curriculumReference: string;
}): Lesson {
  const base = buildDynamicLessonFromTopic(input);
  const conceptItems = base.keyConcepts ?? [];
  const startSection =
    conceptItems.length > 0
      ? buildOpeningStartSectionFromConcept(conceptItems[0]!)
      : {
          title: 'Start',
          body: base.orientation.body
        };
  const loops: LessonFlowV2Loop[] = conceptItems.slice(0, 4).map((concept, index) => ({
    id: `${base.id}-loop-${index + 1}`,
    title: concept.name,
    teaching: {
      title: `Teach ${concept.name}`,
      body: buildLoopTeaching(concept, getSubjectLens(input.subjectName, input.grade))
    },
    example: {
      title: `Example ${index + 1}`,
      body: buildLoopExample(concept)
    },
    learnerTask: {
      title: `Try ${concept.name}`,
      body: buildLoopLearnerTask(concept, input.subjectName, input.grade)
    },
    retrievalCheck: {
      title: `Check ${concept.name}`,
      body: buildLoopRetrievalCheck(concept)
    },
    mustHitConcepts: [concept.name],
    criticalMisconceptionTags: [slugify(concept.name), slugify(input.topicTitle)]
  }));

  return {
    ...base,
    lessonFlowVersion: 'v2',
    flowV2: {
      groupedLabels: [...DEFAULT_V2_GROUPED_LABELS],
      start: startSection,
      concepts: conceptItems,
      loops,
      synthesis: {
        title: 'Synthesis',
        body: base.summary.body
      },
      independentAttempt: {
        title: 'Independent Attempt',
        body: base.transferChallenge.body
      },
      exitCheck: {
        title: 'Exit Check',
        body: [
          `Final check for **${input.topicTitle}**:`,
          '',
          `Explain the main rule, apply it to one fresh example, and name the misconception you must avoid.`
        ].join('\n')
      }
    }
  };
}
