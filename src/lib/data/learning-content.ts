import type {
  CurriculumDefinition,
  Lesson,
  LessonSection,
  Question,
  QuestionOption,
  QuestionType,
  Subject,
  Topic
} from '$lib/types';

interface QuestionBlueprint {
  type: QuestionType;
  prompt: string;
  expectedAnswer: string;
  acceptedAnswers?: string[];
  explanation: string;
  hintLevels: string[];
  difficulty: 'foundation' | 'core' | 'stretch';
  options?: QuestionOption[];
}

interface LessonBlueprint {
  title: string;
  topicName: string;
  subtopicName: string;
  overview: LessonSection;
  deeperExplanation: LessonSection;
  detailedSteps?: LessonSection;
  example: LessonSection;
  questions: QuestionBlueprint[];
}

interface LearningProgram {
  curriculum: CurriculumDefinition;
  lessons: Lesson[];
  questions: Question[];
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export type GradeBand = 'foundation' | 'intermediate' | 'senior';

export function getGradeBand(grade: string): GradeBand {
  const match = grade.match(/\d+/);
  const num = match ? parseInt(match[0], 10) : 8;
  if (num <= 6) return 'foundation';
  if (num <= 9) return 'intermediate';
  return 'senior';
}

function createQuestion(
  lessonId: string,
  topicId: string,
  subtopicId: string,
  index: number,
  blueprint: QuestionBlueprint
): Question {
  return {
    id: `${lessonId}-q-${index + 1}`,
    lessonId,
    type: blueprint.type,
    prompt: blueprint.prompt,
    expectedAnswer: blueprint.expectedAnswer,
    acceptedAnswers: blueprint.acceptedAnswers,
    rubric: blueprint.explanation,
    explanation: blueprint.explanation,
    hintLevels: blueprint.hintLevels,
    misconceptionTags: [slugify(blueprint.prompt).slice(0, 32)],
    difficulty: blueprint.difficulty,
    topicId,
    subtopicId,
    options: blueprint.options
  };
}

function createMathBlueprints(subjectName: string, band: GradeBand): LessonBlueprint[] {
  if (band === 'foundation') {
    return [
      {
        title: `${subjectName}: Number Patterns`,
        topicName: 'Patterns and relationships',
        subtopicName: 'Extending number sequences',
        overview: {
          title: 'Overview',
          body: 'Number patterns help you predict what comes next by noticing a repeated rule. In this lesson you learn to identify the rule and use it to extend a sequence of whole numbers.'
        },
        deeperExplanation: {
          title: 'Key Concepts',
          body: 'A number pattern can increase, decrease, or repeat. The difference between consecutive terms is called the **common difference**. Stating the rule first is more important than just writing the next number. For example, "add 4 each time" is the rule — the next term follows from applying it.'
        },
        detailedSteps: {
          title: 'Step-by-Step',
          body: '**Step 1.** Write out the sequence and calculate the gap between each pair of consecutive terms.\n\n**Step 2.** Check that the gap is the same between all pairs — if it is, you have an arithmetic sequence.\n\n**Step 3.** Name the rule in plain words: "add ___ each time" or "subtract ___ each time".\n\n**Step 4.** Apply the rule to find the next term: take the last number and add or subtract the common difference.\n\n**Step 5.** Check by applying the rule backwards — does it produce the terms you started with?'
        },
        example: {
          title: 'Worked Example',
          body: '**Sequence:** 4, 8, 12, 16, ?\n\n**Step 1.** Gaps: 8−4=4, 12−8=4, 16−12=4. The gap is always 4.\n\n**Step 2.** Consistent gap — arithmetic sequence.\n\n**Step 3.** Rule: **add 4 each time**.\n\n**Step 4.** Next term: 16 + 4 = **20**.\n\n**Step 5.** Check backwards: 20−4=16 ✓, 16−4=12 ✓'
        },
        questions: [
          {
            type: 'multiple-choice',
            prompt: 'What is the next number in 5, 10, 15, 20?',
            expectedAnswer: '25',
            explanation: 'The pattern increases by 5 each time. 20 + 5 = 25.',
            hintLevels: ['Look at the gap between each pair of numbers.', 'Add 5 to 20.'],
            difficulty: 'foundation',
            options: [
              { id: 'a', label: 'A', text: '22' },
              { id: 'b', label: 'B', text: '25' },
              { id: 'c', label: 'C', text: '30' }
            ]
          },
          {
            type: 'short-answer',
            prompt: 'Write the rule for the sequence 3, 6, 9, 12 in your own words.',
            expectedAnswer: 'add 3',
            acceptedAnswers: ['add three', '+3', 'increases by 3', 'multiply by 3 — no wait, add 3'],
            explanation: 'Each term is 3 more than the previous one. The rule is "add 3 each time".',
            hintLevels: ['Calculate 6 minus 3. What do you get?', 'The rule is "add ___ each time".'],
            difficulty: 'core'
          }
        ]
      },
      {
        title: `${subjectName}: Introduction to Fractions`,
        topicName: 'Numbers: fractions',
        subtopicName: 'Numerator, denominator, and equal parts',
        overview: {
          title: 'Overview',
          body: 'A fraction names part of a whole. The bottom number tells you how many equal parts the whole is divided into, and the top number tells you how many of those parts you are talking about.'
        },
        deeperExplanation: {
          title: 'Key Concepts',
          body: 'A fraction has two parts: the **numerator** (top) and the **denominator** (bottom). The denominator tells you the total number of equal parts. The numerator tells you how many parts are selected. For example, ¾ means 3 out of 4 equal parts. Fractions only make sense when the parts are equal in size.'
        },
        detailedSteps: {
          title: 'Step-by-Step',
          body: '**Step 1.** Identify how many equal parts the whole is divided into — this is the **denominator**.\n\n**Step 2.** Count how many of those parts are selected or shaded — this is the **numerator**.\n\n**Step 3.** Write the fraction as numerator ÷ denominator: numerator/denominator.\n\n**Step 4.** Check: are all the parts equal in size? If not, it is not a valid fraction.\n\n**Step 5.** Read the fraction aloud: "3 out of 4 equal parts" = three quarters = ¾.'
        },
        example: {
          title: 'Worked Example',
          body: '**Shape:** A circle cut into 8 equal pieces. 3 pieces are shaded.\n\n**Step 1.** Total equal parts = **8** → denominator is 8.\n\n**Step 2.** Shaded parts = **3** → numerator is 3.\n\n**Step 3.** Fraction = **3/8** (three eighths).\n\n**Step 4.** All 8 pieces are equal in size ✓.\n\n**Step 5.** Read: "3 out of 8 equal parts are shaded."'
        },
        questions: [
          {
            type: 'multiple-choice',
            prompt: 'In the fraction 5/8, what does the 8 tell you?',
            expectedAnswer: 'the total number of equal parts',
            explanation: 'The denominator (bottom number) tells you how many equal parts the whole is divided into.',
            hintLevels: ['The bottom number is called the denominator.', 'It tells you how many parts the whole is split into.'],
            difficulty: 'foundation',
            options: [
              { id: 'a', label: 'A', text: 'the number of shaded parts' },
              { id: 'b', label: 'B', text: 'the total number of equal parts' },
              { id: 'c', label: 'C', text: 'the size of each part' }
            ]
          },
          {
            type: 'short-answer',
            prompt: 'A pizza is cut into 6 equal slices. You eat 2 slices. Write this as a fraction.',
            expectedAnswer: '2/6',
            acceptedAnswers: ['2 over 6', '2 out of 6', '1/3'],
            explanation: '2 slices out of 6 equal slices = 2/6 (which also simplifies to 1/3).',
            hintLevels: ['How many slices did you eat? That is the numerator.', 'How many slices were there in total? That is the denominator.'],
            difficulty: 'core'
          }
        ]
      }
    ];
  }

  if (band === 'intermediate') {
    return [
      {
        title: `${subjectName}: Solving Linear Equations`,
        topicName: 'Algebra: equations',
        subtopicName: 'Balancing and isolating the variable',
        overview: {
          title: 'Overview',
          body: 'A linear equation stays true when you perform the same operation on both sides. In this lesson you learn to isolate the variable using inverse operations and verify your solution.'
        },
        deeperExplanation: {
          title: 'Key Concepts',
          body: 'An equation is a **balance** — whatever you do to one side you must do to the other. The goal is to get the variable alone on one side. Use **inverse operations** to undo what is being done to the variable: addition undoes subtraction, multiplication undoes division. Always check your answer by substituting it back into the original equation.'
        },
        detailedSteps: {
          title: 'Step-by-Step',
          body: '**Step 1.** Identify the variable and all the operations applied to it.\n\n**Step 2.** Decide which inverse operation will undo each one, working outward from the variable.\n\n**Step 3.** Apply the inverse operation to **both sides** simultaneously.\n\n**Step 4.** Simplify both sides until the variable is isolated.\n\n**Step 5.** State the solution: variable = value.\n\n**Step 6.** Substitute your answer back into the original equation and confirm both sides are equal.'
        },
        example: {
          title: 'Worked Example',
          body: '**Equation:** 3x + 5 = 20\n\n**Step 1.** Variable: x. Operations on x: multiply by 3, then add 5.\n\n**Step 2.** Undo in reverse order: first subtract 5, then divide by 3.\n\n**Step 3–4.** Subtract 5 from both sides: 3x + 5 − 5 = 20 − 5 → 3x = 15.\n\n**Step 3–4.** Divide both sides by 3: 3x ÷ 3 = 15 ÷ 3 → **x = 5**.\n\n**Step 6.** Check: 3(5) + 5 = 15 + 5 = 20 ✓'
        },
        questions: [
          {
            type: 'numeric',
            prompt: 'Solve for x: x + 9 = 16',
            expectedAnswer: '7',
            explanation: 'Subtract 9 from both sides: x = 16 − 9 = 7.',
            hintLevels: ['What operation is applied to x?', 'Subtract 9 from both sides.'],
            difficulty: 'foundation'
          },
          {
            type: 'step-by-step',
            prompt: 'Solve 2x − 3 = 11. Show every step and check your answer.',
            expectedAnswer: '7',
            explanation: 'Add 3 to both sides: 2x = 14. Divide by 2: x = 7. Check: 2(7)−3 = 11 ✓.',
            hintLevels: ['Undo the subtraction first, then undo the multiplication.', 'Add 3 to both sides, then divide both sides by 2.'],
            difficulty: 'core'
          }
        ]
      },
      {
        title: `${subjectName}: Angles and Triangles`,
        topicName: 'Geometry: angles',
        subtopicName: 'Angle relationships and triangle properties',
        overview: {
          title: 'Overview',
          body: 'Angles describe the amount of turn between two lines. In this lesson you learn to classify angles, use the angle relationships in triangles, and calculate unknown angles using those properties.'
        },
        deeperExplanation: {
          title: 'Key Concepts',
          body: 'Angles are measured in degrees (°). Key relationships: **angles on a straight line sum to 180°**; **angles around a point sum to 360°**; **vertically opposite angles are equal**. In any triangle, the **interior angles sum to 180°**. An equilateral triangle has all three angles equal to 60°. An isosceles triangle has two equal angles opposite its equal sides.'
        },
        detailedSteps: {
          title: 'Step-by-Step',
          body: '**Step 1.** Identify the angle relationship being used (straight line, triangle, vertically opposite, etc.).\n\n**Step 2.** Write down the relevant rule as an equation (e.g. a + b + c = 180° for a triangle).\n\n**Step 3.** Substitute the known angle values into the equation.\n\n**Step 4.** Solve the equation to find the unknown angle.\n\n**Step 5.** State the answer with the degree symbol (°) and name the reason you used.'
        },
        example: {
          title: 'Worked Example',
          body: '**Problem:** In a triangle, two angles are 55° and 70°. Find the third angle.\n\n**Step 1.** Relationship: angles in a triangle sum to 180°.\n\n**Step 2.** Equation: 55 + 70 + x = 180.\n\n**Step 3.** 125 + x = 180.\n\n**Step 4.** x = 180 − 125 = **55°**.\n\n**Step 5.** Third angle = 55° (angles in a triangle sum to 180°).'
        },
        questions: [
          {
            type: 'numeric',
            prompt: 'Two angles in a triangle are 40° and 95°. What is the third angle?',
            expectedAnswer: '45',
            explanation: '40 + 95 + x = 180. So x = 180 − 135 = 45°.',
            hintLevels: ['Angles in a triangle add up to 180°.', '40 + 95 = 135. Subtract from 180.'],
            difficulty: 'foundation'
          },
          {
            type: 'short-answer',
            prompt: 'Two angles are on a straight line. One is 63°. What is the other?',
            expectedAnswer: '117',
            acceptedAnswers: ['117°', '117 degrees'],
            explanation: 'Angles on a straight line sum to 180°. 180 − 63 = 117°.',
            hintLevels: ['Angles on a straight line sum to 180°.', '180 − 63 = ?'],
            difficulty: 'core'
          }
        ]
      }
    ];
  }

  // senior (Grade 10-12)
  return [
    {
      title: `${subjectName}: Functions and Graphs`,
      topicName: 'Functions: domain, range, and graphs',
      subtopicName: 'Plotting and interpreting functions',
      overview: {
        title: 'Overview',
        body: 'A function assigns exactly one output to each input. In this lesson you learn to define functions using domain and range, interpret function notation, and sketch the graphs of linear and quadratic functions.'
      },
      deeperExplanation: {
        title: 'Key Concepts',
        body: 'A **function** maps each value in the **domain** (set of inputs) to exactly one value in the **range** (set of outputs). Notation: f(x) means "the output of function f for input x". A **linear function** f(x) = mx + c produces a straight-line graph with gradient m and y-intercept c. A **quadratic function** f(x) = ax² + bx + c produces a parabola that opens upward (a > 0) or downward (a < 0). The **x-intercepts** are found by setting f(x) = 0; the **y-intercept** by setting x = 0.'
      },
      detailedSteps: {
        title: 'Step-by-Step',
        body: '**Step 1.** Identify the type of function (linear or quadratic) from the equation.\n\n**Step 2.** Find key points: y-intercept (set x = 0), x-intercept(s) (set f(x) = 0 and solve), and for a quadratic the vertex using x = −b/2a.\n\n**Step 3.** Calculate the y-coordinate of the vertex by substituting back into the function.\n\n**Step 4.** Choose at least 3 additional x-values across the domain and calculate their f(x) values.\n\n**Step 5.** Plot the points on a set of axes and join them with a smooth curve (quadratic) or straight line.\n\n**Step 6.** Label the intercepts, vertex, and axis of symmetry. State the domain and range.'
      },
      example: {
        title: 'Worked Example',
        body: '**Function:** f(x) = x² − 4x + 3\n\n**Step 1.** Quadratic, a = 1 > 0 → parabola opens upward.\n\n**Step 2.** y-intercept: f(0) = 3 → point (0, 3). x-intercepts: x² − 4x + 3 = 0 → (x−1)(x−3) = 0 → x = 1 and x = 3.\n\n**Step 3.** Vertex x = −(−4)/2(1) = 2. f(2) = 4 − 8 + 3 = −1 → vertex (2, −1).\n\n**Step 4.** Additional points: f(−1) = 1+4+3 = 8; f(4) = 16−16+3 = 3.\n\n**Step 6.** Domain: x ∈ ℝ. Range: f(x) ≥ −1. Axis of symmetry: x = 2.'
      },
      questions: [
        {
          type: 'short-answer',
          prompt: 'For f(x) = 2x − 5, what is f(4)? Show your substitution.',
          expectedAnswer: '3',
          explanation: 'f(4) = 2(4) − 5 = 8 − 5 = 3.',
          hintLevels: ['Substitute x = 4 into the formula.', '2 × 4 = 8. Now subtract 5.'],
          difficulty: 'foundation'
        },
        {
          type: 'step-by-step',
          prompt: 'For f(x) = x² − 6x + 8, find the x-intercepts and the coordinates of the vertex. Show all working.',
          expectedAnswer: 'x=2, x=4; vertex (3,-1)',
          explanation: 'x-intercepts: (x−2)(x−4)=0 → x=2, x=4. Vertex: x=3, f(3)=9−18+8=−1 → (3,−1).',
          hintLevels: ['Set f(x) = 0 and factorise.', 'Vertex x = −b/2a = 6/2 = 3.'],
          difficulty: 'core'
        }
      ]
    },
    {
      title: `${subjectName}: Quadratic Equations`,
      topicName: 'Algebra: quadratic equations',
      subtopicName: 'Factoring and the quadratic formula',
      overview: {
        title: 'Overview',
        body: 'A quadratic equation has the form ax² + bx + c = 0. In this lesson you learn to solve quadratic equations by factoring, completing the square, and applying the quadratic formula — and to interpret the discriminant to determine the nature of the roots.'
      },
      deeperExplanation: {
        title: 'Key Concepts',
        body: 'A quadratic equation must be in the form **ax² + bx + c = 0** before solving. The **discriminant** Δ = b² − 4ac tells you the nature of the roots: Δ > 0 means two real distinct roots; Δ = 0 means two equal real roots; Δ < 0 means no real roots. The **quadratic formula** x = (−b ± √Δ) / 2a always works. **Factoring** is faster when integer factors exist. Always check that the equation equals zero before applying any method.'
      },
      detailedSteps: {
        title: 'Step-by-Step',
        body: '**Step 1.** Rearrange the equation so all terms are on one side and the equation equals zero.\n\n**Step 2.** Calculate the discriminant Δ = b² − 4ac to determine whether real roots exist.\n\n**Step 3a.** Try factoring: find two numbers that multiply to ac and add to b, then split the middle term.\n\n**Step 3b.** If factoring is not possible, apply the quadratic formula: x = (−b ± √Δ) / 2a.\n\n**Step 4.** Simplify each root to its exact surd form or decimal (as required).\n\n**Step 5.** Verify by substituting each root back into the original equation.'
      },
      example: {
        title: 'Worked Example',
        body: '**Equation:** 2x² − 7x + 3 = 0 (already in standard form)\n\n**Step 2.** Δ = (−7)² − 4(2)(3) = 49 − 24 = 25 > 0 → two real distinct roots.\n\n**Step 3a.** Factors of 2×3=6 that add to −7: −6 and −1. Split: 2x² − 6x − x + 3 = 0 → 2x(x−3) − 1(x−3) = 0 → (2x−1)(x−3) = 0.\n\n**Step 4.** x = ½ or x = 3.\n\n**Step 5.** Check x=3: 2(9)−21+3 = 0 ✓; x=½: 2(¼)−3.5+3 = 0 ✓'
      },
      questions: [
        {
          type: 'multiple-choice',
          prompt: 'For the equation x² − 5x + 6 = 0, which factored form is correct?',
          expectedAnswer: '(x − 2)(x − 3) = 0',
          explanation: '(x−2)(x−3) expands to x²−5x+6. Check: −2×−3=+6 ✓ and −2+(−3)=−5 ✓.',
          hintLevels: ['Find two numbers that multiply to 6 and add to −5.', 'Those numbers are −2 and −3.'],
          difficulty: 'foundation',
          options: [
            { id: 'a', label: 'A', text: '(x + 2)(x + 3) = 0' },
            { id: 'b', label: 'B', text: '(x − 2)(x − 3) = 0' },
            { id: 'c', label: 'C', text: '(x − 6)(x + 1) = 0' }
          ]
        },
        {
          type: 'step-by-step',
          prompt: 'Solve 3x² + 2x − 8 = 0 using the quadratic formula. Show the discriminant and both roots.',
          expectedAnswer: 'x=4/3 or x=-2',
          explanation: 'Δ = 4+96 = 100. x = (−2 ± 10)/6. x = 8/6 = 4/3 or x = −12/6 = −2.',
          hintLevels: ['a=3, b=2, c=−8. Calculate Δ = b²−4ac.', 'Δ=100. Apply x=(−2±√100)/6.'],
          difficulty: 'core'
        }
      ]
    }
  ];
}

function createLessonBlueprints(subjectName: string, grade?: string): LessonBlueprint[] {
  if (subjectName === 'Mathematics' || subjectName === 'Mathematical Literacy') {
    const band = grade ? getGradeBand(grade) : 'intermediate';
    return createMathBlueprints(subjectName, band);
  }

  if (subjectName.includes('Language')) {
    return [
      {
        title: `${subjectName}: Finding the Main Idea`,
        topicName: 'Reading comprehension',
        subtopicName: 'Main idea and support',
        overview: {
          title: 'Overview',
          body: 'The main idea is the central message of a paragraph or short passage.'
        },
        deeperExplanation: {
          title: 'Deeper Explanation',
          body: 'Supporting details add evidence, but the main idea tells you what the whole paragraph is mostly about.'
        },
        example: {
          title: 'Worked Example',
          body: 'If a paragraph lists ways to save water, the main idea is saving water, not just one example like turning off the tap.'
        },
        questions: [
          {
            type: 'multiple-choice',
            prompt: 'Which option best describes the main idea of a paragraph?',
            expectedAnswer: 'the central message',
            explanation: 'The main idea is the central message, not a single detail.',
            hintLevels: ['Think about what the whole paragraph is mostly about.', 'Ignore one small example.'],
            difficulty: 'foundation',
            options: [
              { id: 'a', label: 'A', text: 'the central message' },
              { id: 'b', label: 'B', text: 'one supporting detail' },
              { id: 'c', label: 'C', text: 'the title only' }
            ]
          },
          {
            type: 'short-answer',
            prompt: 'Complete the sentence: Supporting details help to ____ the main idea.',
            expectedAnswer: 'explain',
            explanation: 'Supporting details explain or prove the main idea.',
            hintLevels: ['They add meaning and evidence.', 'A good verb is “explain”.'],
            difficulty: 'core'
          }
        ]
      },
      {
        title: `${subjectName}: Sentence Structure`,
        topicName: 'Writing foundations',
        subtopicName: 'Complete sentences',
        overview: {
          title: 'Overview',
          body: 'A complete sentence needs a subject and a verb and must express a full idea.'
        },
        deeperExplanation: {
          title: 'Deeper Explanation',
          body: 'Fragments are incomplete. Complete sentences make sense on their own and are punctuated properly.'
        },
        example: {
          title: 'Worked Example',
          body: '“The learner reads.” is complete because it has a subject and a verb.'
        },
        questions: [
          {
            type: 'multiple-choice',
            prompt: 'Which is a complete sentence?',
            expectedAnswer: 'The learner writes neatly.',
            explanation: 'It includes a subject, a verb, and a complete thought.',
            hintLevels: ['Look for a full idea.', 'Find both the doer and the action.'],
            difficulty: 'foundation',
            options: [
              { id: 'a', label: 'A', text: 'Because the rain' },
              { id: 'b', label: 'B', text: 'The learner writes neatly.' },
              { id: 'c', label: 'C', text: 'After school' }
            ]
          },
          {
            type: 'short-answer',
            prompt: 'What two parts does every complete sentence need?',
            expectedAnswer: 'subject and verb',
            acceptedAnswers: ['a subject and a verb', 'subject verb'],
            explanation: 'A subject tells who or what, and a verb tells the action or state.',
            hintLevels: ['Think “who” and “doing what”.', 'The two parts are subject and verb.'],
            difficulty: 'core'
          }
        ]
      }
    ];
  }

  if (
    [
      'Natural Sciences and Technology',
      'Natural Sciences',
      'Physical Sciences',
      'Life Sciences'
    ].includes(subjectName)
  ) {
    return [
      {
        title: `${subjectName}: Scientific Variables and Fair Testing`,
        topicName: 'Scientific investigation',
        subtopicName: 'Variables and fair testing',
        overview: {
          title: 'Overview',
          body: 'A fair test changes exactly one variable and keeps all others controlled. This allows you to determine which factor caused the observed change. In this lesson you learn to identify independent, dependent, and controlled variables in an investigation.'
        },
        deeperExplanation: {
          title: 'Key Concepts',
          body: 'Every controlled experiment has three types of variables. The **independent variable** is the factor you deliberately change. The **dependent variable** is what you measure as a result. **Controlled variables** are all other factors you keep the same to ensure a fair test. The purpose of a fair test is to isolate the effect of one variable so your conclusion is valid.'
        },
        detailedSteps: {
          title: 'Step-by-Step',
          body: '**Step 1.** Read the experiment description and identify what the investigator changed — that is the **independent variable**.\n\n**Step 2.** Identify what the investigator measured or observed — that is the **dependent variable**.\n\n**Step 3.** List everything else that was kept the same — these are the **controlled variables**.\n\n**Step 4.** State the aim: "To investigate the effect of [independent variable] on [dependent variable]."\n\n**Step 5.** Check for fairness — was only one variable changed at a time? If not, explain why the test is unfair.'
        },
        example: {
          title: 'Worked Example',
          body: '**Experiment:** Five identical plants are given different amounts of water (0 ml, 50 ml, 100 ml, 150 ml, 200 ml per day) and their heights are measured after two weeks.\n\n**Step 1.** Changed factor → amount of water → **independent variable**.\n\n**Step 2.** Measured factor → height of plant → **dependent variable**.\n\n**Step 3.** Same for all: type of plant, soil, pot size, amount of sunlight, temperature → **controlled variables**.\n\n**Step 4.** Aim: "To investigate the effect of water volume on plant growth."\n\n**Step 5.** Only water amount changed → fair test ✓.'
        },
        questions: [
          {
            type: 'short-answer',
            prompt: 'In an experiment testing how temperature affects the rate of a chemical reaction, what is the independent variable?',
            expectedAnswer: 'temperature',
            explanation: 'The independent variable is the one the investigator deliberately changes — in this case, temperature.',
            hintLevels: ['It is the factor the scientist changes on purpose.', 'It is temperature.'],
            difficulty: 'foundation'
          },
          {
            type: 'multiple-choice',
            prompt: 'In a fair test, how many variables should be changed at a time?',
            expectedAnswer: 'one',
            explanation: 'Changing only one variable ensures that any change in the dependent variable is caused by that one factor.',
            hintLevels: ['If you change more than one, you cannot tell which one caused the effect.', 'The answer is one.'],
            difficulty: 'core',
            options: [
              { id: 'a', label: 'A', text: 'one' },
              { id: 'b', label: 'B', text: 'two' },
              { id: 'c', label: 'C', text: 'all of them' }
            ]
          }
        ]
      },
      {
        title: `${subjectName}: Matter and Change`,
        topicName: 'Matter and materials',
        subtopicName: 'States of matter and energy changes',
        overview: {
          title: 'Overview',
          body: 'Matter exists as a solid, liquid, or gas depending on how its particles behave. In this lesson you learn to name and explain the changes of state, and connect them to the energy changes that drive them.'
        },
        deeperExplanation: {
          title: 'Key Concepts',
          body: 'Matter is made of particles in constant motion. In a **solid**, particles vibrate in fixed positions — strong forces hold them together. In a **liquid**, particles move freely but remain in contact. In a **gas**, particles move rapidly with large spaces between them. Adding energy (heating) increases particle movement and can cause a **change of state**: melting (solid→liquid), boiling/evaporation (liquid→gas), sublimation (solid→gas). Removing energy (cooling) reverses the process: freezing, condensation.'
        },
        detailedSteps: {
          title: 'Step-by-Step',
          body: '**Step 1.** Identify the starting state of matter and the ending state.\n\n**Step 2.** Determine the direction of energy change: is energy being added (heating) or removed (cooling)?\n\n**Step 3.** Name the change of state using the correct scientific term (melting, boiling, freezing, condensation, evaporation, sublimation).\n\n**Step 4.** Describe what happens to the particles: how does their arrangement and movement change?\n\n**Step 5.** Give a real-world example to illustrate the change.'
        },
        example: {
          title: 'Worked Example',
          body: '**Scenario:** Ice cubes are placed in a warm room and slowly become water, then slowly some water disappears.\n\n**Step 1.** Solid → Liquid → Gas.\n\n**Step 2.** Energy is being added (room temperature is above 0°C).\n\n**Step 3.** Solid→Liquid = **melting**. Liquid→Gas = **evaporation**.\n\n**Step 4.** Melting: particles gain energy, vibrations break bonds → particles move more freely. Evaporation: surface particles gain enough energy to escape into the air.\n\n**Step 5.** Real world: ice melts in a drink on a warm day; puddles disappear after rain.'
        },
        questions: [
          {
            type: 'short-answer',
            prompt: 'What is the name for the change of state when a liquid becomes a gas?',
            expectedAnswer: 'evaporation',
            acceptedAnswers: ['boiling', 'vaporisation', 'vaporization'],
            explanation: 'When a liquid becomes a gas, the process is called evaporation (or boiling if it happens throughout the liquid).',
            hintLevels: ['Think of water disappearing from a puddle.', 'The process is called evaporation.'],
            difficulty: 'foundation'
          },
          {
            type: 'short-answer',
            prompt: 'Explain why a solid has a definite shape but a liquid does not.',
            expectedAnswer: 'particles in a solid vibrate in fixed positions; liquid particles move freely',
            explanation: 'In a solid, strong forces hold particles in fixed positions. In a liquid, particles can move past each other, so the liquid takes the shape of its container.',
            hintLevels: ['Think about how particles are arranged in each state.', 'Solid particles are fixed; liquid particles can flow.'],
            difficulty: 'core'
          }
        ]
      }
    ];
  }

  if (['Social Sciences', 'Geography', 'History', 'Life Orientation'].includes(subjectName)) {
    return [
      {
        title: `${subjectName}: Using Evidence`,
        topicName: 'Investigating information',
        subtopicName: 'Sources and claims',
        overview: {
          title: 'Overview',
          body: 'Good conclusions are based on reliable information and evidence.'
        },
        deeperExplanation: {
          title: 'Deeper Explanation',
          body: 'A source gives you information. You compare sources to decide whether a claim is trustworthy.'
        },
        example: {
          title: 'Worked Example',
          body: 'A map, graph, or historical account can all act as evidence when answering a question about people and places.'
        },
        questions: [
          {
            type: 'short-answer',
            prompt: 'What do we call information used to support a claim?',
            expectedAnswer: 'evidence',
            acceptedAnswers: ['supporting evidence'],
            explanation: 'Evidence supports a claim or conclusion.',
            hintLevels: ['It helps prove a point.', 'The word is evidence.'],
            difficulty: 'foundation'
          },
          {
            type: 'multiple-choice',
            prompt: 'Which source is best for locating countries and cities?',
            expectedAnswer: 'map',
            explanation: 'Maps show spatial information clearly.',
            hintLevels: ['Think of locations and directions.', 'A map is best for that.'],
            difficulty: 'core',
            options: [
              { id: 'a', label: 'A', text: 'map' },
              { id: 'b', label: 'B', text: 'poem' },
              { id: 'c', label: 'C', text: 'recipe' }
            ]
          }
        ]
      },
      {
        title: `${subjectName}: Cause and Effect`,
        topicName: 'Reasoning about change',
        subtopicName: 'Explaining outcomes',
        overview: {
          title: 'Overview',
          body: 'Cause explains why something happened, and effect explains what happened as a result.'
        },
        deeperExplanation: {
          title: 'Deeper Explanation',
          body: 'Understanding cause and effect helps you explain events, decisions, and consequences clearly.'
        },
        example: {
          title: 'Worked Example',
          body: 'Heavy rain can be the cause, and flooding can be the effect.'
        },
        questions: [
          {
            type: 'short-answer',
            prompt: 'In the statement "Heavy rain caused flooding", what is the effect?',
            expectedAnswer: 'flooding',
            explanation: 'Flooding happened because of the heavy rain.',
            hintLevels: ['The effect is what happened.', 'The answer is flooding.'],
            difficulty: 'foundation'
          },
          {
            type: 'short-answer',
            prompt: 'What word describes why something happened: cause or effect?',
            expectedAnswer: 'cause',
            explanation: 'Cause explains why; effect explains the result.',
            hintLevels: ['Think about the reason.', 'The answer is cause.'],
            difficulty: 'core'
          }
        ]
      }
    ];
  }

  if (
    [
      'Economic and Management Sciences',
      'Accounting',
      'Business Studies',
      'Economics'
    ].includes(subjectName)
  ) {
    return [
      {
        title: `${subjectName}: Needs, Wants, and Scarcity`,
        topicName: 'Economic choices',
        subtopicName: 'Prioritising spending and opportunity cost',
        overview: {
          title: 'Overview',
          body: 'Every economic decision involves choosing between needs and wants under conditions of scarcity. In this lesson you learn to distinguish needs from wants, explain scarcity, and apply the concept of opportunity cost to a real spending decision.'
        },
        deeperExplanation: {
          title: 'Key Concepts',
          body: '**Needs** are goods or services essential for survival (food, shelter, clothing, healthcare). **Wants** are goods or services that improve comfort or enjoyment but are not essential. **Scarcity** arises because resources are limited but wants are unlimited — this forces choices. The **opportunity cost** of any choice is the value of the next-best alternative you give up. Every financial decision has an opportunity cost, even if you do not see it immediately.'
        },
        detailedSteps: {
          title: 'Step-by-Step',
          body: '**Step 1.** List the items or options being considered.\n\n**Step 2.** Classify each as a need (essential for survival) or a want (improves comfort).\n\n**Step 3.** Identify the budget constraint — how much money is available?\n\n**Step 4.** Rank the items: needs first, then wants in order of priority.\n\n**Step 5.** Identify the opportunity cost — what is given up by choosing the highest-priority item?'
        },
        example: {
          title: 'Worked Example',
          body: '**Scenario:** Thabo has R200. He wants to buy food (R80), airtime (R50), and new trainers (R180).\n\n**Step 2.** Food = need. Airtime = want (but may be needed for communication). Trainers = want.\n\n**Step 3.** Budget = R200. Total cost = R310 — exceeds budget.\n\n**Step 4.** Priority: Food (R80) → Airtime (R50) → Total so far: R130. Remaining: R70 — not enough for trainers (R180).\n\n**Step 5.** Opportunity cost of buying food: giving up airtime or trainers. Thabo buys food and airtime (R130); opportunity cost = trainers.'
        },
        questions: [
          {
            type: 'multiple-choice',
            prompt: 'Lena has R50 and must choose between buying lunch (R30) or a magazine (R50). What is the opportunity cost of buying lunch?',
            expectedAnswer: 'the magazine she could not afford',
            explanation: 'Opportunity cost is the value of the next-best alternative given up. She gives up the magazine.',
            hintLevels: ['Opportunity cost is what you give up.', 'She cannot buy the magazine if she buys lunch.'],
            difficulty: 'foundation',
            options: [
              { id: 'a', label: 'A', text: 'the R20 change she keeps' },
              { id: 'b', label: 'B', text: 'the magazine she could not afford' },
              { id: 'c', label: 'C', text: 'the fact that she is hungry' }
            ]
          },
          {
            type: 'short-answer',
            prompt: 'Explain why scarcity forces people to make choices. Use the terms “needs”, “wants”, and “resources” in your answer.',
            expectedAnswer: 'resources are limited but needs and wants are unlimited so people must choose',
            explanation: 'Scarcity exists because available resources are finite while human needs and wants have no limit, forcing prioritisation.',
            hintLevels: ['Think about how much money (a resource) people have vs. everything they need and want.', 'Resources are limited; needs and wants are not.'],
            difficulty: 'core'
          }
        ]
      },
      {
        title: `${subjectName}: Income, Expenses, and Budgeting`,
        topicName: 'Money management',
        subtopicName: 'Personal and business budgets',
        overview: {
          title: 'Overview',
          body: 'A budget plans how available income will be used to cover expenses. In this lesson you learn to identify income and expense items, construct a simple budget, and calculate whether it shows a surplus, deficit, or break-even position.'
        },
        deeperExplanation: {
          title: 'Key Concepts',
          body: '**Income** is all money received (salary, business revenue, grants). **Expenses** (or expenditure) are all money paid out (rent, food, transport, wages). A **budget** shows planned income minus planned expenses. Three outcomes are possible: **surplus** (income > expenses — money left over), **deficit** (income < expenses — shortfall), or **break-even** (income = expenses). A surplus can be saved or invested. A deficit must be financed by reducing expenses or finding extra income.'
        },
        detailedSteps: {
          title: 'Step-by-Step',
          body: '**Step 1.** List all income items and their amounts in a table.\n\n**Step 2.** Calculate **total income** by adding all income items.\n\n**Step 3.** List all expense items and their amounts in a separate table.\n\n**Step 4.** Calculate **total expenses** by adding all expense items.\n\n**Step 5.** Calculate the budget position: Total Income − Total Expenses.\n\n**Step 6.** State the result: surplus (+), deficit (−), or break-even (0), and recommend an action.'
        },
        example: {
          title: 'Worked Example',
          body: '**Budget — Zinhle\'s Small Business (March):**\n\n| Income | R |\n|---|---|\n| Sales revenue | 8 500 |\n| **Total Income** | **8 500** |\n\n| Expenses | R |\n|---|---|\n| Stock purchased | 4 200 |\n| Rent | 1 500 |\n| Wages | 1 800 |\n| Transport | 300 |\n| **Total Expenses** | **7 800** |\n\n**Step 5.** Budget position = R8 500 − R7 800 = **R700 surplus**.\n\n**Step 6.** Zinhle\'s business earned R700 more than it spent in March. She should save or reinvest the surplus.'
        },
        questions: [
          {
            type: 'numeric',
            prompt: 'A household earns R12 400 per month. Their expenses are: rent R3 500, food R2 800, transport R900, school fees R1 200, utilities R600. Calculate the monthly surplus or deficit.',
            expectedAnswer: '3400',
            explanation: 'Total expenses = 3500+2800+900+1200+600 = R9 000. Surplus = 12 400 − 9 000 = R3 400.',
            hintLevels: ['Add up all expenses first.', 'Total expenses = R9 000. Subtract from R12 400.'],
            difficulty: 'foundation'
          },
          {
            type: 'short-answer',
            prompt: 'A business has total income of R45 000 and total expenses of R52 000. Is this a surplus or deficit? By how much? What should the business do?',
            expectedAnswer: 'deficit of R7 000 — reduce expenses or increase income',
            explanation: 'R45 000 − R52 000 = −R7 000 (deficit). The business spent R7 000 more than it earned and must cut costs or find more revenue.',
            hintLevels: ['Is income greater or less than expenses?', 'Deficit = expenses exceed income. Recommend: cut costs or find more income.'],
            difficulty: 'core'
          }
        ]
      }
    ];
  }

  if (
    ['Technology', 'Computer Applications Technology', 'Information Technology'].includes(subjectName)
  ) {
    return [
      {
        title: `${subjectName}: Inputs, Processing, Outputs`,
        topicName: 'Systems thinking',
        subtopicName: 'How systems work',
        overview: {
          title: 'Overview',
          body: 'Many systems take an input, process it, and produce an output.'
        },
        deeperExplanation: {
          title: 'Deeper Explanation',
          body: 'Understanding inputs and outputs helps you design and explain both digital and physical systems.'
        },
        example: {
          title: 'Worked Example',
          body: 'A keyboard provides input, the computer processes it, and the screen shows the output.'
        },
        questions: [
          {
            type: 'short-answer',
            prompt: 'Is a keyboard an input or an output device?',
            expectedAnswer: 'input',
            explanation: 'The keyboard sends information into the computer.',
            hintLevels: ['Does it send data in or out?', 'The answer is input.'],
            difficulty: 'foundation'
          },
          {
            type: 'short-answer',
            prompt: 'What part of a system changes input into output?',
            expectedAnswer: 'processing',
            acceptedAnswers: ['the processing stage', 'process'],
            explanation: 'Processing transforms the input into output.',
            hintLevels: ['It happens in the middle.', 'The word is processing.'],
            difficulty: 'core'
          }
        ]
      },
      {
        title: `${subjectName}: Algorithms and Steps`,
        topicName: 'Problem solving',
        subtopicName: 'Ordered instructions',
        overview: {
          title: 'Overview',
          body: 'An algorithm is a clear sequence of steps used to solve a problem.'
        },
        deeperExplanation: {
          title: 'Deeper Explanation',
          body: 'Instructions need to be in the correct order; otherwise the process fails or gives the wrong result.'
        },
        example: {
          title: 'Worked Example',
          body: 'Logging in requires steps in order: open the page, enter details, then submit.'
        },
        questions: [
          {
            type: 'short-answer',
            prompt: 'What do we call a set of ordered steps for solving a problem?',
            expectedAnswer: 'algorithm',
            explanation: 'An algorithm is an ordered procedure.',
            hintLevels: ['It starts with “a”.', 'The answer is algorithm.'],
            difficulty: 'foundation'
          },
          {
            type: 'multiple-choice',
            prompt: 'Why does the order of instructions matter?',
            expectedAnswer: 'because steps depend on each other',
            explanation: 'Many steps only work when the previous step has already happened.',
            hintLevels: ['Think about one step setting up the next.', 'Choose the dependency idea.'],
            difficulty: 'core',
            options: [
              { id: 'a', label: 'A', text: 'because steps depend on each other' },
              { id: 'b', label: 'B', text: 'because longer instructions are better' },
              { id: 'c', label: 'C', text: 'because computers dislike short answers' }
            ]
          }
        ]
      }
    ];
  }

  if (['Creative Arts', 'Visual Arts'].includes(subjectName)) {
    return [
      {
        title: `${subjectName}: Elements of Design`,
        topicName: 'Creative foundations',
        subtopicName: 'Line, shape, and colour',
        overview: {
          title: 'Overview',
          body: 'Artists use line, shape, colour, texture, and space to build meaning.'
        },
        deeperExplanation: {
          title: 'Deeper Explanation',
          body: 'The elements of design help you describe how artwork is structured and why it creates a certain effect.'
        },
        example: {
          title: 'Worked Example',
          body: 'Bold lines can create movement, while warm colours can create energy.'
        },
        questions: [
          {
            type: 'short-answer',
            prompt: 'Name one element of design.',
            expectedAnswer: 'colour',
            explanation: 'Colour is one valid element of design.',
            hintLevels: ['Think of line, shape, colour, texture, or space.', 'A simple correct answer is colour.'],
            difficulty: 'foundation'
          },
          {
            type: 'multiple-choice',
            prompt: 'Which element is most directly linked to red, blue, and yellow?',
            expectedAnswer: 'colour',
            explanation: 'Red, blue, and yellow are colours.',
            hintLevels: ['Think about what those words describe.', 'They are colours.'],
            difficulty: 'core',
            options: [
              { id: 'a', label: 'A', text: 'texture' },
              { id: 'b', label: 'B', text: 'colour' },
              { id: 'c', label: 'C', text: 'balance' }
            ]
          }
        ]
      },
      {
        title: `${subjectName}: Responding to Artwork`,
        topicName: 'Observation and critique',
        subtopicName: 'Describing choices',
        overview: {
          title: 'Overview',
          body: 'When you respond to artwork, you describe what you see and explain the effect it creates.'
        },
        deeperExplanation: {
          title: 'Deeper Explanation',
          body: 'A strong response links visual choices like colour or layout to mood, meaning, or emphasis.'
        },
        example: {
          title: 'Worked Example',
          body: 'You might say bright colours create an energetic mood.'
        },
        questions: [
          {
            type: 'short-answer',
            prompt: 'What should you do after describing what you see in artwork?',
            expectedAnswer: 'explain the effect',
            acceptedAnswers: ['describe the effect', 'explain its effect', 'explain the meaning'],
            explanation: 'A strong response explains the effect or meaning of the choices.',
            hintLevels: ['Move from description to interpretation.', 'Explain the effect.'],
            difficulty: 'foundation'
          },
          {
            type: 'short-answer',
            prompt: 'Bright colours often create what kind of mood?',
            expectedAnswer: 'energetic',
            explanation: 'Bright colours are often described as energetic.',
            hintLevels: ['Think lively and active.', 'The word is energetic.'],
            difficulty: 'core'
          }
        ]
      }
    ];
  }

  return [
    {
      title: `${subjectName}: Core Ideas`,
      topicName: 'Foundations',
      subtopicName: 'Essential concepts',
      overview: {
        title: 'Overview',
        body: `${subjectName} starts with a clear vocabulary, a core process, and examples that connect the ideas to school tasks.`
      },
      deeperExplanation: {
        title: 'Deeper Explanation',
        body: `Strong progress in ${subjectName} comes from naming the concept, explaining why it matters, and using it in a simple example.`
      },
      example: {
        title: 'Worked Example',
        body: `A good first example in ${subjectName} identifies the main idea, explains it, and shows how to apply it correctly.`
      },
      questions: [
        {
          type: 'short-answer',
          prompt: `What is the first step when learning a new idea in ${subjectName}?`,
          expectedAnswer: 'identify the idea',
          acceptedAnswers: ['identify the concept', 'name the idea'],
          explanation: 'Start by identifying the concept clearly.',
          hintLevels: ['Before applying, name it.', 'Identify the idea first.'],
          difficulty: 'foundation'
        },
        {
          type: 'short-answer',
          prompt: `After naming the idea in ${subjectName}, what should you do next?`,
          expectedAnswer: 'explain it',
          acceptedAnswers: ['explain the idea', 'describe it'],
          explanation: 'Explaining the idea helps build understanding before harder tasks.',
          hintLevels: ['Do not jump straight to advanced work.', 'Explain it next.'],
          difficulty: 'core'
        }
      ]
    },
    {
      title: `${subjectName}: Applying Knowledge`,
      topicName: 'Application',
      subtopicName: 'Using what you know',
      overview: {
        title: 'Overview',
        body: `Application in ${subjectName} means taking a known idea and using it in a new question or context.`
      },
      deeperExplanation: {
        title: 'Deeper Explanation',
        body: `Learners show mastery when they can justify a step, connect it to the concept, and adapt it when the context changes.`
      },
      example: {
        title: 'Worked Example',
        body: `A worked example in ${subjectName} should show the concept, the step, and the reason that step makes sense.`
      },
      questions: [
        {
          type: 'short-answer',
          prompt: `What does application mean in ${subjectName}?`,
          expectedAnswer: 'using what you know',
          acceptedAnswers: ['apply what you know', 'use what you know'],
          explanation: 'Application means using existing knowledge in context.',
          hintLevels: ['Think about putting knowledge to work.', 'Using what you know.'],
          difficulty: 'foundation'
        },
        {
          type: 'short-answer',
          prompt: `What should a learner justify when answering in ${subjectName}?`,
          expectedAnswer: 'the step',
          explanation: 'The learner should justify the step they are taking.',
          hintLevels: ['What part of the method needs a reason?', 'The step.'],
          difficulty: 'core'
        }
      ]
    }
  ];
}

export function buildLearningProgram(
  country: string,
  curriculumName: string,
  grade: string,
  subjectNames: string[]
): LearningProgram {
  const resolvedSubjects = subjectNames.length > 0 ? subjectNames : ['Mathematics'];
  const questions: Question[] = [];
  const lessons: Lesson[] = [];
  const subjects: Subject[] = resolvedSubjects.map((subjectName) => {
    const subjectSlug = slugify(subjectName);
    // Pass grade so Math (and future subjects) return grade-appropriate blueprints
    const lessonBlueprints = createLessonBlueprints(subjectName, grade);
    const topics: Topic[] = lessonBlueprints.map((blueprint, lessonIndex) => {
      const topicId = `${subjectSlug}-topic-${lessonIndex + 1}`;
      const subtopicId = `${topicId}-subtopic-1`;
      const lessonId = `${subjectSlug}-lesson-${lessonIndex + 1}`;
      const lessonQuestions = blueprint.questions.map((question, questionIndex) =>
        createQuestion(lessonId, topicId, subtopicId, questionIndex, question)
      );

      // Extract the core concept sentence from deeperExplanation for summary use
      const conceptsSentence = blueprint.deeperExplanation.body.replace(/\*\*[^*]+\*\*/g, (m) => m.slice(2, -2)).split('.')[0].trim();

      questions.push(...lessonQuestions);
      lessons.push({
        id: lessonId,
        topicId,
        subtopicId,
        title: blueprint.title,
        subjectId: `subject-${subjectSlug}`,
        grade,
        orientation: blueprint.overview,
        mentalModel: {
          title: 'Big Picture',
          body: `Before looking at any rules, picture **${blueprint.topicName}** as one connected idea. The parts only make sense once you can see how they relate. Hold this bigger picture in mind as we build the details step by step.`
        },
        concepts: blueprint.deeperExplanation,
        guidedConstruction: blueprint.detailedSteps ?? {
          title: 'Guided Construction',
          body: `**Step 1.** Read the problem carefully and identify what **${blueprint.topicName}** is asking you to do.\n\n**Step 2.** Apply the key rule — state it explicitly before calculating anything.\n\n**Step 3.** Show each step of your reasoning and keep track of units or labels.\n\n**Step 4.** Check your answer against what the problem asked — does it make sense?`
        },
        workedExample: blueprint.example,
        practicePrompt: {
          title: 'Active Practice',
          body: `Now try it yourself. Apply what you have learned about **${blueprint.topicName}** to a similar problem. Write out each step, explain your reasoning, and check your answer before moving on.`
        },
        commonMistakes: {
          title: 'Common Mistakes',
          body: `The most common error with **${blueprint.topicName}** is rushing past the reasoning step and writing only the answer. Always name the rule or concept first, then apply it step by step. A second common error is not checking the answer — always substitute back or re-read the question to confirm.`
        },
        transferChallenge: {
          title: 'Transfer Challenge',
          body: `Can you apply **${blueprint.topicName}** to a problem you have not seen before? Think about where this pattern or rule shows up in a slightly different form — different numbers, different context, or a multi-step problem. Identify the same core idea and adapt the method.`
        },
        // Three-part summary: core rule + mistake warning + transfer hook
        summary: {
          title: 'Summary',
          body: [
            `**${blueprint.topicName} — key takeaways:**`,
            ``,
            `**Core rule:** ${conceptsSentence}.`,
            ``,
            `**Watch out for:** Skipping the reasoning step and going straight to the answer — always name the rule first, then apply it.`,
            ``,
            `**Transfer:** If you can apply **${blueprint.topicName}** to a problem you haven't seen before and justify every step, you're ready for exam questions on this topic.`
          ].join('\n')
        },
        practiceQuestionIds: lessonQuestions.map((question) => question.id),
        masteryQuestionIds: lessonQuestions.map((question) => question.id)
      });

      return {
        id: topicId,
        name: blueprint.topicName,
        subtopics: [
          {
            id: subtopicId,
            name: blueprint.subtopicName,
            lessonIds: [lessonId]
          }
        ]
      };
    });

    return {
      id: `subject-${subjectSlug}`,
      name: subjectName,
      topics
    };
  });

  return {
    curriculum: {
      country,
      name: curriculumName,
      grade,
      subjects
    },
    lessons,
    questions
  };
}
