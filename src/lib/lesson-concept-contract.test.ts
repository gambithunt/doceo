import { describe, expect, it } from 'vitest';
import { validateConceptRecords } from '$lib/lesson-concept-contract';

const context = {
  topicTitle: 'Poetry and Prose Techniques',
  grade: 'Grade 10',
  subject: 'English Home Language'
};

function makeDiagnostic(prompt: string, correctText: string) {
  return {
    prompt,
    options: [
      { id: 'a', label: 'A', text: correctText },
      { id: 'b', label: 'B', text: 'It is a literal reading that misses what the example is doing.' },
      { id: 'c', label: 'C', text: 'It points to a different idea than the one shown in the example.' },
      { id: 'd', label: 'D', text: 'It does not fit the details given in the example.' }
    ],
    correct_option_id: 'a'
  };
}

describe('lesson-concept-contract', () => {
  it('rejects concepts missing simple_definition, example, explanation, or quick_check', () => {
    const result = validateConceptRecords(
      [
        {
          name: 'Metaphor',
          simple_definition: 'A comparison where one thing is described as another.',
          example: '“The classroom was a zoo.”',
          quick_check: 'What does calling the classroom a “zoo” suggest?',
          diagnostic: makeDiagnostic('What does calling the classroom a “zoo” suggest?', 'It suggests noise, chaos, and lack of control.')
        },
        {
          name: 'Imagery',
          simple_definition: 'Language that creates a sensory picture.',
          example: '“Cold rain tapped against the window.”',
          explanation: 'The phrase helps the reader hear and feel the scene.',
          quick_check: 'Which sense is strongest in this line?',
          diagnostic: makeDiagnostic('Which sense is strongest in this line?', 'Hearing')
        }
      ],
      context
    );

    expect(result.hardFailures).toContain('Concept 1 is missing required concept-contract fields.');
  });

  it('rejects banned meta-instruction language in concept content', () => {
    const result = validateConceptRecords(
      [
        {
          name: 'Metaphor',
          simple_definition: 'Identify the rule before you begin.',
          example: '“The classroom was a zoo.”',
          explanation: 'This helps you understand how to use the evidence.',
          quick_check: 'Show the first step.',
          diagnostic: makeDiagnostic('Show the first step.', 'State the rule first.')
        },
        {
          name: 'Imagery',
          simple_definition: 'Language that creates a sensory picture.',
          example: '“Cold rain tapped against the window.”',
          explanation: 'The phrase helps the reader hear and feel the scene.',
          quick_check: 'Which sense is strongest in this line?',
          diagnostic: makeDiagnostic('Which sense is strongest in this line?', 'Hearing')
        }
      ],
      context
    );

    expect(result.hardFailures.join(' ')).toMatch(/meta-instruction|generic/i);
  });

  it('rejects generic wrapper concept names', () => {
    const result = validateConceptRecords(
      [
        {
          name: 'Core Rule',
          simple_definition: 'A comparison where one thing is described as another.',
          example: '“The classroom was a zoo.”',
          explanation: 'This suggests noise, chaos, and lack of control.',
          quick_check: 'What does calling the classroom a “zoo” suggest?',
          diagnostic: makeDiagnostic('What does calling the classroom a “zoo” suggest?', 'This suggests noise, chaos, and lack of control.')
        },
        {
          name: 'Imagery',
          simple_definition: 'Language that creates a sensory picture.',
          example: '“Cold rain tapped against the window.”',
          explanation: 'The phrase helps the reader hear and feel the scene.',
          quick_check: 'Which sense is strongest in this line?',
          diagnostic: makeDiagnostic('Which sense is strongest in this line?', 'Hearing')
        }
      ],
      context
    );

    expect(result.hardFailures).toContain('concept 1 (Core Rule) uses a generic wrapper instead of a real concept name.');
  });

  it('rejects swap-friendly generic concept sets that are not grounded in the requested topic', () => {
    const result = validateConceptRecords(
      [
        {
          name: 'Language choice',
          simple_definition: 'Writers make choices to shape meaning for readers.',
          example: 'A writer chooses words carefully in a passage to create an effect.',
          explanation: 'These choices affect how a reader responds to the example.',
          quick_check: 'How do the choices affect the reader?',
          diagnostic: makeDiagnostic('How do the choices affect the reader?', 'They shape the reader’s response to the passage.')
        },
        {
          name: 'Careful structure',
          simple_definition: 'A text is organised in a way that guides the reader.',
          example: 'A writer arranges details to build an effect across the passage.',
          explanation: 'The structure changes how the reader experiences the text.',
          quick_check: 'What effect does the structure create?',
          diagnostic: makeDiagnostic('What effect does the structure create?', 'It changes how the reader experiences the text.')
        }
      ],
      context
    );

    expect(result.hardFailures.join(' ')).toMatch(/grounded|subject|topic/i);
  });

  it('rejects concept sets grounded in the wrong subject even when they are concrete', () => {
    const result = validateConceptRecords(
      [
        {
          name: 'Photosynthesis',
          simple_definition: 'Plants make food using sunlight.',
          example: 'A leaf uses sunlight, water, and carbon dioxide to make glucose.',
          explanation: 'This stores energy for the plant because light energy becomes chemical energy.',
          quick_check: 'What raw materials does the leaf use?',
          diagnostic: makeDiagnostic('What raw materials does the leaf use?', 'Sunlight, water, and carbon dioxide.')
        },
        {
          name: 'Chlorophyll',
          simple_definition: 'Chlorophyll is the green pigment that absorbs light energy.',
          example: 'Chlorophyll inside the chloroplast helps the plant capture sunlight.',
          explanation: 'This matters because the plant needs absorbed light for photosynthesis to happen.',
          quick_check: 'What job does chlorophyll do in the leaf?',
          diagnostic: makeDiagnostic('What job does chlorophyll do in the leaf?', 'It absorbs light energy for photosynthesis.')
        }
      ],
      context
    );

    expect(result.hardFailures.join(' ')).toMatch(/grounded|subject|topic/i);
  });

  it('rejects generic concept sets that borrow one subject anchor without real topic grounding', () => {
    const result = validateConceptRecords(
      [
        {
          name: 'Reader response',
          simple_definition: 'Writers choose words to shape how a reader responds in a poem.',
          example: 'In a poem, repeated words shape the reader response across the line.',
          explanation: 'This matters because the reader notices the effect more clearly.',
          quick_check: 'What response does the repeated wording create?',
          diagnostic: makeDiagnostic('What response does the repeated wording create?', 'It shapes how the reader responds to the line.')
        },
        {
          name: 'Text structure',
          simple_definition: 'A poem is arranged to guide the reader through ideas.',
          example: 'A poem places details in an order that changes the reader response.',
          explanation: 'The arrangement matters because it changes how the reader experiences the text.',
          quick_check: 'How does the arrangement change the reader response?',
          diagnostic: makeDiagnostic('How does the arrangement change the reader response?', 'It changes how the reader experiences the text.')
        }
      ],
      context
    );

    expect(result.hardFailures.join(' ')).toMatch(/grounded|subject|topic/i);
  });

  it('rejects a first concept that is too weak to open the lesson even when later concepts are stronger', () => {
    const result = validateConceptRecords(
      [
        {
          name: 'Metaphor',
          simple_definition: 'A metaphor is a type of language choice in writing.',
          example: 'Writers use metaphors in poems and stories.',
          explanation: 'This is part of how writers communicate.',
          quick_check: 'What is this idea about?',
          diagnostic: makeDiagnostic('What is this idea about?', 'It is about metaphor in writing.')
        },
        {
          name: 'Imagery',
          simple_definition: 'Language that creates a sensory picture.',
          example: '“Cold rain tapped against the window.”',
          explanation: 'The phrase helps the reader hear and feel the scene.',
          quick_check: 'Which sense is strongest in this line?',
          diagnostic: makeDiagnostic('Which sense is strongest in this line?', 'Hearing')
        }
      ],
      context
    );

    expect(result.hardFailures.join(' ')).toMatch(/opening|concept 1/i);
  });

  it('rejects legacy one_line_definition fields in external concept payloads', () => {
    const result = validateConceptRecords(
      [
        {
          name: 'Metaphor',
          one_line_definition: 'A comparison where one thing is described as another.',
          example: '“The classroom was a zoo.”',
          explanation: 'This suggests noise, chaos, and lack of control.',
          quick_check: 'What does calling the classroom a “zoo” suggest?',
          diagnostic: makeDiagnostic('What does calling the classroom a “zoo” suggest?', 'This suggests noise, chaos, and lack of control.')
        },
        {
          name: 'Imagery',
          simple_definition: 'Language that creates a sensory picture.',
          example: '“Cold rain tapped against the window.”',
          explanation: 'The phrase helps the reader hear and feel the scene.',
          quick_check: 'Which sense is strongest in this line?',
          diagnostic: makeDiagnostic('Which sense is strongest in this line?', 'Hearing')
        }
      ],
      context
    );

    expect(result.hardFailures).toContain('Concept 1 is missing required concept-contract fields.');
  });

  it('rejects placeholder or slot-style concept labels', () => {
    const result = validateConceptRecords(
      [
        {
          name: 'Ai-Suggested Topic',
          simple_definition: 'Personal identity is the main idea that stays true across examples.',
          example: 'A teenager values honesty at school, at home, and with friends.',
          explanation: 'This matters because the same value shapes the learner’s choices in different settings.',
          quick_check: 'Which value stays visible in all three settings?',
          diagnostic: makeDiagnostic('Which value stays visible in all three settings?', 'Honesty')
        },
        {
          name: 'Understanding Personal Identity Example',
          simple_definition: 'A worked case shows how the topic works in context.',
          example: 'A learner joins a new team and notices how friends and family influence the way they present themselves.',
          explanation: 'The case matters because it shows personal identity changing across relationships and settings.',
          quick_check: 'Which influence is strongest in this case?',
          diagnostic: makeDiagnostic('Which influence is strongest in this case?', 'The new friend group')
        }
      ],
      {
        topicTitle: 'Understanding Personal Identity',
        grade: 'Grade 11',
        subject: 'Life Orientation'
      }
    );

    expect(result.hardFailures.join(' ')).toMatch(/wrapper|concept name|slot/i);
  });

  it('rejects science fallback placeholders that repeat fake labels as examples', () => {
    const result = validateConceptRecords(
      [
        {
          name: 'Exploration Candidate',
          simple_definition: 'Exploration Candidate is the main idea that stays true across examples in Plant Reproduction And Growth.',
          example: 'Exploration candidate',
          explanation: 'The example shows what stays true when the topic is applied correctly.',
          quick_check: 'What stays the same in this plant reproduction and growth example?',
          diagnostic: makeDiagnostic(
            'What stays the same in this plant reproduction and growth example?',
            'The same main idea stays true across examples.'
          )
        },
        {
          name: 'Real-world case',
          simple_definition: 'Real-world case shows how Plant Reproduction And Growth works in a concrete case.',
          example: 'Exploration candidate',
          explanation: 'The worked example turns the principle into something the learner can use accurately.',
          quick_check: 'How is the central idea used in this plant reproduction and growth example?',
          diagnostic: makeDiagnostic(
            'How is the central idea used in this plant reproduction and growth example?',
            'The central idea is applied in the concrete case.'
          )
        }
      ],
      {
        topicTitle: 'Plant Reproduction And Growth',
        grade: 'Grade 11',
        subject: 'Life Sciences'
      }
    );

    expect(result.hardFailures.join(' ')).toMatch(/wrapper|concrete topic-shaped example|opening/i);
  });

  it('accepts a concrete plant reproduction opening concept', () => {
    const result = validateConceptRecords(
      [
        {
          name: 'Pollination',
          simple_definition: 'Pollination is the transfer of pollen from the anther to the stigma of a flower.',
          example: 'A bee carries pollen from the anther of one flower to the stigma of another flower.',
          explanation: 'This matters because pollination allows the flower to begin the process that can lead to seed formation.',
          quick_check: 'Which part of the flower receives pollen during pollination?',
          diagnostic: makeDiagnostic('Which part of the flower receives pollen during pollination?', 'The stigma')
        },
        {
          name: 'Fertilisation',
          simple_definition: 'Fertilisation happens when the male cell from pollen joins with the egg cell in the ovule.',
          example: 'After pollen reaches the stigma, a male cell joins with an egg cell inside the ovule.',
          explanation: 'This joining forms the start of a new plant because it creates the fertilised cell that can develop into a seed.',
          quick_check: 'What joins together during fertilisation in a flowering plant?',
          diagnostic: makeDiagnostic(
            'What joins together during fertilisation in a flowering plant?',
            'The male cell from pollen and the egg cell'
          )
        }
      ],
      {
        topicTitle: 'Plant Reproduction And Growth',
        grade: 'Grade 11',
        subject: 'Life Sciences'
      }
    );

    expect(result.hardFailures).toEqual([]);
  });

  it('rejects examples that are really learner instructions', () => {
    const result = validateConceptRecords(
      [
        {
          name: 'Metaphor',
          simple_definition: 'A metaphor describes one thing as another.',
          example: 'Quote the technique, identify the author’s purpose, and analyse the effect on the reader.',
          explanation: 'This matters because it shows the writer’s intended effect clearly.',
          quick_check: 'What effect does the metaphor create?',
          diagnostic: makeDiagnostic('What effect does the metaphor create?', 'It creates a clear effect for the reader.')
        },
        {
          name: 'Imagery',
          simple_definition: 'Language that creates a sensory picture.',
          example: '“Cold rain tapped against the window.”',
          explanation: 'The phrase helps the reader hear and feel the scene.',
          quick_check: 'Which sense is strongest in this line?',
          diagnostic: makeDiagnostic('Which sense is strongest in this line?', 'Hearing')
        }
      ],
      context
    );

    expect(result.hardFailures.join(' ')).toMatch(/concrete topic-shaped example|instruction/i);
  });

  it('rejects external concept payloads that omit the diagnostic block', () => {
    const result = validateConceptRecords(
      [
        {
          name: 'Metaphor',
          simple_definition: 'A comparison where one thing is described as another.',
          example: '“The classroom was a zoo.”',
          explanation: 'This suggests noise, chaos, and lack of control.',
          quick_check: 'What does calling the classroom a “zoo” suggest?'
        },
        {
          name: 'Imagery',
          simple_definition: 'Language that creates a sensory picture.',
          example: '“Cold rain tapped against the window.”',
          explanation: 'The phrase helps the reader hear and feel the scene.',
          quick_check: 'Which sense is strongest in this line?',
          diagnostic: makeDiagnostic('Which sense is strongest in this line?', 'Hearing')
        }
      ],
      context
    );

    expect(result.hardFailures).toContain('Concept 1 is missing required concept-contract fields.');
  });

  it('rejects malformed diagnostic blocks even when the concept text looks valid', () => {
    const result = validateConceptRecords(
      [
        {
          name: 'Metaphor',
          simple_definition: 'A comparison where one thing is described as another.',
          example: '“The classroom was a zoo.”',
          explanation: 'This suggests noise, chaos, and lack of control.',
          quick_check: 'What does calling the classroom a “zoo” suggest?',
          diagnostic: {
            prompt: 'What does calling the classroom a “zoo” suggest?',
            options: [
              { id: 'a', label: 'A', text: 'This suggests noise, chaos, and lack of control.' },
              { id: 'a', label: 'A', text: 'This suggests noise, chaos, and lack of control.' }
            ],
            correct_option_id: 'z'
          }
        },
        {
          name: 'Imagery',
          simple_definition: 'Language that creates a sensory picture.',
          example: '“Cold rain tapped against the window.”',
          explanation: 'The phrase helps the reader hear and feel the scene.',
          quick_check: 'Which sense is strongest in this line?',
          diagnostic: makeDiagnostic('Which sense is strongest in this line?', 'Hearing')
        }
      ],
      context
    );

    expect(result.hardFailures.join(' ')).toMatch(/diagnostic/i);
  });

  it('accepts topic-shaped concepts and maps them into ConceptItem', () => {
    const result = validateConceptRecords(
      [
        {
          name: 'Metaphor',
          simple_definition: 'A comparison where one thing is described as another.',
          example: '“The classroom was a zoo.”',
          explanation: 'This suggests noise, chaos, and lack of control.',
          quick_check: 'What does calling the classroom a “zoo” suggest?',
          diagnostic: makeDiagnostic('What does calling the classroom a “zoo” suggest?', 'This suggests noise, chaos, and lack of control.')
        },
        {
          name: 'Imagery',
          simple_definition: 'Language that creates a sensory picture.',
          example: '“Cold rain tapped against the window.”',
          explanation: 'The phrase helps the reader hear and feel the scene.',
          quick_check: 'Which sense is strongest in this line?',
          diagnostic: makeDiagnostic('Which sense is strongest in this line?', 'Hearing')
        }
      ],
      context
    );

    expect(result.hardFailures).toEqual([]);
    expect(result.softFailures).toEqual([]);
    expect(result.concepts[0]).toEqual(
      expect.objectContaining({
        name: 'Metaphor',
        summary: 'A comparison where one thing is described as another.',
        detail: 'This suggests noise, chaos, and lack of control.',
        example: '“The classroom was a zoo.”',
        simpleDefinition: 'A comparison where one thing is described as another.',
        explanation: 'This suggests noise, chaos, and lack of control.',
        quickCheck: 'What does calling the classroom a “zoo” suggest?',
        diagnostic: expect.objectContaining({
          prompt: 'What does calling the classroom a “zoo” suggest?',
          correctOptionId: 'a'
        })
      })
    );
  });

  it('accepts a strong opening concept that teaches immediately', () => {
    const result = validateConceptRecords(
      [
        {
          name: 'Metaphor',
          simple_definition: 'A metaphor describes one thing as another.',
          example: '“The moon was a ghostly galleon.”',
          explanation: 'Calling the moon a “ghostly galleon” makes it feel strange, distant, and dramatic.',
          quick_check: 'What does calling the moon a “ghostly galleon” suggest?',
          diagnostic: makeDiagnostic('What does calling the moon a “ghostly galleon” suggest?', 'Calling the moon a “ghostly galleon” makes it feel strange, distant, and dramatic.')
        },
        {
          name: 'Imagery',
          simple_definition: 'Language that creates a sensory picture.',
          example: '“Cold rain tapped against the window.”',
          explanation: 'The phrase helps the reader hear and feel the scene.',
          quick_check: 'Which sense is strongest in this line?',
          diagnostic: makeDiagnostic('Which sense is strongest in this line?', 'Hearing')
        }
      ],
      context
    );

    expect(result.hardFailures).toEqual([]);
    expect(result.concepts[0]).toEqual(
      expect.objectContaining({
        simpleDefinition: expect.stringMatching(/\w{4,}/),
        example: expect.stringMatching(/\w{4,}/),
        explanation: expect.stringMatching(/\w{4,}/),
        quickCheck: expect.stringMatching(/\?$/)
      })
    );
  });

  it('accepts an opening concept that meets the learner boundary without requiring exact prose', () => {
    const result = validateConceptRecords(
      [
        {
          name: 'Repetition',
          simple_definition: 'Repetition is when a writer repeats a word or phrase to make it stand out.',
          example: '“Never, never, never give up.”',
          explanation: 'Repeating “never” makes the line sound forceful and stubborn, so the reader hears the speaker’s determination clearly.',
          quick_check: 'Which repeated word makes the speaker sound forceful?',
          diagnostic: makeDiagnostic('Which repeated word makes the speaker sound forceful?', 'Never')
        },
        {
          name: 'Tone',
          simple_definition: 'Tone is the attitude a writer or speaker creates through word choice.',
          example: '“The room sat silent and watchful.”',
          explanation: 'The words make the room feel tense and uneasy, which shapes how the reader reads the moment.',
          quick_check: 'What tone do the words “silent and watchful” create?',
          diagnostic: makeDiagnostic('What tone do the words “silent and watchful” create?', 'Tense and uneasy')
        }
      ],
      context
    );

    expect(result.hardFailures).toEqual([]);
    expect(result.concepts[0]).toEqual(
      expect.objectContaining({
        name: 'Repetition',
        simpleDefinition: expect.stringContaining('repeats'),
        example: expect.stringContaining('Never'),
        explanation: expect.stringMatching(/forceful|determination/i),
        quickCheck: expect.stringMatching(/Which repeated word/i)
      })
    );
  });
});
