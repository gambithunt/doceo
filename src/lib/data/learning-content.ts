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

function createLessonBlueprints(subjectName: string): LessonBlueprint[] {
  if (subjectName === 'Mathematics' || subjectName === 'Mathematical Literacy') {
    return [
      {
        title: `${subjectName}: Number Patterns`,
        topicName: 'Patterns and relationships',
        subtopicName: 'Extending number sequences',
        overview: {
          title: 'Overview',
          body: 'Number patterns help you predict what comes next by noticing a repeated rule. In this lesson we learn to identify the rule and use it to extend or describe a sequence.'
        },
        deeperExplanation: {
          title: 'Key Concepts',
          body: 'A number pattern can increase, decrease, or repeat. The difference between consecutive terms is called the common difference. Stating the rule first is more important than just writing the next number.'
        },
        detailedSteps: {
          title: 'Step-by-Step',
          body: '**Step 1.** Write out the sequence and look at the gap between each pair of consecutive terms.\n\n**Step 2.** Name the rule — for example, "add 4 each time" or "subtract 3 each time".\n\n**Step 3.** Apply the rule to find the next term: take the last number and add (or subtract) the common difference.\n\n**Step 4.** Check: apply the rule backwards to confirm the earlier terms still work.'
        },
        example: {
          title: 'Worked Example',
          body: '**Sequence:** 4, 8, 12, 16, ?\n\n**Step 1.** Gaps: 8−4=4, 12−8=4, 16−12=4. The common difference is 4.\n\n**Step 2.** Rule: add 4 each time.\n\n**Step 3.** Next term: 16 + 4 = **20**.\n\n**Step 4.** Check: 20 − 4 = 16 ✓'
        },
        questions: [
          {
            type: 'multiple-choice',
            prompt: 'What is the next number in 5, 10, 15, 20?',
            expectedAnswer: '25',
            explanation: 'The pattern increases by 5 each time.',
            hintLevels: ['Look at the difference between each pair.', 'Add 5 to 20.'],
            difficulty: 'foundation',
            options: [
              { id: 'a', label: 'A', text: '22' },
              { id: 'b', label: 'B', text: '25' },
              { id: 'c', label: 'C', text: '30' }
            ]
          },
          {
            type: 'short-answer',
            prompt: 'State the rule for 3, 6, 9, 12.',
            expectedAnswer: 'add 3',
            acceptedAnswers: ['add three', '+3', 'increases by 3'],
            explanation: 'Each term is 3 more than the previous one.',
            hintLevels: ['Compare one term to the next.', 'What is 6 minus 3?'],
            difficulty: 'core'
          }
        ]
      },
      {
        title: `${subjectName}: Solving Simple Equations`,
        topicName: 'Algebra foundations',
        subtopicName: 'Keeping equations balanced',
        overview: {
          title: 'Overview',
          body: 'An equation stays true when you do the same thing to both sides. In this lesson we learn to isolate the variable using inverse operations.'
        },
        deeperExplanation: {
          title: 'Key Concepts',
          body: 'An equation is a balance. Whatever you do to one side you must do to the other. Use the inverse operation to undo what is being done to the variable: addition undoes subtraction, multiplication undoes division.'
        },
        detailedSteps: {
          title: 'Step-by-Step',
          body: '**Step 1.** Identify the variable and what is being done to it.\n\n**Step 2.** Choose the inverse operation (if the equation adds, subtract; if it multiplies, divide).\n\n**Step 3.** Apply the inverse operation to both sides of the equation.\n\n**Step 4.** Write the solution: variable = value.\n\n**Step 5.** Substitute your answer back into the original equation to verify both sides are equal.'
        },
        example: {
          title: 'Worked Example',
          body: '**Equation:** x + 4 = 11\n\n**Step 1.** The variable is x. It has 4 added to it.\n\n**Step 2.** Inverse of +4 is −4.\n\n**Step 3.** Subtract 4 from both sides: x + 4 − 4 = 11 − 4\n\n**Step 4.** x = 7\n\n**Step 5.** Check: 7 + 4 = 11 ✓'
        },
        questions: [
          {
            type: 'numeric',
            prompt: 'If x + 6 = 14, what is x?',
            expectedAnswer: '8',
            explanation: 'Subtract 6 from both sides.',
            hintLevels: ['What undoes +6?', '14 minus 6 equals 8.'],
            difficulty: 'foundation'
          },
          {
            type: 'step-by-step',
            prompt: 'Solve 3x = 21 and explain the step.',
            expectedAnswer: '7',
            explanation: 'Divide both sides by 3 to isolate x.',
            hintLevels: ['x is multiplied by 3.', 'Use division to undo multiplication.'],
            difficulty: 'core'
          }
        ]
      }
    ];
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
        title: `${subjectName}: Scientific Variables`,
        topicName: 'Scientific investigation',
        subtopicName: 'Fair testing',
        overview: {
          title: 'Overview',
          body: 'A fair test changes one factor and keeps the others controlled.'
        },
        deeperExplanation: {
          title: 'Deeper Explanation',
          body: 'The independent variable is what you change, and the dependent variable is what you measure.'
        },
        example: {
          title: 'Worked Example',
          body: 'If you test plant growth using different amounts of light, the light is the independent variable.'
        },
        questions: [
          {
            type: 'short-answer',
            prompt: 'In an experiment, what is the variable you change called?',
            expectedAnswer: 'independent variable',
            explanation: 'The independent variable is the one the investigator changes.',
            hintLevels: ['It is not the measured result.', 'It is the independent variable.'],
            difficulty: 'foundation'
          },
          {
            type: 'multiple-choice',
            prompt: 'A fair test changes how many variables at a time?',
            expectedAnswer: 'one',
            explanation: 'Changing one variable makes the result easier to interpret.',
            hintLevels: ['Only one factor should change.', 'The answer is one.'],
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
        subtopicName: 'States of matter',
        overview: {
          title: 'Overview',
          body: 'Matter can exist as a solid, liquid, or gas depending on how its particles behave.'
        },
        deeperExplanation: {
          title: 'Deeper Explanation',
          body: 'Heating and cooling can change the state of matter because particles move differently at different energy levels.'
        },
        example: {
          title: 'Worked Example',
          body: 'Ice melts into liquid water when heat is added.'
        },
        questions: [
          {
            type: 'short-answer',
            prompt: 'What change of state happens when a solid becomes a liquid?',
            expectedAnswer: 'melting',
            explanation: 'Melting is the change from solid to liquid.',
            hintLevels: ['Think of ice becoming water.', 'The word is melting.'],
            difficulty: 'foundation'
          },
          {
            type: 'short-answer',
            prompt: 'Name the three common states of matter.',
            expectedAnswer: 'solid liquid gas',
            acceptedAnswers: ['solid, liquid, gas', 'solid, liquid and gas', 'solid liquid and gas'],
            explanation: 'The three common states are solid, liquid, and gas.',
            hintLevels: ['Think of ice, water, and steam.', 'solid, liquid, gas'],
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
        title: `${subjectName}: Needs and Wants`,
        topicName: 'Economic choices',
        subtopicName: 'Prioritising spending',
        overview: {
          title: 'Overview',
          body: 'Needs are essential for living, while wants improve comfort or enjoyment.'
        },
        deeperExplanation: {
          title: 'Deeper Explanation',
          body: 'Scarcity means you cannot have everything at once, so you must choose how to use limited resources.'
        },
        example: {
          title: 'Worked Example',
          body: 'Food is a need. A new game is usually a want.'
        },
        questions: [
          {
            type: 'multiple-choice',
            prompt: 'Which of these is usually a need?',
            expectedAnswer: 'food',
            explanation: 'Food is essential for living.',
            hintLevels: ['Choose the essential item.', 'The answer is food.'],
            difficulty: 'foundation',
            options: [
              { id: 'a', label: 'A', text: 'food' },
              { id: 'b', label: 'B', text: 'designer shoes' },
              { id: 'c', label: 'C', text: 'a video game' }
            ]
          },
          {
            type: 'short-answer',
            prompt: 'What do we call limited resources and unlimited wants?',
            expectedAnswer: 'scarcity',
            acceptedAnswers: ['resource scarcity'],
            explanation: 'Scarcity forces people to make choices.',
            hintLevels: ['It begins with “s”.', 'The word is scarcity.'],
            difficulty: 'core'
          }
        ]
      },
      {
        title: `${subjectName}: Income and Expenses`,
        topicName: 'Money management',
        subtopicName: 'Basic budgeting',
        overview: {
          title: 'Overview',
          body: 'A budget compares money coming in with money going out.'
        },
        deeperExplanation: {
          title: 'Deeper Explanation',
          body: 'Income is money received. Expenses are the costs paid from that money.'
        },
        example: {
          title: 'Worked Example',
          body: 'If you earn 100 rand and spend 60 rand, you have 40 rand left.'
        },
        questions: [
          {
            type: 'numeric',
            prompt: 'If income is 120 and expenses are 75, how much remains?',
            expectedAnswer: '45',
            explanation: 'Subtract expenses from income: 120 - 75 = 45.',
            hintLevels: ['Use subtraction.', '120 minus 75 equals 45.'],
            difficulty: 'foundation'
          },
          {
            type: 'short-answer',
            prompt: 'What is money coming in called?',
            expectedAnswer: 'income',
            explanation: 'Income is the money received.',
            hintLevels: ['It is the opposite of expenses.', 'The answer is income.'],
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
    const lessonBlueprints = createLessonBlueprints(subjectName);
    const topics: Topic[] = lessonBlueprints.map((blueprint, lessonIndex) => {
      const topicId = `${subjectSlug}-topic-${lessonIndex + 1}`;
      const subtopicId = `${topicId}-subtopic-1`;
      const lessonId = `${subjectSlug}-lesson-${lessonIndex + 1}`;
      const lessonQuestions = blueprint.questions.map((question, questionIndex) =>
        createQuestion(lessonId, topicId, subtopicId, questionIndex, question)
      );

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
          body: `Before diving into rules, picture **${blueprint.topicName}** as one connected idea. The key is to see how the parts relate before memorising any steps. Once you have the big picture, the details fall into place.`
        },
        concepts: blueprint.deeperExplanation,
        guidedConstruction: blueprint.detailedSteps ?? {
          title: 'Guided Construction',
          body: `Let's work through **${blueprint.topicName}** step by step. Start by identifying what the problem is asking, then apply the rule and check your reasoning at each step.`
        },
        workedExample: blueprint.example,
        practicePrompt: {
          title: 'Active Practice',
          body: `Now try it yourself. Apply what you have learned about **${blueprint.topicName}** to a similar problem. Write out each step and explain your reasoning before checking the answer.`
        },
        commonMistakes: {
          title: 'Common Mistakes',
          body: `The most common error with **${blueprint.topicName}** is skipping the reasoning step and going straight to the answer. Always name the rule first, then apply it. Check your answer against what the problem asked.`
        },
        transferChallenge: {
          title: 'Transfer Challenge',
          body: `Can you apply **${blueprint.topicName}** in a different context? Think about where this pattern or rule shows up in a slightly different form. Identify the same core idea in a new situation.`
        },
        summary: {
          title: 'Summary',
          body: `**${blueprint.topicName} — key takeaways:**\n\n${blueprint.deeperExplanation.body.split('\n')[0]}\n\nIf you can explain this to someone else using one example, you've got it.`
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
