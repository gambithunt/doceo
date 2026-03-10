import { e as escape_html, a1 as attr, a2 as bind_props, a3 as ensure_array_like, a4 as attr_class, a5 as head, a0 as derived } from "../../chunks/index2.js";
import { w as writable } from "../../chunks/index.js";
const questions = [
  {
    id: "q-fractions-1",
    lessonId: "lesson-fractions-foundations",
    type: "multiple-choice",
    prompt: "Which fraction is equivalent to 1/2?",
    expectedAnswer: "2/4",
    rubric: "Student identifies an equivalent fraction by scaling numerator and denominator equally.",
    explanation: "If you multiply the numerator and denominator of 1/2 by 2, you get 2/4.",
    hintLevels: ["Think about doubling both numbers.", "1/2 becomes ?/4 when you multiply by 2."],
    misconceptionTags: ["equivalent-fractions", "unequal-scaling"],
    difficulty: "foundation",
    topicId: "topic-fractions",
    subtopicId: "subtopic-equivalent-fractions",
    options: [
      { id: "a", label: "A", text: "2/4" },
      { id: "b", label: "B", text: "1/4" },
      { id: "c", label: "C", text: "3/4" }
    ]
  },
  {
    id: "q-fractions-2",
    lessonId: "lesson-fractions-foundations",
    type: "numeric",
    prompt: "Write 3/6 in its simplest form.",
    expectedAnswer: "1/2",
    rubric: "Student simplifies the fraction by dividing the numerator and denominator by their highest common factor.",
    explanation: "The highest common factor of 3 and 6 is 3, so 3/6 simplifies to 1/2.",
    hintLevels: ["What number divides both 3 and 6?", "Try dividing the numerator and denominator by 3."],
    misconceptionTags: ["simplification", "common-factor"],
    difficulty: "core",
    topicId: "topic-fractions",
    subtopicId: "subtopic-equivalent-fractions"
  },
  {
    id: "q-fractions-3",
    lessonId: "lesson-fractions-foundations",
    type: "step-by-step",
    prompt: "Add 1/4 + 2/4. Explain your method.",
    expectedAnswer: "3/4",
    rubric: "Student adds numerators when denominators are already equal and keeps the denominator unchanged.",
    explanation: "When denominators are the same, add the numerators only: 1 + 2 = 3, so the answer is 3/4.",
    hintLevels: ["Are the denominators already the same?", "Add only the top numbers."],
    misconceptionTags: ["fraction-addition", "denominator-error"],
    difficulty: "core",
    topicId: "topic-fractions",
    subtopicId: "subtopic-adding-fractions"
  },
  {
    id: "q-algebra-1",
    lessonId: "lesson-algebra-patterns",
    type: "short-answer",
    prompt: "If x + 7 = 15, what is x?",
    expectedAnswer: "8",
    rubric: "Student isolates x by subtracting 7 from both sides.",
    explanation: "Subtract 7 from both sides to keep the equation balanced. 15 - 7 = 8.",
    hintLevels: ["What operation undoes +7?", "Subtract 7 from both sides."],
    misconceptionTags: ["inverse-operations"],
    difficulty: "foundation",
    topicId: "topic-algebra",
    subtopicId: "subtopic-solving-equations"
  },
  {
    id: "q-algebra-2",
    lessonId: "lesson-algebra-patterns",
    type: "step-by-step",
    prompt: "Solve 2x = 18 and explain each step.",
    expectedAnswer: "9",
    rubric: "Student divides both sides by 2 and explains why the equation stays balanced.",
    explanation: "Divide both sides by 2 to isolate x. 18 divided by 2 is 9.",
    hintLevels: ["What is attached to x?", "Undo multiplying by 2 with division."],
    misconceptionTags: ["inverse-operations", "balance"],
    difficulty: "core",
    topicId: "topic-algebra",
    subtopicId: "subtopic-solving-equations"
  }
];
const lessons = [
  {
    id: "lesson-fractions-foundations",
    topicId: "topic-fractions",
    subtopicId: "subtopic-equivalent-fractions",
    title: "Equivalent Fractions and Simple Addition",
    subjectId: "subject-mathematics",
    grade: "Grade 6",
    overview: {
      title: "Overview",
      body: "Fractions describe equal parts of a whole. Equivalent fractions name the same amount, and fractions with the same denominator can be added by combining the numerators."
    },
    deeperExplanation: {
      title: "Deeper Explanation",
      body: "Equivalent fractions keep the same value because the numerator and denominator are scaled by the same factor. When adding fractions with equal denominators, the size of each part does not change, so only the number of parts changes."
    },
    example: {
      title: "Worked Example",
      body: "To show that 1/2 = 2/4, multiply both the numerator and denominator by 2. To add 1/4 + 2/4, keep the denominator as 4 and add the numerators to get 3/4."
    },
    practiceQuestionIds: ["q-fractions-1", "q-fractions-2", "q-fractions-3"],
    masteryQuestionIds: ["q-fractions-2", "q-fractions-3"]
  },
  {
    id: "lesson-algebra-patterns",
    topicId: "topic-algebra",
    subtopicId: "subtopic-solving-equations",
    title: "Solving One-Step Equations",
    subjectId: "subject-mathematics",
    grade: "Grade 7",
    overview: {
      title: "Overview",
      body: "An equation is balanced like a scale. To solve for a variable, use the inverse operation and do the same thing to both sides."
    },
    deeperExplanation: {
      title: "Deeper Explanation",
      body: "Inverse operations undo each other. Addition is undone by subtraction, and multiplication is undone by division. Keeping both sides balanced preserves the truth of the equation."
    },
    example: {
      title: "Worked Example",
      body: "If x + 7 = 15, subtract 7 from both sides to get x = 8. If 2x = 18, divide both sides by 2 to get x = 9."
    },
    practiceQuestionIds: ["q-algebra-1", "q-algebra-2"],
    masteryQuestionIds: ["q-algebra-1", "q-algebra-2"]
  }
];
const curriculum = {
  country: "South Africa",
  name: "CAPS",
  grade: "Grade 6",
  subjects: [
    {
      id: "subject-mathematics",
      name: "Mathematics",
      topics: [
        {
          id: "topic-fractions",
          name: "Fractions",
          subtopics: [
            {
              id: "subtopic-equivalent-fractions",
              name: "Equivalent Fractions",
              lessonIds: ["lesson-fractions-foundations"]
            },
            {
              id: "subtopic-adding-fractions",
              name: "Adding Fractions",
              lessonIds: ["lesson-fractions-foundations"]
            }
          ]
        },
        {
          id: "topic-algebra",
          name: "Introductory Algebra",
          subtopics: [
            {
              id: "subtopic-solving-equations",
              name: "Solving One-Step Equations",
              lessonIds: ["lesson-algebra-patterns"]
            }
          ]
        }
      ]
    }
  ]
};
function isoNow() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function createEvent(type, detail) {
  return {
    id: `${type}-${crypto.randomUUID()}`,
    type,
    detail,
    createdAt: isoNow()
  };
}
function initialLessonProgress() {
  return Object.fromEntries(
    lessons.map((lesson) => [
      lesson.id,
      {
        lessonId: lesson.id,
        completed: false,
        masteryLevel: 0,
        weakAreas: [],
        answers: [],
        timeSpentMinutes: 0,
        lastStage: "overview"
      }
    ])
  );
}
function buildRevisionPlan(selectedTopics) {
  return {
    subjectId: "subject-mathematics",
    examDate: "2026-06-18",
    topics: selectedTopics,
    quickSummary: "Prioritize fraction equivalence, fraction addition, and one-step equations. Start with worked examples, then complete timed retrieval practice.",
    keyConcepts: [
      "Equivalent fractions scale numerator and denominator by the same factor.",
      "Like denominators allow direct addition of numerators.",
      "Inverse operations keep equations balanced."
    ],
    examFocus: ["Show working clearly.", "Check whether denominators match.", "Explain the balancing step in algebra."],
    weaknessDetection: "Watch for denominator errors in fraction addition and for skipping the inverse-operation explanation in algebra."
  };
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
  const selectedLesson = lessons[0];
  const selectedTopic = curriculum.subjects[0].topics[0];
  return {
    profile: {
      id: "student-demo",
      fullName: "Demo Student",
      role: "student",
      grade: "Grade 6",
      country: "South Africa",
      curriculum: "CAPS"
    },
    curriculum,
    lessons,
    questions,
    progress: initialLessonProgress(),
    sessions: [
      {
        id: "session-initial",
        mode: "learn",
        lessonId: selectedLesson.id,
        startedAt: isoNow(),
        updatedAt: isoNow(),
        resumeLabel: `Resume ${selectedLesson.title}`
      }
    ],
    analytics: [
      createEvent("session_started", "Initial demo session created"),
      createEvent("lesson_viewed", selectedLesson.title)
    ],
    revisionPlan: buildRevisionPlan([selectedTopic.name]),
    askQuestion: {
      request: {
        question: "How do I know when fractions are equivalent?",
        topic: selectedTopic.name,
        subject: "Mathematics",
        grade: "Grade 6",
        currentAttempt: ""
      },
      response: buildAskQuestionResponse({
        question: "How do I know when fractions are equivalent?",
        topic: selectedTopic.name,
        currentAttempt: ""
      })
    },
    ui: {
      theme: "light",
      learningMode: "learn",
      selectedSubjectId: curriculum.subjects[0].id,
      selectedTopicId: selectedTopic.id,
      selectedLessonId: selectedLesson.id,
      practiceQuestionId: selectedLesson.practiceQuestionIds[0]
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
function getSelectedLesson(state) {
  return state.lessons.find((lesson) => lesson.id === state.ui.selectedLessonId) ?? state.lessons[0];
}
function getQuestionById(state, questionId) {
  return state.questions.find((question) => question.id === questionId) ?? state.questions[0];
}
function evaluateAnswer(question, answer) {
  const normalizedAnswer = answer.trim().toLowerCase();
  const normalizedExpected = question.expectedAnswer.trim().toLowerCase();
  return {
    questionId: question.id,
    answer,
    isCorrect: normalizedAnswer === normalizedExpected,
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
function recordSession(sessions, mode, lessonId, resumeLabel) {
  return [
    {
      id: `session-${crypto.randomUUID()}`,
      mode,
      lessonId,
      startedAt: isoNow(),
      updatedAt: isoNow(),
      resumeLabel
    },
    ...sessions
  ].slice(0, 8);
}
function buildRevisionTopics(state) {
  return getSelectedSubject(state).topics.map((topic) => topic.name);
}
function readState() {
  {
    return createInitialState();
  }
}
function createAnalyticsEvent(type, detail) {
  return {
    id: `${type}-${crypto.randomUUID()}`,
    type,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    detail
  };
}
function createAppStore() {
  const { subscribe, update, set } = writable(readState());
  return {
    subscribe,
    reset: () => {
      const state = createInitialState();
      set(state);
    },
    setTheme: (theme) => update((state) => {
      const next = {
        ...state,
        ui: {
          ...state.ui,
          theme
        }
      };
      return next;
    }),
    setLearningMode: (learningMode) => update((state) => {
      const lesson = getSelectedLesson(state);
      const next = {
        ...state,
        ui: {
          ...state.ui,
          learningMode
        },
        sessions: recordSession(state.sessions, learningMode, lesson.id, `Resume ${lesson.title}`)
      };
      return next;
    }),
    selectTopic: (topicId) => update((state) => {
      const topic = state.curriculum.subjects.flatMap((subject) => subject.topics).find((item) => item.id === topicId);
      const lessonId = topic?.subtopics[0]?.lessonIds[0] ?? state.ui.selectedLessonId;
      const questionId = state.lessons.find((lesson) => lesson.id === lessonId)?.practiceQuestionIds[0] ?? state.ui.practiceQuestionId;
      const next = {
        ...state,
        ui: {
          ...state.ui,
          selectedTopicId: topicId,
          selectedLessonId: lessonId,
          practiceQuestionId: questionId
        }
      };
      return next;
    }),
    selectLesson: (lessonId) => update((state) => {
      const lesson = state.lessons.find((item) => item.id === lessonId) ?? state.lessons[0];
      const next = {
        ...state,
        ui: {
          ...state.ui,
          selectedLessonId: lesson.id,
          selectedTopicId: lesson.topicId,
          practiceQuestionId: lesson.practiceQuestionIds[0]
        }
      };
      return next;
    }),
    selectPracticeQuestion: (questionId) => update((state) => {
      const next = {
        ...state,
        ui: {
          ...state.ui,
          practiceQuestionId: questionId
        }
      };
      return next;
    }),
    answerQuestion: (questionId, answer) => update((state) => {
      const question = getQuestionById(state, questionId);
      const evaluated = evaluateAnswer(question, answer);
      const lessonProgress = state.progress[question.lessonId];
      const updatedProgress = recalculateMastery({
        ...lessonProgress,
        answers: [evaluated, ...lessonProgress.answers],
        timeSpentMinutes: lessonProgress.timeSpentMinutes + 4,
        lastStage: lessonProgress.masteryLevel >= 70 || evaluated.isCorrect ? "mastery" : "practice"
      });
      const detail = `${question.prompt} => ${evaluated.isCorrect ? "correct" : "needs review"}`;
      const next = {
        ...state,
        progress: {
          ...state.progress,
          [question.lessonId]: updatedProgress
        },
        analytics: [
          createAnalyticsEvent("question_answered", detail),
          createAnalyticsEvent(
            "mastery_updated",
            `${question.lessonId} mastery ${updatedProgress.masteryLevel}%`
          ),
          ...state.analytics
        ]
      };
      return next;
    }),
    updateAskQuestion: (request) => update((state) => {
      const response = buildAskQuestionResponse(request);
      const next = {
        ...state,
        askQuestion: {
          request,
          response
        },
        analytics: [createAnalyticsEvent("ask_question_submitted", request.question), ...state.analytics]
      };
      return next;
    }),
    generateRevisionPlan: () => update((state) => {
      const topics = buildRevisionTopics(state);
      const selectedTopic = getSelectedTopic(state);
      const next = {
        ...state,
        revisionPlan: {
          ...state.revisionPlan,
          topics,
          quickSummary: `Revise ${selectedTopic.name} first, then work through the remaining topics using timed practice and mastery checks.`,
          weaknessDetection: state.progress[state.ui.selectedLessonId].masteryLevel >= 70 ? "Current mastery is strong. Maintain speed and accuracy with exam-style practice." : "Current mastery shows gaps. Revisit weak steps before doing timed revision."
        },
        analytics: [createAnalyticsEvent("revision_generated", topics.join(", ")), ...state.analytics]
      };
      return next;
    })
  };
}
const appState = createAppStore();
function AskQuestionWorkspace($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let state = $$props["state"];
    let question = state.askQuestion.request.question;
    let topic = state.askQuestion.request.topic;
    let subject = state.askQuestion.request.subject;
    let grade = state.askQuestion.request.grade;
    let currentAttempt = state.askQuestion.request.currentAttempt;
    $$renderer2.push(`<section class="workspace svelte-tc0v16"><header class="section-header svelte-tc0v16"><div><p class="eyebrow svelte-tc0v16">Ask Question</p> <h2 class="svelte-tc0v16">Guided problem-solving tutor</h2></div> <div class="pill svelte-tc0v16">${escape_html(state.askQuestion.response.responseStage)}</div></header> <div class="grid svelte-tc0v16"><article class="panel svelte-tc0v16"><h3 class="svelte-tc0v16">Student input</h3> <label class="svelte-tc0v16"><span class="svelte-tc0v16">Question</span> <textarea rows="4" class="svelte-tc0v16">`);
    const $$body = escape_html(question);
    if ($$body) {
      $$renderer2.push(`${$$body}`);
    }
    $$renderer2.push(`</textarea></label> <label class="svelte-tc0v16"><span class="svelte-tc0v16">Topic</span> <input${attr("value", topic)} class="svelte-tc0v16"/></label> <label class="svelte-tc0v16"><span class="svelte-tc0v16">Subject</span> <input${attr("value", subject)} class="svelte-tc0v16"/></label> <label class="svelte-tc0v16"><span class="svelte-tc0v16">Grade</span> <input${attr("value", grade)} class="svelte-tc0v16"/></label> <label class="svelte-tc0v16"><span class="svelte-tc0v16">Current attempt or working</span> <textarea rows="5" class="svelte-tc0v16">`);
    const $$body_1 = escape_html(currentAttempt);
    if ($$body_1) {
      $$renderer2.push(`${$$body_1}`);
    }
    $$renderer2.push(`</textarea></label> <button type="button" class="svelte-tc0v16">Generate guided response</button></article> <article class="panel svelte-tc0v16"><h3 class="svelte-tc0v16">AI response contract</h3> <p class="svelte-tc0v16"><strong>Problem type:</strong> ${escape_html(state.askQuestion.response.problemType)}</p> <p class="svelte-tc0v16"><strong>Student goal:</strong> ${escape_html(state.askQuestion.response.studentGoal)}</p> <p class="svelte-tc0v16"><strong>Diagnosis:</strong> ${escape_html(state.askQuestion.response.diagnosis)}</p> <p class="svelte-tc0v16"><strong>Response stage:</strong> ${escape_html(state.askQuestion.response.responseStage)}</p> <p class="svelte-tc0v16"><strong>Teacher response:</strong> ${escape_html(state.askQuestion.response.teacherResponse)}</p> <p class="svelte-tc0v16"><strong>Check for understanding:</strong> ${escape_html(state.askQuestion.response.checkForUnderstanding)}</p></article> <article class="panel full svelte-tc0v16"><h3 class="svelte-tc0v16">Guardrails</h3> <ul class="svelte-tc0v16"><li>Do not give the final answer before guidance unless the learner explicitly asks after attempting the problem.</li> <li>Respond to the learner’s working instead of restarting from scratch.</li> <li>Use one small hint, one question, or one guided step at a time.</li> <li>Correct misconceptions clearly and keep explanations age-appropriate.</li></ul></article></div></section>`);
    bind_props($$props, { state });
  });
}
function LessonWorkspace($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let state = $$props["state"];
    let answer = "";
    const lesson = state.lessons.find((item) => item.id === state.ui.selectedLessonId) ?? state.lessons[0];
    const practiceQuestion = state.questions.find((question) => question.id === state.ui.practiceQuestionId) ?? getQuestionById(state, lesson.practiceQuestionIds[0]);
    const progress = state.progress[lesson.id];
    $$renderer2.push(`<section class="workspace svelte-173ec6d"><header class="section-header svelte-173ec6d"><div><p class="eyebrow svelte-173ec6d">Lesson</p> <h2 class="svelte-173ec6d">${escape_html(lesson.title)}</h2></div> <div class="pill svelte-173ec6d">Mastery ${escape_html(progress.masteryLevel)}%</div></header> <div class="lesson-grid svelte-173ec6d"><article class="panel svelte-173ec6d"><h3 class="svelte-173ec6d">${escape_html(lesson.overview.title)}</h3> <p class="svelte-173ec6d">${escape_html(lesson.overview.body)}</p></article> <article class="panel svelte-173ec6d"><h3 class="svelte-173ec6d">${escape_html(lesson.deeperExplanation.title)}</h3> <p class="svelte-173ec6d">${escape_html(lesson.deeperExplanation.body)}</p></article> <article class="panel svelte-173ec6d"><h3 class="svelte-173ec6d">${escape_html(lesson.example.title)}</h3> <p class="svelte-173ec6d">${escape_html(lesson.example.body)}</p></article> <article class="panel svelte-173ec6d"><h3 class="svelte-173ec6d">Mastery Retry Loop</h3> <ol class="svelte-173ec6d"><li>Re-explain if the learner misses key ideas.</li> <li>Give a new example when mastery is below 70%.</li> <li>Retry practice before moving on.</li></ol></article></div> <div class="practice-grid svelte-173ec6d"><article class="panel svelte-173ec6d"><header class="compact-header svelte-173ec6d"><h3 class="svelte-173ec6d">Practice</h3> `);
    $$renderer2.select(
      {
        value: practiceQuestion.id,
        onchange: (event) => appState.selectPracticeQuestion(event.currentTarget.value),
        class: ""
      },
      ($$renderer3) => {
        $$renderer3.push(`<!--[-->`);
        const each_array = ensure_array_like(lesson.practiceQuestionIds);
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          let questionId = each_array[$$index];
          const question = getQuestionById(state, questionId);
          $$renderer3.option({ value: question.id }, ($$renderer4) => {
            $$renderer4.push(`${escape_html(question.prompt)}`);
          });
        }
        $$renderer3.push(`<!--]-->`);
      },
      "svelte-173ec6d"
    );
    $$renderer2.push(`</header> <p class="svelte-173ec6d">${escape_html(practiceQuestion.prompt)}</p> `);
    if (practiceQuestion.options) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<ul class="options svelte-173ec6d"><!--[-->`);
      const each_array_1 = ensure_array_like(practiceQuestion.options);
      for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
        let option = each_array_1[$$index_1];
        $$renderer2.push(`<li>${escape_html(option.label)}. ${escape_html(option.text)}</li>`);
      }
      $$renderer2.push(`<!--]--></ul>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <textarea rows="4" placeholder="Type your answer or show your working" class="svelte-173ec6d">`);
    const $$body = escape_html(answer);
    if ($$body) {
      $$renderer2.push(`${$$body}`);
    }
    $$renderer2.push(`</textarea> <div class="actions svelte-173ec6d"><button type="button" class="svelte-173ec6d">Check Answer</button></div> <p class="hint svelte-173ec6d">Hint ladder: ${escape_html(practiceQuestion.hintLevels.join(" / "))}</p> <p class="hint svelte-173ec6d">Explanation: ${escape_html(practiceQuestion.explanation)}</p></article> <article class="panel svelte-173ec6d"><h3 class="svelte-173ec6d">Progress Snapshot</h3> <p class="svelte-173ec6d">Completed: ${escape_html(progress.completed ? "Yes" : "Not yet")}</p> <p class="svelte-173ec6d">Last stage: ${escape_html(progress.lastStage)}</p> <p class="svelte-173ec6d">Time spent: ${escape_html(progress.timeSpentMinutes)} min</p> <p class="svelte-173ec6d">Weak areas: ${escape_html(progress.weakAreas.length > 0 ? progress.weakAreas.join(", ") : "None flagged")}</p> <h4 class="svelte-173ec6d">Recent answers</h4> <ul class="answers svelte-173ec6d"><!--[-->`);
    const each_array_2 = ensure_array_like(progress.answers.slice(0, 4));
    for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
      let item = each_array_2[$$index_2];
      $$renderer2.push(`<li>${escape_html(item.answer)} · ${escape_html(item.isCorrect ? "Correct" : "Review")} · ${escape_html(new Date(item.attemptedAt).toLocaleTimeString())}</li>`);
    }
    $$renderer2.push(`<!--]--></ul></article></div></section>`);
    bind_props($$props, { state });
  });
}
function ModePicker($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let value = $$props["value"];
    const options = [
      {
        id: "learn",
        label: "Learn",
        description: "Structured lesson flow with explanation, examples, practice, and mastery."
      },
      {
        id: "revision",
        label: "Revision",
        description: "Accelerated exam preparation with focus topics and weaknesses."
      },
      {
        id: "ask",
        label: "Ask Question",
        description: "Guided tutoring for a specific problem without answer dumping."
      }
    ];
    $$renderer2.push(`<div class="mode-grid svelte-p9wq1j"><!--[-->`);
    const each_array = ensure_array_like(options);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let option = each_array[$$index];
      $$renderer2.push(`<button type="button"${attr_class("mode-card svelte-p9wq1j", void 0, { "active": value === option.id })}><span class="svelte-p9wq1j">${escape_html(option.label)}</span> <small class="svelte-p9wq1j">${escape_html(option.description)}</small></button>`);
    }
    $$renderer2.push(`<!--]--></div>`);
    bind_props($$props, { value });
  });
}
function ProgressPanel($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let state = $$props["state"];
    const progressEntries = Object.values(state.progress);
    $$renderer2.push(`<section class="grid svelte-1g717fj"><article class="panel svelte-1g717fj"><h3 class="svelte-1g717fj">Student profile</h3> <p class="svelte-1g717fj">${escape_html(state.profile.fullName)}</p> <p class="svelte-1g717fj">${escape_html(state.profile.grade)} · ${escape_html(state.profile.curriculum)} · ${escape_html(state.profile.country)}</p> <p class="svelte-1g717fj">Role: ${escape_html(state.profile.role)}</p></article> <article class="panel svelte-1g717fj"><h3 class="svelte-1g717fj">Progress tracker</h3> <ul class="svelte-1g717fj"><!--[-->`);
    const each_array = ensure_array_like(progressEntries);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let item = each_array[$$index];
      $$renderer2.push(`<li>${escape_html(item.lessonId)}: ${escape_html(item.masteryLevel)}% mastery · ${escape_html(item.timeSpentMinutes)} min</li>`);
    }
    $$renderer2.push(`<!--]--></ul></article> <article class="panel svelte-1g717fj"><h3 class="svelte-1g717fj">Sessions</h3> <ul class="svelte-1g717fj"><!--[-->`);
    const each_array_1 = ensure_array_like(state.sessions.slice(0, 4));
    for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
      let session = each_array_1[$$index_1];
      $$renderer2.push(`<li>${escape_html(session.resumeLabel)} · ${escape_html(session.mode)} · ${escape_html(new Date(session.updatedAt).toLocaleString())}</li>`);
    }
    $$renderer2.push(`<!--]--></ul></article> <article class="panel svelte-1g717fj"><h3 class="svelte-1g717fj">Analytics</h3> <ul class="svelte-1g717fj"><!--[-->`);
    const each_array_2 = ensure_array_like(state.analytics.slice(0, 5));
    for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
      let event = each_array_2[$$index_2];
      $$renderer2.push(`<li>${escape_html(event.type)} · ${escape_html(event.detail)}</li>`);
    }
    $$renderer2.push(`<!--]--></ul></article></section>`);
    bind_props($$props, { state });
  });
}
function RevisionWorkspace($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let state = $$props["state"];
    const revisionPlan = state.revisionPlan;
    $$renderer2.push(`<section class="workspace svelte-o1xyyi"><header class="section-header svelte-o1xyyi"><div><p class="eyebrow svelte-o1xyyi">Exam Revision</p> <h2 class="svelte-o1xyyi">Accelerated revision path</h2></div> <button type="button" class="svelte-o1xyyi">Refresh Revision Plan</button></header> <div class="grid svelte-o1xyyi"><article class="panel svelte-o1xyyi"><h3 class="svelte-o1xyyi">Exam context</h3> <p class="svelte-o1xyyi">Subject: Mathematics</p> <p class="svelte-o1xyyi">Exam date: ${escape_html(revisionPlan.examDate)}</p> <p class="svelte-o1xyyi">Topics: ${escape_html(revisionPlan.topics.join(", "))}</p></article> <article class="panel svelte-o1xyyi"><h3 class="svelte-o1xyyi">Quick summary</h3> <p class="svelte-o1xyyi">${escape_html(revisionPlan.quickSummary)}</p></article> <article class="panel svelte-o1xyyi"><h3 class="svelte-o1xyyi">Key concepts</h3> <ul class="svelte-o1xyyi"><!--[-->`);
    const each_array = ensure_array_like(revisionPlan.keyConcepts);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let concept = each_array[$$index];
      $$renderer2.push(`<li>${escape_html(concept)}</li>`);
    }
    $$renderer2.push(`<!--]--></ul></article> <article class="panel svelte-o1xyyi"><h3 class="svelte-o1xyyi">Exam-style focus</h3> <ul class="svelte-o1xyyi"><!--[-->`);
    const each_array_1 = ensure_array_like(revisionPlan.examFocus);
    for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
      let focus = each_array_1[$$index_1];
      $$renderer2.push(`<li>${escape_html(focus)}</li>`);
    }
    $$renderer2.push(`<!--]--></ul></article> <article class="panel full svelte-o1xyyi"><h3 class="svelte-o1xyyi">Weakness detection</h3> <p class="svelte-o1xyyi">${escape_html(revisionPlan.weaknessDetection)}</p></article></div></section>`);
    bind_props($$props, { state });
  });
}
function ThemeToggle($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let theme = $$props["theme"];
    $$renderer2.push(`<div class="toggle svelte-1cmi4dh"><button type="button"${attr_class("svelte-1cmi4dh", void 0, { "active": theme === "light" })}>Light</button> <button type="button"${attr_class("svelte-1cmi4dh", void 0, { "active": theme === "dark" })}>Dark</button></div>`);
    bind_props($$props, { theme });
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let state = createInitialState();
    appState.subscribe((value) => {
      state = value;
    });
    const subject = derived(() => getSelectedSubject(state));
    const topic = derived(() => getSelectedTopic(state));
    head("1uha8ag", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Doceo</title>`);
      });
      $$renderer3.push(`<meta name="description" content="Structured AI-assisted learning platform for lessons, revision, and guided questions."/>`);
    });
    if (state) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="page-shell svelte-1uha8ag"><aside class="sidebar svelte-1uha8ag"><div class="brand svelte-1uha8ag"><p class="eyebrow svelte-1uha8ag">Doceo</p> <h1 class="svelte-1uha8ag">AI-assisted learning platform</h1> <p class="svelte-1uha8ag">Curriculum-aligned teaching with mastery progression, revision, and guided tutoring.</p></div> <div class="stack svelte-1uha8ag">`);
      ThemeToggle($$renderer2, { theme: state.ui.theme });
      $$renderer2.push(`<!----> <button type="button" class="reset svelte-1uha8ag">Reset Demo State</button></div> <section class="nav-panel svelte-1uha8ag"><p class="eyebrow svelte-1uha8ag">Curriculum</p> <h2 class="svelte-1uha8ag">${escape_html(subject().name)}</h2> <p class="svelte-1uha8ag">${escape_html(state.curriculum.country)} · ${escape_html(state.curriculum.name)} · ${escape_html(state.profile.grade)}</p> <label class="svelte-1uha8ag"><span class="svelte-1uha8ag">Topic</span> `);
      $$renderer2.select(
        {
          value: state.ui.selectedTopicId,
          onchange: (event) => appState.selectTopic(event.currentTarget.value),
          class: ""
        },
        ($$renderer3) => {
          $$renderer3.push(`<!--[-->`);
          const each_array = ensure_array_like(subject().topics);
          for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
            let item = each_array[$$index];
            $$renderer3.option({ value: item.id }, ($$renderer4) => {
              $$renderer4.push(`${escape_html(item.name)}`);
            });
          }
          $$renderer3.push(`<!--]-->`);
        },
        "svelte-1uha8ag"
      );
      $$renderer2.push(`</label> <label class="svelte-1uha8ag"><span class="svelte-1uha8ag">Lesson</span> `);
      $$renderer2.select(
        {
          value: state.ui.selectedLessonId,
          onchange: (event) => appState.selectLesson(event.currentTarget.value),
          class: ""
        },
        ($$renderer3) => {
          $$renderer3.push(`<!--[-->`);
          const each_array_1 = ensure_array_like(state.lessons.filter((lesson) => lesson.topicId === topic().id));
          for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
            let lesson = each_array_1[$$index_1];
            $$renderer3.option({ value: lesson.id }, ($$renderer4) => {
              $$renderer4.push(`${escape_html(lesson.title)}`);
            });
          }
          $$renderer3.push(`<!--]-->`);
        },
        "svelte-1uha8ag"
      );
      $$renderer2.push(`</label></section> `);
      ProgressPanel($$renderer2, { state });
      $$renderer2.push(`<!----></aside> <main class="content svelte-1uha8ag"><section class="hero svelte-1uha8ag"><div><p class="eyebrow svelte-1uha8ag">Structured teacher</p> <h2 class="svelte-1uha8ag">Learn, revise, and ask targeted questions without dropping into chatbot mode.</h2> <p class="svelte-1uha8ag">The platform keeps teaching stage, lesson state, mastery, sessions, and analytics in one typed flow.</p></div></section> `);
      ModePicker($$renderer2, { value: state.ui.learningMode });
      $$renderer2.push(`<!----> `);
      if (state.ui.learningMode === "learn") {
        $$renderer2.push("<!--[0-->");
        LessonWorkspace($$renderer2, { state });
      } else if (state.ui.learningMode === "revision") {
        $$renderer2.push("<!--[1-->");
        RevisionWorkspace($$renderer2, { state });
      } else {
        $$renderer2.push("<!--[-1-->");
        AskQuestionWorkspace($$renderer2, { state });
      }
      $$renderer2.push(`<!--]--></main></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}
export {
  _page as default
};
