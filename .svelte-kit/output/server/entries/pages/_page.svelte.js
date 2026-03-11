import { e as escape_html, a as attr, b as bind_props, c as ensure_array_like, d as attr_class, h as head } from "../../chunks/index.js";
import { g as goto } from "../../chunks/client.js";
import { w as writable } from "../../chunks/exports.js";
import { a as buildRevisionTopics, g as getSelectedTopic, b as buildAskQuestionResponse, d as getQuestionById, e as evaluateAnswer, r as recalculateMastery, f as getSelectedLesson, h as recordSession, c as createInitialState, i as getCompletionSummary, j as getWeakTopicLabels, k as getSelectedSubject, l as getLessonsForSelectedTopic } from "../../chunks/platform.js";
import { createClient } from "@supabase/supabase-js";
const supabaseUrl = "http://127.0.0.1:55121";
const supabaseAnonKey = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";
const supabase = createClient(supabaseUrl, supabaseAnonKey);
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
  async function syncState(next) {
    {
      return;
    }
  }
  function persistAndSync(next) {
    void syncState();
    return next;
  }
  return {
    subscribe,
    initializeRemoteState: async () => {
      {
        return;
      }
    },
    setScreen: (currentScreen) => update((state) => {
      const next = {
        ...state,
        ui: {
          ...state.ui,
          currentScreen
        }
      };
      return persistAndSync(next);
    }),
    completeOnboarding: (fullName, grade) => update((state) => {
      const next = {
        ...state,
        onboarding: {
          ...state.onboarding,
          completed: true
        },
        profile: {
          ...state.profile,
          fullName,
          grade
        },
        auth: {
          ...state.auth,
          status: "signed_in",
          error: null
        },
        ui: {
          ...state.ui,
          currentScreen: "dashboard"
        }
      };
      return persistAndSync(next);
    }),
    signIn: async (email, password) => {
      update((state) => ({
        ...state,
        auth: {
          status: "loading",
          error: null
        }
      }));
      if (!supabase) {
        update((state) => {
          const next = {
            ...state,
            auth: {
              status: "signed_in",
              error: null
            },
            profile: {
              ...state.profile,
              email
            },
            ui: {
              ...state.ui,
              currentScreen: state.onboarding.completed ? "dashboard" : "landing"
            }
          };
          return persistAndSync(next);
        });
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      update((state) => {
        const next = {
          ...state,
          auth: {
            status: error ? "signed_out" : "signed_in",
            error: error?.message ?? null
          },
          profile: {
            ...state.profile,
            email
          },
          ui: {
            ...state.ui,
            currentScreen: error ? state.ui.currentScreen : state.onboarding.completed ? "dashboard" : "landing"
          }
        };
        return persistAndSync(next);
      });
    },
    signUp: async (fullName, email, password) => {
      update((state) => ({
        ...state,
        auth: {
          status: "loading",
          error: null
        }
      }));
      if (!supabase) {
        update((state) => {
          const next = {
            ...state,
            auth: {
              status: "signed_in",
              error: null
            },
            profile: {
              ...state.profile,
              fullName,
              email
            }
          };
          return persistAndSync(next);
        });
        return;
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName
          }
        }
      });
      update((state) => {
        const next = {
          ...state,
          auth: {
            status: error ? "signed_out" : "signed_in",
            error: error?.message ?? null
          },
          profile: {
            ...state.profile,
            fullName,
            email
          }
        };
        return persistAndSync(next);
      });
    },
    signOut: async () => {
      if (supabase) {
        await supabase.auth.signOut();
      }
      update((state) => {
        const next = {
          ...createInitialState(),
          ui: {
            ...createInitialState().ui,
            theme: state.ui.theme
          }
        };
        return next;
      });
      await goto();
    },
    reset: () => {
      const state = createInitialState();
      persistAndSync(state);
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
      return persistAndSync(next);
    }),
    setLearningMode: (learningMode) => update((state) => {
      const lesson = getSelectedLesson(state);
      const next = {
        ...state,
        ui: {
          ...state.ui,
          learningMode,
          currentScreen: learningMode === "learn" ? "lesson" : learningMode === "revision" ? "revision" : "ask"
        },
        sessions: recordSession(state.sessions, learningMode, lesson.id, `Resume ${lesson.title}`)
      };
      return persistAndSync(next);
    }),
    selectSubject: (subjectId) => update((state) => {
      const subject = state.curriculum.subjects.find((item) => item.id === subjectId) ?? state.curriculum.subjects[0];
      const topic = subject.topics[0];
      const subtopic = topic.subtopics[0];
      const lessonId = subtopic.lessonIds[0] ?? state.ui.selectedLessonId;
      const lesson = state.lessons.find((item) => item.id === lessonId) ?? state.lessons[0];
      const next = {
        ...state,
        ui: {
          ...state.ui,
          currentScreen: "subject",
          selectedSubjectId: subject.id,
          selectedTopicId: topic.id,
          selectedSubtopicId: subtopic.id,
          selectedLessonId: lesson.id,
          practiceQuestionId: lesson.practiceQuestionIds[0]
        }
      };
      return persistAndSync(next);
    }),
    selectTopic: (topicId) => update((state) => {
      const topic = state.curriculum.subjects.flatMap((subject) => subject.topics).find((item) => item.id === topicId);
      const lessonId = topic?.subtopics[0]?.lessonIds[0] ?? state.ui.selectedLessonId;
      const questionId = state.lessons.find((lesson) => lesson.id === lessonId)?.practiceQuestionIds[0] ?? state.ui.practiceQuestionId;
      const next = {
        ...state,
        ui: {
          ...state.ui,
          currentScreen: "subject",
          selectedTopicId: topicId,
          selectedSubtopicId: topic?.subtopics[0]?.id ?? state.ui.selectedSubtopicId,
          selectedLessonId: lessonId,
          practiceQuestionId: questionId
        }
      };
      return persistAndSync(next);
    }),
    selectSubtopic: (subtopicId) => update((state) => {
      const topic = getSelectedTopic(state);
      const subtopic = topic.subtopics.find((item) => item.id === subtopicId) ?? topic.subtopics[0];
      const lessonId = subtopic.lessonIds[0] ?? state.ui.selectedLessonId;
      const lesson = state.lessons.find((item) => item.id === lessonId) ?? state.lessons[0];
      const next = {
        ...state,
        ui: {
          ...state.ui,
          selectedSubtopicId: subtopic.id,
          selectedLessonId: lesson.id,
          practiceQuestionId: lesson.practiceQuestionIds[0]
        }
      };
      return persistAndSync(next);
    }),
    selectLesson: (lessonId) => update((state) => {
      const lesson = state.lessons.find((item) => item.id === lessonId) ?? state.lessons[0];
      const next = {
        ...state,
        ui: {
          ...state.ui,
          currentScreen: "lesson",
          selectedLessonId: lesson.id,
          selectedTopicId: lesson.topicId,
          selectedSubtopicId: lesson.subtopicId,
          practiceQuestionId: lesson.practiceQuestionIds[0]
        }
      };
      return persistAndSync(next);
    }),
    selectPracticeQuestion: (questionId) => update((state) => {
      const next = {
        ...state,
        ui: {
          ...state.ui,
          practiceQuestionId: questionId
        }
      };
      return persistAndSync(next);
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
      return persistAndSync(next);
    }),
    updateAskQuestion: async (request) => {
      update((state) => {
        const next = {
          ...state,
          askQuestion: {
            ...state.askQuestion,
            request,
            response: buildAskQuestionResponse(request),
            provider: state.askQuestion.provider,
            isLoading: true,
            error: null
          },
          analytics: [createAnalyticsEvent("ask_question_submitted", request.question), ...state.analytics]
        };
        return next;
      });
      try {
        const response = await fetch("/api/ai/tutor", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            request,
            profileId: readState().profile.id
          })
        });
        const payload = await response.json();
        update((state) => {
          const next = {
            ...state,
            askQuestion: {
              request,
              response: payload.response,
              provider: payload.provider,
              isLoading: false,
              error: payload.error ?? null
            }
          };
          return persistAndSync(next);
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Tutor request failed";
        update((state) => {
          const next = {
            ...state,
            askQuestion: {
              ...state.askQuestion,
              request,
              response: buildAskQuestionResponse(request),
              provider: "local-fallback",
              isLoading: false,
              error: message
            }
          };
          return persistAndSync(next);
        });
      }
    },
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
      return persistAndSync(next);
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
    $$renderer2.push(`<section class="workspace svelte-tc0v16"><header class="section-header svelte-tc0v16"><div><p class="eyebrow svelte-tc0v16">Ask Question</p> <h2 class="svelte-tc0v16">Guided problem-solving tutor</h2></div> <div class="pill svelte-tc0v16">${escape_html(state.askQuestion.isLoading ? "loading" : state.askQuestion.response.responseStage)}</div></header> <div class="grid svelte-tc0v16"><article class="panel svelte-tc0v16"><h3 class="svelte-tc0v16">Student input</h3> <label class="svelte-tc0v16"><span class="svelte-tc0v16">Question</span> <textarea rows="4" class="svelte-tc0v16">`);
    const $$body = escape_html(question);
    if ($$body) {
      $$renderer2.push(`${$$body}`);
    }
    $$renderer2.push(`</textarea></label> <label class="svelte-tc0v16"><span class="svelte-tc0v16">Topic</span> <input${attr("value", topic)} class="svelte-tc0v16"/></label> <label class="svelte-tc0v16"><span class="svelte-tc0v16">Subject</span> <input${attr("value", subject)} class="svelte-tc0v16"/></label> <label class="svelte-tc0v16"><span class="svelte-tc0v16">Grade</span> <input${attr("value", grade)} class="svelte-tc0v16"/></label> <label class="svelte-tc0v16"><span class="svelte-tc0v16">Current attempt or working</span> <textarea rows="5" class="svelte-tc0v16">`);
    const $$body_1 = escape_html(currentAttempt);
    if ($$body_1) {
      $$renderer2.push(`${$$body_1}`);
    }
    $$renderer2.push(`</textarea></label> <button type="button"${attr("disabled", state.askQuestion.isLoading, true)} class="svelte-tc0v16">${escape_html(state.askQuestion.isLoading ? "Generating..." : "Generate guided response")}</button></article> <article class="panel svelte-tc0v16"><h3 class="svelte-tc0v16">Guidance</h3> <p class="svelte-tc0v16"><strong>Problem type:</strong> ${escape_html(state.askQuestion.response.problemType)}</p> <p class="svelte-tc0v16">${escape_html(state.askQuestion.response.teacherResponse)}</p> <p class="svelte-tc0v16"><strong>Next check:</strong> ${escape_html(state.askQuestion.response.checkForUnderstanding)}</p> `);
    if (state.askQuestion.error) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<p class="error svelte-tc0v16"><strong>Error:</strong> ${escape_html(state.askQuestion.error)}</p>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></article> <article class="panel full svelte-tc0v16"><h3 class="svelte-tc0v16">How this tutor responds</h3> <ul class="svelte-tc0v16"><li>Do not give the final answer before guidance unless the learner explicitly asks after attempting the problem.</li> <li>Respond to the learner’s working instead of restarting from scratch.</li> <li>Use one small hint, one question, or one guided step at a time.</li> <li>Correct misconceptions clearly and keep explanations age-appropriate.</li></ul></article></div></section>`);
    bind_props($$props, { state });
  });
}
function DashboardView($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let state = $$props["state"];
    const summary = getCompletionSummary(state);
    const weakTopics = getWeakTopicLabels(state);
    const continueLesson = state.lessons.find((lesson) => lesson.id === state.ui.selectedLessonId) ?? state.lessons[0];
    $$renderer2.push(`<section class="view svelte-1kfr389"><header class="hero card svelte-1kfr389"><p class="eyebrow svelte-1kfr389">Dashboard</p> <h2 class="svelte-1kfr389">Continue learning with a clear next step.</h2> <p class="svelte-1kfr389">Your main path is lesson first. Revision and ask-question sit beside it as support tools.</p> <div class="hero-actions svelte-1kfr389"><button type="button" class="svelte-1kfr389">Continue lesson</button> <button type="button" class="secondary svelte-1kfr389">Open revision</button></div></header> <div class="stats svelte-1kfr389"><article class="card svelte-1kfr389"><strong class="svelte-1kfr389">${escape_html(summary.completedLessons)}/${escape_html(summary.totalLessons)}</strong> <span class="svelte-1kfr389">Lessons completed</span></article> <article class="card svelte-1kfr389"><strong class="svelte-1kfr389">${escape_html(summary.averageMastery)}%</strong> <span class="svelte-1kfr389">Average mastery</span></article> <article class="card svelte-1kfr389"><strong class="svelte-1kfr389">${escape_html(state.sessions.length)}</strong> <span class="svelte-1kfr389">Saved sessions</span></article></div> <div class="grid svelte-1kfr389"><article class="card svelte-1kfr389"><p class="eyebrow svelte-1kfr389">Continue</p> <h3 class="svelte-1kfr389">${escape_html(continueLesson.title)}</h3> <p class="svelte-1kfr389">Resume the current lesson path with examples, practice, and mastery.</p> <button type="button" class="svelte-1kfr389">Open lesson</button></article> <article class="card svelte-1kfr389"><p class="eyebrow svelte-1kfr389">Weak areas</p> <h3 class="svelte-1kfr389">Topics needing attention</h3> <ul class="svelte-1kfr389"><!--[-->`);
    const each_array = ensure_array_like(weakTopics);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let topic = each_array[$$index];
      $$renderer2.push(`<li>${escape_html(topic)}</li>`);
    }
    $$renderer2.push(`<!--]--></ul></article> <article class="card svelte-1kfr389"><p class="eyebrow svelte-1kfr389">Revision</p> <h3 class="svelte-1kfr389">Exam preparation</h3> <p class="svelte-1kfr389">Generate a focused plan from the current subject and progress.</p> <button type="button" class="svelte-1kfr389">Go to revision</button></article></div></section>`);
    bind_props($$props, { state });
  });
}
function LandingView($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let state = $$props["state"];
    let authMode = "signup";
    let fullName = state.profile.fullName;
    let email = state.profile.email;
    let password = "";
    let grade = state.profile.grade;
    $$renderer2.push(`<section class="landing-shell svelte-stkfxm"><article class="intro card svelte-stkfxm"><p class="eyebrow svelte-stkfxm">Doceo</p> <h1 class="svelte-stkfxm">Structured learning, not chatbot drift.</h1> <p class="svelte-stkfxm">Learn a subject in order, revise with intent, and ask targeted questions when you are stuck.</p> <div class="bullet-grid svelte-stkfxm"><div class="svelte-stkfxm"><strong class="svelte-stkfxm">Dashboard</strong> <span class="svelte-stkfxm">Continue lessons and track weak areas.</span></div> <div class="svelte-stkfxm"><strong class="svelte-stkfxm">Lesson flow</strong> <span class="svelte-stkfxm">Overview, example, practice, mastery.</span></div> <div class="svelte-stkfxm"><strong class="svelte-stkfxm">Revision</strong> <span class="svelte-stkfxm">Condense the syllabus into focused exam preparation.</span></div> <div class="svelte-stkfxm"><strong class="svelte-stkfxm">Ask Question</strong> <span class="svelte-stkfxm">Get the next helpful step without answer dumping.</span></div></div></article> <article class="auth card svelte-stkfxm">`);
    if (state.auth.status === "signed_in" && !state.onboarding.completed) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<p class="eyebrow svelte-stkfxm">Onboarding</p> <h2 class="svelte-stkfxm">Set your learner profile</h2> <label class="svelte-stkfxm"><span class="svelte-stkfxm">Full name</span> <input${attr("value", fullName)} class="svelte-stkfxm"/></label> <label class="svelte-stkfxm"><span class="svelte-stkfxm">Grade</span> `);
      $$renderer2.select(
        { value: grade, class: "" },
        ($$renderer3) => {
          $$renderer3.option({}, ($$renderer4) => {
            $$renderer4.push(`Grade 6`);
          });
          $$renderer3.option({}, ($$renderer4) => {
            $$renderer4.push(`Grade 7`);
          });
          $$renderer3.option({}, ($$renderer4) => {
            $$renderer4.push(`Grade 8`);
          });
        },
        "svelte-stkfxm"
      );
      $$renderer2.push(`</label> <button type="button" class="svelte-stkfxm">Enter the student app</button>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<div class="tabs svelte-stkfxm"><button type="button"${attr_class("svelte-stkfxm", void 0, { "active": authMode === "signup" })}>Create account</button> <button type="button"${attr_class("svelte-stkfxm", void 0, { "active": authMode === "signin" })}>Sign in</button></div> <h2 class="svelte-stkfxm">${escape_html("Create your student account")}</h2> `);
      {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<label class="svelte-stkfxm"><span class="svelte-stkfxm">Full name</span> <input${attr("value", fullName)} class="svelte-stkfxm"/></label>`);
      }
      $$renderer2.push(`<!--]--> <label class="svelte-stkfxm"><span class="svelte-stkfxm">Email</span> <input${attr("value", email)} type="email" class="svelte-stkfxm"/></label> <label class="svelte-stkfxm"><span class="svelte-stkfxm">Password</span> <input${attr("value", password)} type="password" class="svelte-stkfxm"/></label> <button type="button"${attr("disabled", state.auth.status === "loading", true)} class="svelte-stkfxm">${escape_html(state.auth.status === "loading" ? "Working..." : "Create account")}</button> `);
      if (state.auth.error) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<p class="error svelte-stkfxm">${escape_html(state.auth.error)}</p>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></article></section>`);
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
function ProgressView($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let state = $$props["state"];
    $$renderer2.push(`<section class="view svelte-1qlvu86"><header class="card svelte-1qlvu86"><p class="eyebrow svelte-1qlvu86">Progress</p> <h2 class="svelte-1qlvu86">Track mastery and recent learning activity.</h2></header> <div class="grid svelte-1qlvu86"><!--[-->`);
    const each_array = ensure_array_like(Object.values(state.progress));
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let item = each_array[$$index];
      $$renderer2.push(`<article class="card svelte-1qlvu86"><h3 class="svelte-1qlvu86">${escape_html(item.lessonId)}</h3> <p class="svelte-1qlvu86">Mastery: ${escape_html(item.masteryLevel)}%</p> <p class="svelte-1qlvu86">Completed: ${escape_html(item.completed ? "Yes" : "Not yet")}</p> <p class="svelte-1qlvu86">Time spent: ${escape_html(item.timeSpentMinutes)} min</p> <p class="svelte-1qlvu86">Weak areas: ${escape_html(item.weakAreas.length > 0 ? item.weakAreas.join(", ") : "None flagged")}</p></article>`);
    }
    $$renderer2.push(`<!--]--></div></section>`);
    bind_props($$props, { state });
  });
}
function RevisionWorkspace($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let state = $$props["state"];
    const revisionPlan = state.revisionPlan;
    $$renderer2.push(`<section class="workspace svelte-o1xyyi"><header class="section-header svelte-o1xyyi"><div><p class="eyebrow svelte-o1xyyi">Exam Revision</p> <h2 class="svelte-o1xyyi">Accelerated revision path</h2></div> <button type="button" class="svelte-o1xyyi">Refresh plan</button></header> <div class="grid svelte-o1xyyi"><article class="panel svelte-o1xyyi"><h3 class="svelte-o1xyyi">Exam context</h3> <p class="svelte-o1xyyi">Subject: Mathematics</p> <p class="svelte-o1xyyi">Exam date: ${escape_html(revisionPlan.examDate)}</p> <p class="svelte-o1xyyi">Topics: ${escape_html(revisionPlan.topics.join(", "))}</p></article> <article class="panel svelte-o1xyyi"><h3 class="svelte-o1xyyi">Quick summary</h3> <p class="svelte-o1xyyi">${escape_html(revisionPlan.quickSummary)}</p></article> <article class="panel svelte-o1xyyi"><h3 class="svelte-o1xyyi">Key concepts</h3> <ul class="svelte-o1xyyi"><!--[-->`);
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
function StudentNav($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let state = $$props["state"];
    const links = [
      { id: "dashboard", label: "Dashboard" },
      { id: "subject", label: "Subject" },
      { id: "lesson", label: "Lesson" },
      { id: "revision", label: "Revision" },
      { id: "ask", label: "Ask Question" },
      { id: "progress", label: "Progress" }
    ];
    $$renderer2.push(`<aside class="sidebar svelte-gwv0ec"><div class="brand svelte-gwv0ec"><p class="eyebrow svelte-gwv0ec">Doceo</p> <h1 class="svelte-gwv0ec">${escape_html(state.profile.fullName)}</h1> <p class="svelte-gwv0ec">${escape_html(state.profile.grade)} · ${escape_html(state.profile.curriculum)} · ${escape_html(state.profile.country)}</p></div> `);
    ThemeToggle($$renderer2, { theme: state.ui.theme });
    $$renderer2.push(`<!----> <nav class="nav svelte-gwv0ec"><!--[-->`);
    const each_array = ensure_array_like(links);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let link = each_array[$$index];
      $$renderer2.push(`<button type="button"${attr_class("svelte-gwv0ec", void 0, { "active": state.ui.currentScreen === link.id })}>${escape_html(link.label)}</button>`);
    }
    $$renderer2.push(`<!--]--></nav> <section class="card svelte-gwv0ec"><p class="eyebrow svelte-gwv0ec">Current subject</p> <h2 class="svelte-gwv0ec">${escape_html(state.curriculum.subjects.find((item) => item.id === state.ui.selectedSubjectId)?.name)}</h2> <label class="svelte-gwv0ec"><span class="svelte-gwv0ec">Subject</span> `);
    $$renderer2.select(
      {
        value: state.ui.selectedSubjectId,
        onchange: (event) => appState.selectSubject(event.currentTarget.value),
        class: ""
      },
      ($$renderer3) => {
        $$renderer3.push(`<!--[-->`);
        const each_array_1 = ensure_array_like(state.curriculum.subjects);
        for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
          let subject = each_array_1[$$index_1];
          $$renderer3.option({ value: subject.id }, ($$renderer4) => {
            $$renderer4.push(`${escape_html(subject.name)}`);
          });
        }
        $$renderer3.push(`<!--]-->`);
      },
      "svelte-gwv0ec"
    );
    $$renderer2.push(`</label></section> <button type="button" class="signout svelte-gwv0ec">Sign out</button></aside>`);
    bind_props($$props, { state });
  });
}
function SubjectView($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let state = $$props["state"];
    const subject = getSelectedSubject(state);
    const topic = getSelectedTopic(state);
    const lessons = getLessonsForSelectedTopic(state);
    $$renderer2.push(`<section class="view svelte-1518sz9"><header class="card svelte-1518sz9"><p class="eyebrow svelte-1518sz9">Subject</p> <h2 class="svelte-1518sz9">${escape_html(subject.name)}</h2> <p class="svelte-1518sz9">Follow the topic roadmap in order so each lesson builds on the previous one.</p></header> <div class="grid svelte-1518sz9"><article class="card svelte-1518sz9"><h3 class="svelte-1518sz9">Topics</h3> <div class="stack svelte-1518sz9"><!--[-->`);
    const each_array = ensure_array_like(subject.topics);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let item = each_array[$$index];
      $$renderer2.push(`<button type="button"${attr_class("svelte-1518sz9", void 0, { "active": item.id === topic.id })}>${escape_html(item.name)}</button>`);
    }
    $$renderer2.push(`<!--]--></div></article> <article class="card svelte-1518sz9"><h3 class="svelte-1518sz9">Subtopics</h3> <div class="stack svelte-1518sz9"><!--[-->`);
    const each_array_1 = ensure_array_like(topic.subtopics);
    for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
      let subtopic = each_array_1[$$index_1];
      $$renderer2.push(`<button type="button"${attr_class("svelte-1518sz9", void 0, { "active": subtopic.id === state.ui.selectedSubtopicId })}>${escape_html(subtopic.name)}</button>`);
    }
    $$renderer2.push(`<!--]--></div></article> <article class="card svelte-1518sz9"><h3 class="svelte-1518sz9">Lessons</h3> <div class="stack svelte-1518sz9"><!--[-->`);
    const each_array_2 = ensure_array_like(lessons);
    for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
      let lesson = each_array_2[$$index_2];
      $$renderer2.push(`<button type="button"${attr_class("svelte-1518sz9", void 0, { "active": lesson.id === state.ui.selectedLessonId })}>${escape_html(lesson.title)}</button>`);
    }
    $$renderer2.push(`<!--]--></div></article></div></section>`);
    bind_props($$props, { state });
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let state = createInitialState();
    appState.subscribe((value) => {
      state = value;
    });
    head("1uha8ag", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Doceo</title>`);
      });
      $$renderer3.push(`<meta name="description" content="Structured school learning with lessons, revision, progress tracking, and guided tutoring."/>`);
    });
    if (state.ui.currentScreen === "landing" || state.auth.status === "signed_out" || !state.onboarding.completed) {
      $$renderer2.push("<!--[0-->");
      LandingView($$renderer2, { state });
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<div class="app-shell svelte-1uha8ag">`);
      StudentNav($$renderer2, { state });
      $$renderer2.push(`<!----> <main class="main-content svelte-1uha8ag">`);
      if (state.ui.currentScreen === "dashboard") {
        $$renderer2.push("<!--[0-->");
        DashboardView($$renderer2, { state });
      } else if (state.ui.currentScreen === "subject") {
        $$renderer2.push("<!--[1-->");
        SubjectView($$renderer2, { state });
      } else if (state.ui.currentScreen === "lesson") {
        $$renderer2.push("<!--[2-->");
        LessonWorkspace($$renderer2, { state });
      } else if (state.ui.currentScreen === "revision") {
        $$renderer2.push("<!--[3-->");
        RevisionWorkspace($$renderer2, { state });
      } else if (state.ui.currentScreen === "ask") {
        $$renderer2.push("<!--[4-->");
        AskQuestionWorkspace($$renderer2, { state });
      } else {
        $$renderer2.push("<!--[-1-->");
        ProgressView($$renderer2, { state });
      }
      $$renderer2.push(`<!--]--></main></div>`);
    }
    $$renderer2.push(`<!--]-->`);
  });
}
export {
  _page as default
};
