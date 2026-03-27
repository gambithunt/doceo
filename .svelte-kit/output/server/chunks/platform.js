import { b as getCurriculumsByCountry, c as getGradesByCurriculum, d as getSubjectsByCurriculumAndGrade, g as getRecommendedSubject, a as getSelectionMode, o as onboardingCountries, e as defaultTerm, f as defaultSchoolYear, h as onboardingStepOrder } from "./onboarding.js";
import { b as buildLearningProgram } from "./learning-content.js";
const LESSON_STAGE_ORDER = [
  "orientation",
  "concepts",
  "construction",
  "examples",
  "practice",
  "check",
  "complete"
];
const LESSON_STAGE_ICONS = {
  orientation: "◎",
  concepts: "◈",
  construction: "◉",
  examples: "◇",
  practice: "◆",
  check: "△"
};
const LESSON_STAGE_LABELS = {
  orientation: "Orientation",
  concepts: "Key Concepts",
  construction: "Guided Construction",
  examples: "Worked Example",
  practice: "Active Practice",
  check: "Check Understanding",
  complete: "Complete"
};
function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
function toTopicLabel(value) {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return "Core Ideas";
  }
  return trimmed.replace(/\s+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function getGradeBand(grade) {
  const match = grade.match(/\d+/);
  const num = match ? parseInt(match[0], 10) : 8;
  if (num <= 6) return "foundation";
  if (num <= 9) return "intermediate";
  return "senior";
}
function getSubjectLens(subjectName, grade) {
  const lower = subjectName.toLowerCase();
  const band = grade ? getGradeBand(grade) : "intermediate";
  if (lower.includes("math")) {
    if (band === "foundation") {
      return {
        conceptWord: "rule or number relationship",
        actionWord: "work through it step by step using whole numbers",
        evidenceWord: "worked steps using concrete numbers",
        example: 'Use a short sequence of whole numbers, name the rule (e.g. "add 4 each time"), then apply it.',
        misconception: "writing only the answer without showing the steps or naming the rule"
      };
    }
    if (band === "intermediate") {
      return {
        conceptWord: "rule or algebraic relationship",
        actionWord: "set up the equation or expression and solve step by step",
        evidenceWord: "worked solution with each step labelled",
        example: "Use a simple equation, identify what operation to undo, apply it to both sides, and check by substitution.",
        misconception: "jumping to the answer without showing inverse operations or checking the solution"
      };
    }
    return {
      conceptWord: "theorem, function, or formal relationship",
      actionWord: "state the definition, apply it formally, and verify with justification",
      evidenceWord: "full worked solution with each step justified",
      example: "State the theorem or formula first, substitute values clearly, simplify step by step, and confirm the answer satisfies the original equation or domain.",
      misconception: "substituting values without understanding which theorem or function applies, or skipping the verification step"
    };
  }
  if (lower.includes("language") || lower.includes("english") || lower.includes("afrikaans") || lower.includes("isizulu") || lower.includes("isixhosa") || lower.includes("sesotho")) {
    if (band === "foundation") {
      return {
        conceptWord: "language feature",
        actionWord: "find it in the sentence and explain in simple terms what it does",
        evidenceWord: "a short sentence from everyday writing",
        example: "Point to the exact word or phrase, name the feature, and say what it tells the reader.",
        misconception: "naming the term without showing where it appears in the sentence or what it does"
      };
    }
    if (band === "intermediate") {
      return {
        conceptWord: "language or literary device",
        actionWord: "identify it in the text, name it, and explain the effect it creates",
        evidenceWord: "a short passage or direct quote from a text",
        example: "Quote the relevant words, name the device, and explain in one sentence how it affects the reader or meaning.",
        misconception: "identifying the device without explaining why the author used it or what effect it creates"
      };
    }
    return {
      conceptWord: "rhetorical or literary technique",
      actionWord: "analyse how it is used deliberately to achieve a purpose in context",
      evidenceWord: "a specific passage and its effect on meaning, tone, or audience",
      example: "Quote the technique, identify the author's purpose, and analyse how word choice or structure creates that effect for the specific audience.",
      misconception: "describing what the technique is without analysing why it achieves that particular effect in this specific context"
    };
  }
  if (lower.includes("life science") || lower.includes("biology")) {
    return {
      conceptWord: "biological process or structure",
      actionWord: "name the structure, describe the process, and connect it to a function in the organism",
      evidenceWord: "a diagram reference, organism example, or experimental observation",
      example: "Name the structure, describe what it does at a cellular or organ level, and connect it to how the whole organism benefits.",
      misconception: "naming the structure without explaining what it does or why the organism needs it"
    };
  }
  if (lower.includes("physical science") || lower.includes("physics") || lower.includes("chemistry")) {
    return {
      conceptWord: "law, formula, or physical principle",
      actionWord: "state the law, identify the variables with units, and apply the formula step by step",
      evidenceWord: "a worked calculation with SI units clearly shown at every step",
      example: "Write the formula, substitute values with units, simplify, and state the final answer with its unit.",
      misconception: "substituting numbers into a formula without understanding what each variable represents or omitting units"
    };
  }
  if (lower.includes("history")) {
    return {
      conceptWord: "historical cause, event, or consequence",
      actionWord: "identify the event, explain why it happened, and connect it to its consequence",
      evidenceWord: "a primary source, dated event, or historian's argument",
      example: "State the event with its date, explain the cause (political, economic, or social), and trace one direct consequence.",
      misconception: "describing what happened without explaining why, or listing facts without connecting cause to effect"
    };
  }
  if (lower.includes("geography")) {
    return {
      conceptWord: "spatial pattern or physical/human process",
      actionWord: "name the process, describe where it occurs, and explain what causes it",
      evidenceWord: "a map reference, data set, or field observation",
      example: "Identify the location, describe the pattern using directional or spatial language, and link it to a physical or human process.",
      misconception: "describing a location without explaining the process that created the pattern or why it occurs there"
    };
  }
  if (lower.includes("account") || lower.includes("business") || lower.includes("economics") || lower.includes("ems") || lower.includes("economic and management")) {
    return {
      conceptWord: "financial concept or economic principle",
      actionWord: "define the concept, apply it to a transaction or scenario, and show the calculation or effect",
      evidenceWord: "a transaction record, financial statement, or worked example with figures",
      example: "Name the concept, show a real transaction or calculation with actual figures, and explain what the result tells the decision-maker.",
      misconception: "using the term correctly in a definition but failing to apply it to a real calculation or scenario"
    };
  }
  if (lower.includes("technology") || lower.includes("computer") || lower.includes("information technology") || lower.includes("cat")) {
    return {
      conceptWord: "system component or algorithm step",
      actionWord: "name the component, describe its function, and trace the data or information flow through the system",
      evidenceWord: "an input-process-output diagram, data trace, or annotated code example",
      example: "Draw or describe the system boundary, label each component, and follow one piece of data from input through processing to output.",
      misconception: "describing hardware or software in isolation without showing how it connects to and depends on other parts of the system"
    };
  }
  if (lower.includes("creative") || lower.includes("visual art") || lower.includes("music") || lower.includes("drama") || lower.includes("dance")) {
    return {
      conceptWord: "design element or compositional technique",
      actionWord: "identify the element, describe how the artist used it, and explain the effect it creates",
      evidenceWord: "a specific artwork, composition, or performance example with direct reference",
      example: "Name the element (e.g. line, rhythm, contrast), show exactly where it appears in the work, and explain what mood or meaning it creates for the audience.",
      misconception: "naming the design element without explaining how the artist used it intentionally to create a specific effect"
    };
  }
  if (lower.includes("social") || lower.includes("life orientation") || lower.includes("lo")) {
    return {
      conceptWord: "social concept or personal development principle",
      actionWord: "define the concept, connect it to a real-life example, and explain why it matters",
      evidenceWord: "a current event, case study, or relatable personal scenario",
      example: "Define the concept, give one real-world or personal scenario where it applies, and explain the consequence of ignoring it.",
      misconception: "listing facts or definitions without connecting them to real causes, consequences, or personal relevance"
    };
  }
  return {
    conceptWord: "core idea",
    actionWord: "identify the idea, explain it clearly, and apply it to one concrete example",
    evidenceWord: "one concrete, worked example",
    example: "Use a familiar example from the subject, apply the idea step by step, and explain why each step is correct.",
    misconception: "repeating a keyword or definition without demonstrating understanding through an example or explanation"
  };
}
function isoNow$1() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}
function getStageNumber(stage) {
  const index = LESSON_STAGE_ORDER.indexOf(stage);
  return index === -1 ? 1 : Math.min(index + 1, 6);
}
function getNextStage(stage) {
  const index = LESSON_STAGE_ORDER.indexOf(stage);
  if (index === -1 || index >= LESSON_STAGE_ORDER.length - 1) {
    return null;
  }
  return LESSON_STAGE_ORDER[index + 1];
}
function getStageIcon(stage) {
  if (stage === "complete") {
    return "✓";
  }
  return LESSON_STAGE_ICONS[stage];
}
function getStageLabel(stage) {
  return LESSON_STAGE_LABELS[stage];
}
function classifyLessonMessage(text) {
  const lower = text.toLowerCase().trim();
  const isQuestion = text.includes("?") || lower.startsWith("what") || lower.startsWith("why") || lower.startsWith("how") || lower.startsWith("can you") || lower.startsWith("could you") || lower.startsWith("explain") || lower.startsWith("i don't understand") || lower.startsWith("i dont understand") || lower.startsWith("what do you mean") || lower.startsWith("tell me more about");
  return isQuestion ? "question" : "response";
}
function createDefaultLearnerProfile(studentId) {
  const timestamp = isoNow$1();
  return {
    studentId,
    analogies_preference: 0.5,
    step_by_step: 0.5,
    visual_learner: 0.5,
    real_world_examples: 0.5,
    abstract_thinking: 0.5,
    needs_repetition: 0.5,
    quiz_performance: 0.5,
    total_sessions: 0,
    total_questions_asked: 0,
    total_reteach_events: 0,
    concepts_struggled_with: [],
    concepts_excelled_at: [],
    subjects_studied: [],
    created_at: timestamp,
    last_updated_at: timestamp
  };
}
function updateLearnerProfile(profile, update, options) {
  const alpha = 0.3;
  const next = {
    ...profile,
    last_updated_at: isoNow$1()
  };
  const signals = [
    "analogies_preference",
    "step_by_step",
    "visual_learner",
    "real_world_examples",
    "abstract_thinking",
    "needs_repetition",
    "quiz_performance"
  ];
  for (const signal of signals) {
    const value = update[signal];
    if (typeof value === "number") {
      next[signal] = clamp01((1 - alpha) * next[signal] + alpha * value);
    }
  }
  const MAX_CONCEPT_LIST = 25;
  if (update.struggled_with?.length) {
    const merged = Array.from(/* @__PURE__ */ new Set([...update.struggled_with, ...next.concepts_struggled_with]));
    next.concepts_struggled_with = merged.slice(0, MAX_CONCEPT_LIST);
  }
  if (update.excelled_at?.length) {
    const merged = Array.from(/* @__PURE__ */ new Set([...update.excelled_at, ...next.concepts_excelled_at]));
    next.concepts_excelled_at = merged.slice(0, MAX_CONCEPT_LIST);
  }
  if (options?.subjectName) {
    next.subjects_studied = Array.from(/* @__PURE__ */ new Set([...next.subjects_studied, options.subjectName]));
  }
  if (options?.incrementQuestions) {
    next.total_questions_asked += 1;
  }
  if (options?.incrementReteach) {
    next.total_reteach_events += 1;
  }
  return next;
}
function buildStageStartMessage(stage) {
  return {
    id: `msg-${crypto.randomUUID()}`,
    role: "system",
    type: "stage_start",
    content: `${getStageIcon(stage)} ${getStageLabel(stage)}`,
    stage,
    timestamp: isoNow$1(),
    metadata: null
  };
}
function getLessonSectionForStage(lesson, stage) {
  if (stage === "orientation") return lesson.orientation.body;
  if (stage === "concepts") return lesson.concepts.body;
  if (stage === "construction") return lesson.guidedConstruction.body;
  if (stage === "examples") return lesson.workedExample.body;
  if (stage === "practice") return lesson.practicePrompt.body;
  if (stage === "check") return lesson.commonMistakes.body;
  if (stage === "complete") return lesson.summary.body;
  return lesson.concepts.body;
}
function buildInitialLessonMessages(lesson, stage) {
  const defaultMeta = {
    action: "stay",
    next_stage: null,
    reteach_style: null,
    reteach_count: 0,
    confidence_assessment: 0.5,
    profile_update: {}
  };
  if (stage === "concepts") {
    const messages = [
      buildStageStartMessage(stage),
      {
        id: `msg-${crypto.randomUUID()}`,
        role: "assistant",
        type: "teaching",
        content: lesson.mentalModel.body,
        stage,
        timestamp: isoNow$1(),
        metadata: defaultMeta
      },
      {
        id: `msg-${crypto.randomUUID()}`,
        role: "assistant",
        type: "teaching",
        content: `${lesson.concepts.body}

What feels clear so far? Tell me where you want to slow down.`,
        stage,
        timestamp: isoNow$1(),
        metadata: defaultMeta
      }
    ];
    if (lesson.keyConcepts && lesson.keyConcepts.length > 0) {
      messages.push({
        id: `msg-${crypto.randomUUID()}`,
        role: "system",
        type: "concept_cards",
        content: "Tap any concept to explore it in depth",
        stage,
        timestamp: isoNow$1(),
        metadata: null,
        conceptItems: lesson.keyConcepts
      });
    }
    return messages;
  }
  if (stage === "check") {
    return [
      buildStageStartMessage(stage),
      {
        id: `msg-${crypto.randomUUID()}`,
        role: "assistant",
        type: "teaching",
        content: `${lesson.practicePrompt.body}

Put it in your own words. What would you say is the main idea here?`,
        stage,
        timestamp: isoNow$1(),
        metadata: defaultMeta
      },
      {
        id: `msg-${crypto.randomUUID()}`,
        role: "system",
        type: "feedback",
        content: lesson.commonMistakes.body,
        stage,
        timestamp: isoNow$1(),
        metadata: null
      }
    ];
  }
  const intro = getLessonSectionForStage(lesson, stage);
  const closingPrompt = stage === "orientation" ? "Does this connect for you? Ask me anything — or tell me what stands out." : "What feels clear so far? Tell me where you want to slow down.";
  return [
    buildStageStartMessage(stage),
    {
      id: `msg-${crypto.randomUUID()}`,
      role: "assistant",
      type: "teaching",
      content: `${intro}

${closingPrompt}`,
      stage,
      timestamp: isoNow$1(),
      metadata: defaultMeta
    }
  ];
}
function buildLessonSessionFromTopic(profile, subject, topic, subtopic, lesson, overrides) {
  return {
    id: `lesson-session-${crypto.randomUUID()}`,
    studentId: profile.id,
    subjectId: subject.id,
    subject: subject.name,
    topicId: topic.id,
    topicTitle: topic.name,
    topicDescription: overrides?.topicDescription ?? subtopic.name,
    curriculumReference: overrides?.curriculumReference ?? `${lesson.grade} · ${lesson.title}`,
    matchedSection: overrides?.matchedSection ?? topic.name,
    lessonId: lesson.id,
    currentStage: "orientation",
    stagesCompleted: [],
    messages: buildInitialLessonMessages(lesson, "orientation"),
    questionCount: 0,
    reteachCount: 0,
    confidenceScore: 0.5,
    needsTeacherReview: false,
    stuckConcept: null,
    startedAt: isoNow$1(),
    lastActiveAt: isoNow$1(),
    completedAt: null,
    status: "active",
    profileUpdates: []
  };
}
function buildDynamicLessonFromTopic(input) {
  const topicTitle = toTopicLabel(input.topicTitle);
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
    title: `${input.subjectName}: ${topicTitle}`,
    orientation: {
      title: "Orientation",
      body: `In this lesson you're exploring **${topicTitle}** in ${input.subjectName} (${input.grade}). By the end you should be able to name the key ${lens.conceptWord}, explain how it works, and apply it to a real example. This topic matters because it unlocks a core pattern you'll use again and again.`
    },
    mentalModel: {
      title: "Big Picture",
      body: `Think of **${topicTitle}** as a lens that helps you see patterns in ${input.subjectName}. Before diving into rules, picture the overall shape of the idea: there is a ${lens.conceptWord} at the centre, a process that connects things, and a way to check if you've applied it correctly. Hold that picture in mind as we build the details.`
    },
    concepts: {
      title: "Key Concepts",
      body: `The main ${lens.conceptWord} in **${topicTitle}** is what holds the idea together. To understand ${topicTitle} in ${input.subjectName}, you need to ${lens.actionWord}. Focus on no more than three core ideas at once: (1) what ${topicTitle} is, (2) why the rule works, and (3) when to apply it. Avoid ${lens.misconception}.`
    },
    guidedConstruction: {
      title: "Guided Construction",
      body: `Here is how to think through **${topicTitle}** step by step:

**Step 1.** Read the problem and identify the ${lens.conceptWord} you are working with.

**Step 2.** Write down what you know and what you need to find.

**Step 3.** Apply the rule: ${lens.actionWord}.

**Step 4.** Check your reasoning — does your answer match the ${lens.evidenceWord}? Have you avoided ${lens.misconception}?

Narrate each decision as you go. The goal is to make your thinking visible.`
    },
    workedExample: {
      title: "Worked Example",
      body: `**Example — ${topicTitle} in ${input.subjectName}:**

${lens.example}

Notice how each step stays connected to the rule for ${topicTitle}. The key move is to name the ${lens.conceptWord} first, then apply it. Avoid ${lens.misconception} — always justify each step before writing the answer.`
    },
    practicePrompt: {
      title: "Active Practice",
      body: `Now it's your turn. Try applying **${topicTitle}** to a similar problem. Attempt it first before checking. Write out each step and explain why you made each move. If you get stuck, name the exact step where you lost the thread — that is usually where the ${lens.conceptWord} needs revisiting.`
    },
    commonMistakes: {
      title: "Common Mistakes",
      body: `The most common error with **${topicTitle}** is ${lens.misconception}. When this happens, students often get the right process but wrong result — or skip a step that looks obvious but isn't. Fix: always name the ${lens.conceptWord} before applying it, and check each step against the ${lens.evidenceWord}.`
    },
    transferChallenge: {
      title: "Transfer Challenge",
      body: `Can you apply **${topicTitle}** in a slightly different context? Think about a situation in ${input.subjectName} where the same ${lens.conceptWord} shows up but looks different on the surface. Identify the pattern, adapt the rule, and explain why it still applies. This is how you move from knowing to understanding.`
    },
    summary: {
      title: "Summary",
      body: [
        `**${topicTitle} — key takeaways:**`,
        ``,
        `**Core rule:** The central ${lens.conceptWord} is what defines this topic. Apply it by: ${lens.actionWord}.`,
        ``,
        `**Watch out for:** ${lens.misconception}. Always confirm your answer with ${lens.evidenceWord}.`,
        ``,
        `**Transfer:** If you can ${lens.actionWord.split(" and ")[0]} on a problem you haven't seen before, you're ready for exam questions on ${topicTitle}.`
      ].join("\n")
    },
    keyConcepts: buildDynamicConceptItems(topicTitle, input.subjectName, lens),
    practiceQuestionIds: [`${rootId}-q-1`],
    masteryQuestionIds: [`${rootId}-q-2`]
  };
}
function buildDynamicConceptItems(topicTitle, subjectName, lens) {
  return [
    {
      name: `What ${topicTitle} Is`,
      summary: `The core definition — what makes ${topicTitle} what it is.`,
      detail: `Every instance of **${topicTitle}** in ${subjectName} has a **${lens.conceptWord}** at its centre. Before applying any rule, you need to be able to name what ${topicTitle} is and why it matters in this subject. Start here: identify the ${lens.conceptWord}, then describe it in your own words.`,
      example: `A quick test: can you point to the ${lens.conceptWord} in a problem? If yes, you've found ${topicTitle}. If not, read the problem again looking specifically for it.`
    },
    {
      name: `Why the Rule Works`,
      summary: `The reasoning behind the rule — not just the what, but the why.`,
      detail: `Knowing why **${topicTitle}** works prevents the most common mistake: ${lens.misconception}. The rule is grounded in how ${lens.conceptWord}s behave in ${subjectName}. When you understand the reason, you can adapt it to situations you haven't seen before.`,
      example: lens.example
    },
    {
      name: `When to Apply It`,
      summary: `Spotting the right moment to use ${topicTitle}.`,
      detail: `Not every problem calls for **${topicTitle}**, but when it does, ${lens.evidenceWord} gives you the signal. The key habit is to ${lens.actionWord} — do this before writing anything down. Rushing past this step is what leads to ${lens.misconception}.`,
      example: `If you see a problem that asks you to ${lens.actionWord.split(" and ")[0]}, that is your cue. Name the ${lens.conceptWord} first, then proceed.`
    }
  ];
}
function buildDynamicQuestionsForLesson(lesson, subjectName, topicTitle) {
  return [
    {
      id: lesson.practiceQuestionIds[0],
      lessonId: lesson.id,
      type: "short-answer",
      prompt: `Explain how ${topicTitle} works in ${subjectName}. What is the key rule and why does it matter?`,
      expectedAnswer: `explain how ${slugify(topicTitle)} works`,
      acceptedAnswers: [],
      rubric: `A strong answer names the key rule for ${topicTitle}, explains why it works, and does not just repeat the topic name. The learner should show understanding, not memorisation.`,
      explanation: `Understanding ${topicTitle} means being able to say what the rule is, why it applies, and how to use it — not just naming the topic.`,
      hintLevels: [
        `Start by naming the main rule or pattern for ${topicTitle}.`,
        `Then explain what that rule means in ${subjectName} and when you would use it.`
      ],
      misconceptionTags: [slugify(topicTitle), slugify(subjectName)],
      difficulty: "foundation",
      topicId: lesson.topicId,
      subtopicId: lesson.subtopicId
    },
    {
      id: lesson.masteryQuestionIds[0],
      lessonId: lesson.id,
      type: "step-by-step",
      prompt: `Show how you would apply ${topicTitle} to solve a problem in ${subjectName}. Walk through your reasoning step by step.`,
      expectedAnswer: `apply ${slugify(topicTitle)} step by step`,
      acceptedAnswers: [],
      rubric: `The answer should show at least two steps of reasoning connected to ${topicTitle}, not just a final answer. The learner must justify each step.`,
      explanation: `Applying ${topicTitle} means showing the method, not just the result. Each step should be explained so the reasoning is visible.`,
      hintLevels: [
        `Write down what ${topicTitle} is asking you to do first.`,
        `Then apply the rule one step at a time and explain each move.`
      ],
      misconceptionTags: [slugify(`${topicTitle}-application`)],
      difficulty: "core",
      topicId: lesson.topicId,
      subtopicId: lesson.subtopicId
    }
  ];
}
function buildQuestionReply(session, lesson, message) {
  const conceptMatch = message.match(/^\[CONCEPT:\s*(.+?)\]/);
  if (conceptMatch && lesson.keyConcepts?.length) {
    const conceptName = conceptMatch[1].trim();
    const concept = lesson.keyConcepts.find(
      (c) => c.name.toLowerCase() === conceptName.toLowerCase()
    );
    if (concept) {
      const reply2 = [
        `Let me put **${concept.name}** another way.`,
        "",
        concept.detail,
        "",
        "---",
        "",
        `Does that help? What part is still fuzzy?`
      ].join("\n");
      return {
        displayContent: reply2,
        provider: "local-fallback",
        metadata: {
          action: "stay",
          next_stage: null,
          reteach_style: null,
          reteach_count: session.reteachCount,
          confidence_assessment: session.confidenceScore,
          profile_update: {}
        }
      };
    }
  }
  const stageContent = getLessonSectionForStage(lesson, session.currentStage);
  const topicName = lesson.title.replace(/^.*?:\s*/, "");
  const reply = [
    `Good question — let me clarify this within **${topicName}**.`,
    "",
    `The key anchor for ${topicName} is: ${lesson.concepts.body.split(".")[0]}.`,
    "",
    `If your question was about something more specific, try phrasing it in your own words and I will work through it with you.`,
    "",
    "---",
    "",
    `↩ **Back to the lesson** — we were working through: *${stageContent.split("\n")[0].replace(/\*\*/g, "")}*. Let's pick up from there.`
  ].join("\n");
  return {
    displayContent: reply,
    provider: "local-fallback",
    metadata: {
      action: "side_thread",
      next_stage: null,
      reteach_style: null,
      reteach_count: session.reteachCount,
      confidence_assessment: session.confidenceScore,
      profile_update: {
        step_by_step: 0.65
      }
    }
  };
}
function buildResponseReply(session, lesson, message) {
  const lower = message.toLowerCase();
  const indicatesConfusion = lower.includes("don't get") || lower.includes("confused") || lower.includes("not sure") || lower.includes("stuck");
  if (session.currentStage === "check" && !indicatesConfusion) {
    return {
      displayContent: [
        `Nice. You've shown enough understanding to finish this lesson.`,
        ``,
        `**Summary:**`,
        lesson.summary.body,
        ``,
        `---`,
        ``,
        `**One more challenge before you go:**`,
        lesson.transferChallenge.body
      ].join("\n"),
      provider: "local-fallback",
      metadata: {
        action: "complete",
        next_stage: null,
        reteach_style: null,
        reteach_count: 0,
        confidence_assessment: 0.86,
        profile_update: {
          quiz_performance: 0.86,
          excelled_at: [lesson.title]
        }
      }
    };
  }
  if (indicatesConfusion) {
    return {
      displayContent: `No worries, let me try that a different way.

**Step 1:** Keep the main rule in view.
**Step 2:** Match it to this topic.
**Step 3:** Test it on one small example before doing the whole task.

Tell me if that version feels clearer.`,
      provider: "local-fallback",
      metadata: {
        action: "reteach",
        next_stage: null,
        reteach_style: "step_by_step",
        reteach_count: session.reteachCount + 1,
        confidence_assessment: 0.38,
        profile_update: {
          step_by_step: 0.8,
          needs_repetition: 0.72,
          struggled_with: [lesson.title]
        }
      }
    };
  }
  const nextStage = getNextStage(session.currentStage);
  if (!nextStage) {
    return {
      displayContent: `Good. Let's stay with this point for one more pass before moving on.`,
      provider: "local-fallback",
      metadata: {
        action: "stay",
        next_stage: null,
        reteach_style: null,
        reteach_count: session.reteachCount,
        confidence_assessment: 0.61,
        profile_update: {
          abstract_thinking: 0.62
        }
      }
    };
  }
  const transitionLine = nextStage === "check" ? `Good. Let's see how much has landed.` : `Good. Let's build on that.`;
  return {
    displayContent: transitionLine,
    provider: "local-fallback",
    metadata: {
      action: "advance",
      next_stage: nextStage,
      reteach_style: null,
      reteach_count: 0,
      confidence_assessment: 0.74,
      profile_update: {
        abstract_thinking: 0.66,
        quiz_performance: nextStage === "check" ? 0.72 : void 0
      }
    }
  };
}
function buildLocalLessonChatResponse(request, lesson) {
  if (request.messageType === "question") {
    return buildQuestionReply(request.lessonSession, lesson, request.message);
  }
  return buildResponseReply(request.lessonSession, lesson, request.message);
}
function applyLessonAssistantResponse(lessonSession, assistantMessage) {
  const metadata = assistantMessage.metadata;
  const next = {
    ...lessonSession,
    messages: [...lessonSession.messages, assistantMessage],
    lastActiveAt: assistantMessage.timestamp,
    confidenceScore: metadata?.confidence_assessment ?? lessonSession.confidenceScore
  };
  if (!metadata) {
    return next;
  }
  if (metadata.action === "side_thread") {
    return {
      ...next,
      questionCount: lessonSession.questionCount + 1,
      profileUpdates: [...lessonSession.profileUpdates, metadata.profile_update]
    };
  }
  if (metadata.action === "reteach") {
    return {
      ...next,
      reteachCount: metadata.reteach_count,
      needsTeacherReview: metadata.needs_teacher_review ?? lessonSession.needsTeacherReview,
      stuckConcept: metadata.stuck_concept ?? lessonSession.stuckConcept,
      profileUpdates: [...lessonSession.profileUpdates, metadata.profile_update]
    };
  }
  if (metadata.action === "advance" && metadata.next_stage) {
    const completed = Array.from(/* @__PURE__ */ new Set([...lessonSession.stagesCompleted, lessonSession.currentStage]));
    return {
      ...next,
      currentStage: metadata.next_stage,
      stagesCompleted: completed,
      reteachCount: 0,
      profileUpdates: [...lessonSession.profileUpdates, metadata.profile_update]
    };
  }
  if (metadata.action === "complete") {
    const completed = Array.from(/* @__PURE__ */ new Set([...lessonSession.stagesCompleted, lessonSession.currentStage]));
    return {
      ...next,
      currentStage: "complete",
      stagesCompleted: completed,
      status: "complete",
      completedAt: next.lastActiveAt,
      profileUpdates: [...lessonSession.profileUpdates, metadata.profile_update]
    };
  }
  return {
    ...next,
    profileUpdates: [...lessonSession.profileUpdates, metadata.profile_update]
  };
}
function buildRevisionTopicFromLesson(lessonSession) {
  const baseDate = lessonSession.completedAt ?? lessonSession.lastActiveAt;
  const nextRevision = new Date(baseDate);
  nextRevision.setDate(nextRevision.getDate() + 3);
  return {
    lessonSessionId: lessonSession.id,
    subjectId: lessonSession.subjectId,
    subject: lessonSession.subject,
    topicTitle: lessonSession.topicTitle,
    curriculumReference: lessonSession.curriculumReference,
    confidenceScore: lessonSession.confidenceScore,
    previousIntervalDays: 3,
    nextRevisionAt: nextRevision.toISOString(),
    lastReviewedAt: null
  };
}
function isoNow() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function normalizeAnswer(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}
function buildRevisionPlan(subjectId, subjectName, selectedTopics) {
  return {
    subjectId,
    examDate: "2026-06-18",
    topics: selectedTopics,
    quickSummary: `Prioritize ${selectedTopics[0] ?? subjectName}, then move through the remaining ${subjectName} topics with active recall and exam-style prompts.`,
    keyConcepts: [
      `State the key vocabulary in ${subjectName} before attempting the harder questions.`,
      `Explain each step clearly instead of jumping to the answer in ${subjectName}.`,
      `Use spaced repetition across ${selectedTopics.length || 1} topic areas.`
    ],
    examFocus: [
      "Show your method clearly.",
      "Connect each answer to the underlying concept.",
      `Revise ${subjectName} mistakes before doing speed work.`
    ],
    weaknessDetection: `Watch for places where the learner can state an answer in ${subjectName} but cannot justify the step.`
  };
}
function createDerivedProgram(country, curriculumName, grade, selectedSubjectNames, customSubjects = []) {
  const subjectNames = [...selectedSubjectNames, ...customSubjects].filter(
    (subject, index, allSubjects) => subject.length > 0 && allSubjects.indexOf(subject) === index
  );
  return buildLearningProgram(country, curriculumName, grade, subjectNames);
}
function createAskQuestionState(state) {
  const selectedSubject = state.curriculum.subjects[0];
  const selectedTopic = selectedSubject?.topics[0];
  const request = {
    question: `What is the key idea in ${selectedTopic?.name ?? "this topic"}?`,
    topic: selectedTopic?.name ?? "Foundations",
    subject: selectedSubject?.name ?? "Mathematics",
    grade: state.profile.grade,
    currentAttempt: ""
  };
  return {
    request,
    response: buildAskQuestionResponse(request),
    provider: "local-seed",
    isLoading: false,
    error: null
  };
}
function deriveLegacyProgress(state) {
  return Object.fromEntries(
    state.lessons.map((lesson) => {
      const latest = state.lessonSessions.filter((session) => session.lessonId === lesson.id).sort((left, right) => Date.parse(right.lastActiveAt) - Date.parse(left.lastActiveAt))[0];
      return [
        lesson.id,
        {
          lessonId: lesson.id,
          completed: latest?.status === "complete",
          masteryLevel: latest ? Math.round(latest.confidenceScore * 100) : 0,
          weakAreas: latest?.needsTeacherReview ? [latest.stuckConcept ?? "Needs teacher review"] : [],
          answers: [],
          timeSpentMinutes: latest ? Math.max(1, Math.round((Date.parse(latest.lastActiveAt) - Date.parse(latest.startedAt)) / 6e4)) : 0,
          lastStage: latest?.currentStage ?? "orientation"
        }
      ];
    })
  );
}
function diagnoseProblem(question) {
  const normalized = question.toLowerCase();
  if (normalized.includes("why") || normalized.includes("explain")) {
    return "concept";
  }
  if (normalized.includes("prove")) {
    return "proof";
  }
  if (normalized.includes("exam") || normalized.includes("revise")) {
    return "revision";
  }
  if (normalized.includes("word problem") || normalized.includes("story")) {
    return "word_problem";
  }
  return "procedural";
}
function inferResponseStage(request) {
  if (request.currentAttempt.trim().length === 0) {
    return "clarify";
  }
  if (request.currentAttempt.toLowerCase().includes("stuck")) {
    return "hint";
  }
  return "guided_step";
}
function buildAskQuestionResponse(request) {
  const problemType = diagnoseProblem(request.question);
  const responseStage = inferResponseStage(request);
  const topicContext = request.topic || "the selected topic";
  const teacherResponseMap = {
    clarify: `Let’s pin down the exact step causing trouble in ${topicContext}. Tell me what you already know, then we can choose the smallest next step together.`,
    hint: `Focus on one move only: identify the rule that applies in ${topicContext}, then test it on the first part of the problem before you try the full solution.`,
    guided_step: `Your method is close. Keep your previous work, then do one balancing step or one fraction operation at a time and explain why that step is valid.`,
    worked_example: `Here is a short worked example for ${topicContext}, with each step justified so you can mirror the method on your own problem.`,
    final_explanation: `You have already attempted the problem, so here is the full explanation with the final answer and the reasoning behind each step.`
  };
  return {
    problemType,
    studentGoal: "Make progress on a specific question without skipping the reasoning.",
    diagnosis: request.currentAttempt.trim().length === 0 ? "The student has not shown enough working yet, so the next step is to identify the blocked concept." : "The student has started, but needs targeted guidance on the next step rather than a full answer.",
    responseStage,
    teacherResponse: teacherResponseMap[responseStage],
    checkForUnderstanding: `What is the next step you would try now in ${topicContext}?`
  };
}
function createInitialState() {
  const selectedCountryId = onboardingCountries[0].id;
  const availableCurriculums = getCurriculumsByCountry(selectedCountryId);
  const selectedCurriculumId = availableCurriculums[0]?.id ?? "caps";
  const availableGrades = getGradesByCurriculum(selectedCurriculumId);
  const selectedGradeId = availableGrades.find((grade) => grade.label === "Grade 6")?.id ?? availableGrades[0]?.id ?? "grade-6";
  const availableSubjects = getSubjectsByCurriculumAndGrade(selectedCurriculumId, selectedGradeId);
  const selectedStructuredSubjectIds = availableSubjects.filter((subject) => subject.name === "Mathematics").map((subject) => subject.id);
  const selectedSubjectNames = availableSubjects.filter((subject) => selectedStructuredSubjectIds.includes(subject.id)).map((subject) => subject.name);
  const recommendation = getRecommendedSubject(selectedStructuredSubjectIds, [], availableSubjects);
  const program = createDerivedProgram("South Africa", "CAPS", "Grade 6", selectedSubjectNames);
  const selectedLesson = program.lessons[0];
  const selectedTopic = program.curriculum.subjects[0].topics[0];
  const selectedSubtopic = selectedTopic.subtopics[0];
  const learnerProfile = createDefaultLearnerProfile("");
  const emptyProfile = {
    id: "",
    fullName: "",
    email: "",
    role: "student",
    schoolYear: defaultSchoolYear,
    term: defaultTerm,
    grade: "",
    gradeId: "",
    country: "",
    countryId: "",
    curriculum: "",
    curriculumId: "",
    recommendedStartSubjectId: recommendation.subjectId,
    recommendedStartSubjectName: recommendation.subjectName
  };
  const baseState = {
    auth: {
      status: "signed_out",
      error: null
    },
    onboarding: {
      completed: false,
      completedAt: null,
      currentStep: onboardingStepOrder[0],
      stepOrder: onboardingStepOrder,
      canSkipCurriculum: true,
      schoolYear: defaultSchoolYear,
      term: defaultTerm,
      selectedCountryId,
      selectedCurriculumId,
      selectedGradeId,
      selectedSubjectIds: selectedStructuredSubjectIds,
      selectedSubjectNames,
      customSubjects: [],
      customSubjectInput: "",
      selectionMode: getSelectionMode(selectedStructuredSubjectIds, [], false),
      subjectVerification: {
        status: "idle",
        input: "",
        subjectId: null,
        normalizedName: null,
        category: null,
        reason: null,
        suggestion: null,
        provisional: false
      },
      isSaving: false,
      error: null,
      recommendation,
      options: {
        countries: onboardingCountries,
        curriculums: availableCurriculums,
        grades: availableGrades,
        subjects: availableSubjects
      }
    },
    profile: emptyProfile,
    learnerProfile,
    curriculum: program.curriculum,
    lessons: program.lessons,
    questions: program.questions,
    progress: {},
    lessonSessions: [],
    revisionTopics: [],
    analytics: [],
    revisionPlan: buildRevisionPlan(program.curriculum.subjects[0].id, program.curriculum.subjects[0].name, [
      selectedTopic.name
    ]),
    askQuestion: createAskQuestionState({
      curriculum: program.curriculum,
      profile: emptyProfile
    }),
    topicDiscovery: {
      selectedSubjectId: program.curriculum.subjects[0].id,
      input: "",
      status: "idle",
      shortlist: null,
      provider: null,
      error: null
    },
    backend: {
      isConfigured: false,
      lastSyncAt: null,
      lastSyncStatus: "idle",
      lastSyncError: null
    },
    ui: {
      theme: "light",
      learningMode: "learn",
      currentScreen: "landing",
      selectedSubjectId: program.curriculum.subjects[0]?.id ?? "",
      selectedTopicId: selectedTopic.id,
      selectedSubtopicId: selectedSubtopic.id,
      selectedLessonId: selectedLesson.id,
      practiceQuestionId: selectedLesson.practiceQuestionIds[0] ?? null,
      activeLessonSessionId: null,
      pendingAssistantSessionId: null,
      composerDraft: "",
      showTopicDiscoveryComposer: false,
      showLessonCloseConfirm: false
    }
  };
  return deriveLearningState(baseState);
}
const STAGE_MIGRATIONS = {
  overview: "orientation",
  detail: "construction"
};
function migrateStage(stage) {
  return STAGE_MIGRATIONS[stage] ?? stage;
}
function normalizeAppState(value) {
  const base = createInitialState();
  if (!value || typeof value !== "object") {
    return base;
  }
  const input = value;
  const normalized = {
    ...base,
    ...input,
    auth: {
      ...base.auth,
      ...input.auth ?? {}
    },
    onboarding: {
      ...base.onboarding,
      ...input.onboarding ?? {},
      stepOrder: Array.isArray(input.onboarding?.stepOrder) ? input.onboarding.stepOrder : base.onboarding.stepOrder,
      selectedSubjectIds: Array.isArray(input.onboarding?.selectedSubjectIds) ? input.onboarding.selectedSubjectIds : base.onboarding.selectedSubjectIds,
      selectedSubjectNames: Array.isArray(input.onboarding?.selectedSubjectNames) ? input.onboarding.selectedSubjectNames : base.onboarding.selectedSubjectNames,
      customSubjects: Array.isArray(input.onboarding?.customSubjects) ? input.onboarding.customSubjects : base.onboarding.customSubjects,
      recommendation: {
        ...base.onboarding.recommendation,
        ...input.onboarding?.recommendation ?? {}
      },
      options: {
        countries: Array.isArray(input.onboarding?.options?.countries) ? input.onboarding.options.countries : base.onboarding.options.countries,
        curriculums: Array.isArray(input.onboarding?.options?.curriculums) ? input.onboarding.options.curriculums : base.onboarding.options.curriculums,
        grades: Array.isArray(input.onboarding?.options?.grades) ? input.onboarding.options.grades : base.onboarding.options.grades,
        subjects: Array.isArray(input.onboarding?.options?.subjects) ? input.onboarding.options.subjects : base.onboarding.options.subjects
      }
    },
    profile: {
      ...base.profile,
      ...input.profile ?? {}
    },
    learnerProfile: {
      ...base.learnerProfile,
      ...input.learnerProfile ?? {}
    },
    curriculum: input.curriculum ?? base.curriculum,
    lessons: Array.isArray(input.lessons) ? input.lessons : base.lessons,
    questions: Array.isArray(input.questions) ? input.questions : base.questions,
    progress: input.progress && typeof input.progress === "object" ? { ...base.progress, ...input.progress } : base.progress,
    lessonSessions: Array.isArray(input.lessonSessions) ? input.lessonSessions.map((session) => ({
      ...session,
      currentStage: migrateStage(session.currentStage),
      stagesCompleted: Array.isArray(session.stagesCompleted) ? session.stagesCompleted.map(migrateStage) : []
    })) : base.lessonSessions,
    revisionTopics: Array.isArray(input.revisionTopics) ? input.revisionTopics : base.revisionTopics,
    analytics: Array.isArray(input.analytics) ? input.analytics : base.analytics,
    revisionPlan: input.revisionPlan ?? base.revisionPlan,
    askQuestion: {
      ...base.askQuestion,
      ...input.askQuestion ?? {},
      request: input.askQuestion?.request ?? base.askQuestion.request,
      response: input.askQuestion?.response ?? base.askQuestion.response
    },
    topicDiscovery: {
      ...base.topicDiscovery,
      ...input.topicDiscovery ?? {}
    },
    backend: {
      ...base.backend,
      ...input.backend ?? {}
    },
    ui: {
      ...base.ui,
      ...input.ui ?? {}
    }
  };
  return deriveLearningState(normalized);
}
function deriveLearningState(state) {
  const expectedSubjectNames = [...state.onboarding.selectedSubjectNames, ...state.onboarding.customSubjects].filter(
    (subject, index, subjects) => subject.length > 0 && subjects.indexOf(subject) === index
  );
  const currentSubjectNames = state.curriculum.subjects.map((subject) => subject.name);
  const hasMatchingProgram = state.curriculum.subjects.length > 0 && state.lessons.length > 0 && expectedSubjectNames.length > 0 && expectedSubjectNames.length === currentSubjectNames.length && expectedSubjectNames.every((subjectName) => currentSubjectNames.includes(subjectName));
  const program = hasMatchingProgram ? {
    curriculum: state.curriculum,
    lessons: state.lessons,
    questions: state.questions
  } : createDerivedProgram(
    state.profile.country,
    state.profile.curriculum,
    state.profile.grade,
    state.onboarding.selectedSubjectNames,
    state.onboarding.customSubjects
  );
  const generatedLessons = state.lessons.filter((lesson) => lesson.id.startsWith("generated-"));
  const generatedQuestions = state.questions.filter((question) => question.lessonId.startsWith("generated-"));
  const mergedLessons = [
    ...generatedLessons,
    ...program.lessons.filter((lesson) => !generatedLessons.some((generated) => generated.id === lesson.id))
  ];
  const mergedQuestions = [
    ...generatedQuestions,
    ...program.questions.filter((question) => !generatedQuestions.some((generated) => generated.id === question.id))
  ];
  const selectedSubject = program.curriculum.subjects.find((subject) => subject.id === state.ui.selectedSubjectId) ?? program.curriculum.subjects[0];
  const selectedTopic = selectedSubject?.topics.find((topic) => topic.id === state.ui.selectedTopicId) ?? selectedSubject?.topics[0];
  const selectedSubtopic = selectedTopic?.subtopics.find((subtopic) => subtopic.id === state.ui.selectedSubtopicId) ?? selectedTopic?.subtopics[0];
  const selectedLesson = mergedLessons.find((lesson) => lesson.id === state.ui.selectedLessonId) ?? mergedLessons.find((lesson) => lesson.id === selectedSubtopic?.lessonIds[0]) ?? mergedLessons[0];
  const practiceQuestionId = selectedLesson.practiceQuestionIds.find((questionId) => questionId === state.ui.practiceQuestionId) ?? selectedLesson.practiceQuestionIds[0];
  const revisionPlan = buildRevisionPlan(
    selectedSubject.id,
    selectedSubject.name,
    selectedSubject.topics.map((topic) => topic.name)
  );
  const lessonSessions = Array.isArray(state.lessonSessions) ? state.lessonSessions.filter(
    (session) => mergedLessons.some((lesson) => lesson.id === session.lessonId) || session.lessonId.startsWith("generated-")
  ) : [];
  const revisionTopics = Array.isArray(state.revisionTopics) ? state.revisionTopics.filter((topic) => lessonSessions.some((session) => session.id === topic.lessonSessionId)) : [];
  return {
    ...state,
    curriculum: program.curriculum,
    lessons: mergedLessons,
    questions: mergedQuestions,
    progress: deriveLegacyProgress({
      lessons: mergedLessons,
      lessonSessions
    }),
    lessonSessions,
    revisionTopics,
    revisionPlan,
    topicDiscovery: {
      ...state.topicDiscovery,
      selectedSubjectId: state.topicDiscovery.selectedSubjectId || selectedSubject.id
    },
    ui: {
      ...state.ui,
      selectedSubjectId: selectedSubject.id,
      selectedTopicId: selectedTopic.id,
      selectedSubtopicId: selectedSubtopic.id,
      selectedLessonId: selectedLesson.id,
      practiceQuestionId,
      activeLessonSessionId: state.ui.activeLessonSessionId && lessonSessions.some((session) => session.id === state.ui.activeLessonSessionId) ? state.ui.activeLessonSessionId : lessonSessions.find((session) => session.status === "active")?.id ?? null
    }
  };
}
function getSelectedSubject(state) {
  return state.curriculum.subjects.find((subject) => subject.id === state.ui.selectedSubjectId) ?? state.curriculum.subjects[0];
}
function getSelectedTopic(state) {
  const subject = getSelectedSubject(state);
  return subject.topics.find((topic) => topic.id === state.ui.selectedTopicId) ?? subject.topics[0];
}
function getActiveLessonSession(state) {
  return state.lessonSessions.find((session) => session.id === state.ui.activeLessonSessionId) ?? state.lessonSessions[0] ?? null;
}
function getQuestionById(state, questionId) {
  return state.questions.find((question) => question.id === questionId) ?? state.questions[0];
}
function evaluateAnswer(question, answer) {
  const normalizedAnswer = normalizeAnswer(answer);
  const acceptedAnswers = [question.expectedAnswer, ...question.acceptedAnswers ?? []].map(normalizeAnswer);
  return {
    questionId: question.id,
    answer,
    isCorrect: acceptedAnswers.includes(normalizedAnswer),
    attemptedAt: isoNow()
  };
}
function recalculateMastery(progress) {
  const totalAnswers = progress.answers.length;
  const correctAnswers = progress.answers.filter((answer) => answer.isCorrect).length;
  const masteryLevel = totalAnswers === 0 ? 0 : Math.round(correctAnswers / totalAnswers * 100);
  const weakAreas = masteryLevel >= 70 ? [] : ["Needs more guided practice before mastery"];
  return {
    ...progress,
    completed: masteryLevel >= 70,
    masteryLevel,
    weakAreas
  };
}
function buildRevisionTopics(state) {
  return getSelectedSubject(state).topics.map((topic) => topic.name);
}
function getLessonsForSelectedTopic(state) {
  return state.lessons.filter((lesson) => lesson.topicId === state.ui.selectedTopicId);
}
function getCompletionSummary(state) {
  const totalLessons = state.lessonSessions.length;
  const completedLessons = state.lessonSessions.filter((session) => session.status === "complete").length;
  const averageMastery = totalLessons === 0 ? 0 : Math.round(
    (state.lessonSessions.reduce((total, session) => total + session.confidenceScore * 100, 0) || 0) / totalLessons
  );
  return {
    completedLessons,
    totalLessons,
    averageMastery
  };
}
function getWeakTopicLabels(state) {
  return state.lessonSessions.filter((session) => session.confidenceScore < 0.7).map((session) => session.topicTitle).slice(0, 3);
}
function upsertRevisionTopicFromSession(revisionTopics, lessonSession) {
  const nextTopic = buildRevisionTopicFromLesson(lessonSession);
  const existing = revisionTopics.find((topic) => topic.lessonSessionId === lessonSession.id);
  if (!existing) {
    return [...revisionTopics, nextTopic];
  }
  return revisionTopics.map((topic) => topic.lessonSessionId === lessonSession.id ? nextTopic : topic);
}
export {
  deriveLearningState as A,
  LESSON_STAGE_ORDER as L,
  buildDynamicLessonFromTopic as a,
  buildLocalLessonChatResponse as b,
  buildDynamicQuestionsForLesson as c,
  createInitialState as d,
  getCompletionSummary as e,
  getStageNumber as f,
  getStageLabel as g,
  getActiveLessonSession as h,
  getNextStage as i,
  getWeakTopicLabels as j,
  getSelectedSubject as k,
  getSelectedTopic as l,
  getLessonsForSelectedTopic as m,
  normalizeAppState as n,
  buildRevisionTopics as o,
  buildInitialLessonMessages as p,
  classifyLessonMessage as q,
  applyLessonAssistantResponse as r,
  createDefaultLearnerProfile as s,
  upsertRevisionTopicFromSession as t,
  updateLearnerProfile as u,
  buildLessonSessionFromTopic as v,
  buildAskQuestionResponse as w,
  getQuestionById as x,
  evaluateAnswer as y,
  recalculateMastery as z
};
