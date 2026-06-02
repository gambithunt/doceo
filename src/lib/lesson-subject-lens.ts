export type GradeBand = 'foundation' | 'intermediate' | 'senior';

export function getGradeBand(grade: string): GradeBand {
  const match = grade.match(/\d+/);
  const num = match ? parseInt(match[0], 10) : 8;
  if (num <= 6) return 'foundation';
  if (num <= 9) return 'intermediate';
  return 'senior';
}

export function getSubjectLens(subjectName: string, grade?: string): {
  conceptWord: string;
  actionWord: string;
  evidenceWord: string;
  example: string;
  misconception: string;
} {
  const lower = subjectName.toLowerCase();
  const band: GradeBand = grade ? getGradeBand(grade) : 'intermediate';

  if (lower.includes('math')) {
    if (band === 'foundation') {
      return {
        conceptWord: 'rule or number relationship',
        actionWord: 'work through it step by step using whole numbers',
        evidenceWord: 'worked steps using concrete numbers',
        example: 'Use a short sequence of whole numbers, name the rule (e.g. "add 4 each time"), then apply it.',
        misconception: 'writing only the answer without showing the steps or naming the rule'
      };
    }
    if (band === 'intermediate') {
      return {
        conceptWord: 'rule or algebraic relationship',
        actionWord: 'set up the equation or expression and solve step by step',
        evidenceWord: 'worked solution with each step labelled',
        example: 'Use a simple equation, identify what operation to undo, apply it to both sides, and check by substitution.',
        misconception: 'jumping to the answer without showing inverse operations or checking the solution'
      };
    }
    return {
      conceptWord: 'theorem, function, or formal relationship',
      actionWord: 'state the definition, apply it formally, and verify with justification',
      evidenceWord: 'full worked solution with each step justified',
      example: 'State the theorem or formula first, substitute values clearly, simplify step by step, and confirm the answer satisfies the original equation or domain.',
      misconception: 'substituting values without understanding which theorem or function applies, or skipping the verification step'
    };
  }

  if (lower.includes('language') || lower.includes('english') || lower.includes('afrikaans') || lower.includes('isizulu') || lower.includes('isixhosa') || lower.includes('sesotho')) {
    if (band === 'foundation') {
      return {
        conceptWord: 'language feature',
        actionWord: 'find it in the sentence and explain in simple terms what it does',
        evidenceWord: 'a short sentence from everyday writing',
        example: 'Point to the exact word or phrase, name the feature, and say what it tells the reader.',
        misconception: 'naming the term without showing where it appears in the sentence or what it does'
      };
    }
    if (band === 'intermediate') {
      return {
        conceptWord: 'language or literary device',
        actionWord: 'identify it in the text, name it, and explain the effect it creates',
        evidenceWord: 'a short passage or direct quote from a text',
        example: 'Quote the relevant words, name the device, and explain in one sentence how it affects the reader or meaning.',
        misconception: 'identifying the device without explaining why the author used it or what effect it creates'
      };
    }
    return {
      conceptWord: 'rhetorical or literary technique',
      actionWord: 'analyse how it is used deliberately to achieve a purpose in context',
      evidenceWord: 'a specific passage and its effect on meaning, tone, or audience',
      example: 'Quote the technique, identify the author\'s purpose, and analyse how word choice or structure creates that effect for the specific audience.',
      misconception: 'describing what the technique is without analysing why it achieves that particular effect in this specific context'
    };
  }

  if (lower.includes('life science') || lower.includes('biology')) {
    return {
      conceptWord: 'biological process or structure',
      actionWord: 'name the structure, describe the process, and connect it to a function in the organism',
      evidenceWord: 'a diagram reference, organism example, or experimental observation',
      example: 'Name the structure, describe what it does at a cellular or organ level, and connect it to how the whole organism benefits.',
      misconception: 'naming the structure without explaining what it does or why the organism needs it'
    };
  }

  if (lower.includes('physical science') || lower.includes('physics') || lower.includes('chemistry')) {
    return {
      conceptWord: 'law, formula, or physical principle',
      actionWord: 'state the law, identify the variables with units, and apply the formula step by step',
      evidenceWord: 'a worked calculation with SI units clearly shown at every step',
      example: 'Write the formula, substitute values with units, simplify, and state the final answer with its unit.',
      misconception: 'substituting numbers into a formula without understanding what each variable represents or omitting units'
    };
  }

  if (lower.includes('history')) {
    return {
      conceptWord: 'historical cause, event, or consequence',
      actionWord: 'identify the event, explain why it happened, and connect it to its consequence',
      evidenceWord: 'a primary source, dated event, or historian\'s argument',
      example: 'State the event with its date, explain the cause (political, economic, or social), and trace one direct consequence.',
      misconception: 'describing what happened without explaining why, or listing facts without connecting cause to effect'
    };
  }

  if (lower.includes('geography')) {
    return {
      conceptWord: 'spatial pattern or physical/human process',
      actionWord: 'name the process, describe where it occurs, and explain what causes it',
      evidenceWord: 'a map reference, data set, or field observation',
      example: 'Identify the location, describe the pattern using directional or spatial language, and link it to a physical or human process.',
      misconception: 'describing a location without explaining the process that created the pattern or why it occurs there'
    };
  }

  if (lower.includes('account') || lower.includes('business') || lower.includes('economics') || lower.includes('ems') || lower.includes('economic and management')) {
    return {
      conceptWord: 'financial concept or economic principle',
      actionWord: 'define the concept, apply it to a transaction or scenario, and show the calculation or effect',
      evidenceWord: 'a transaction record, financial statement, or worked example with figures',
      example: 'Name the concept, show a real transaction or calculation with actual figures, and explain what the result tells the decision-maker.',
      misconception: 'using the term correctly in a definition but failing to apply it to a real calculation or scenario'
    };
  }

  if (lower.includes('technology') || lower.includes('computer') || lower.includes('information technology') || lower.includes('cat')) {
    return {
      conceptWord: 'system component or algorithm step',
      actionWord: 'name the component, describe its function, and trace the data or information flow through the system',
      evidenceWord: 'an input-process-output diagram, data trace, or annotated code example',
      example: 'Draw or describe the system boundary, label each component, and follow one piece of data from input through processing to output.',
      misconception: 'describing hardware or software in isolation without showing how it connects to and depends on other parts of the system'
    };
  }

  if (lower.includes('creative') || lower.includes('visual art') || lower.includes('music') || lower.includes('drama') || lower.includes('dance')) {
    return {
      conceptWord: 'design element or compositional technique',
      actionWord: 'identify the element, describe how the artist used it, and explain the effect it creates',
      evidenceWord: 'a specific artwork, composition, or performance example with direct reference',
      example: 'Name the element (e.g. line, rhythm, contrast), show exactly where it appears in the work, and explain what mood or meaning it creates for the audience.',
      misconception: 'naming the design element without explaining how the artist used it intentionally to create a specific effect'
    };
  }

  if (lower.includes('social') || lower.includes('life orientation') || lower.includes('lo')) {
    return {
      conceptWord: 'social concept or personal development principle',
      actionWord: 'define the concept, connect it to a real-life example, and explain why it matters',
      evidenceWord: 'a current event, case study, or relatable personal scenario',
      example: 'Define the concept, give one real-world or personal scenario where it applies, and explain the consequence of ignoring it.',
      misconception: 'listing facts or definitions without connecting them to real causes, consequences, or personal relevance'
    };
  }

  return {
    conceptWord: 'core idea',
    actionWord: 'identify the idea, explain it clearly, and apply it to one concrete example',
    evidenceWord: 'one concrete, worked example',
    example: 'Use a familiar example from the subject, apply the idea step by step, and explain why each step is correct.',
    misconception: 'repeating a keyword or definition without demonstrating understanding through an example or explanation'
  };
}
