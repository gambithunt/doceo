import { w as writable, e as escape_html, a as attr, c as bind_props, d as ensure_array_like, f as derived, h as attr_class, i as attr_style, j as head } from "../../chunks/svelte-vendor.js";
import { g as goto } from "../../chunks/client.js";
import { a as buildRevisionTopics, g as getSelectedTopic, b as buildAskQuestionResponse, d as getQuestionById, e as evaluateAnswer, r as recalculateMastery, c as createInitialState, f as getSelectedLesson, h as recordSession, i as getCompletionSummary, j as getWeakTopicLabels, k as getSelectedSubject, l as getLessonsForSelectedTopic } from "../../chunks/platform.js";
import { createClient } from "@supabase/supabase-js";
import { g as getRecommendedSubject } from "../../chunks/onboarding.js";
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
function deduplicateSubjects(subjects) {
  return Array.from(new Set(subjects.map((subject) => subject.trim()).filter((subject) => subject.length > 0)));
}
async function fetchOptions(query) {
  const response = await fetch(`/api/onboarding/options?${query}`);
  const payload = await response.json();
  return payload.options;
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
  async function syncOnboardingProgress(next) {
    {
      return;
    }
  }
  return {
    subscribe,
    initializeRemoteState: async () => {
      {
        return;
      }
    },
    setTheme: (theme) => update((state) => persistAndSync({ ...state, ui: { ...state.ui, theme } })),
    setScreen: (currentScreen) => update((state) => persistAndSync({ ...state, ui: { ...state.ui, currentScreen } })),
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
    setOnboardingStep: (currentStep) => update(
      (state) => persistAndSync({
        ...state,
        onboarding: {
          ...state.onboarding,
          currentStep
        },
        ui: {
          ...state.ui,
          currentScreen: "onboarding"
        }
      })
    ),
    setOnboardingSchoolYear: (schoolYear) => update((state) => {
      const next = persistAndSync({
        ...state,
        onboarding: {
          ...state.onboarding,
          schoolYear
        }
      });
      void syncOnboardingProgress();
      return next;
    }),
    setOnboardingTerm: (term) => update((state) => {
      const next = persistAndSync({
        ...state,
        onboarding: {
          ...state.onboarding,
          term
        }
      });
      void syncOnboardingProgress();
      return next;
    }),
    selectOnboardingCountry: async (countryId) => {
      const curriculums = await fetchOptions(`type=curriculums&countryId=${countryId}`);
      const curriculum = curriculums[0];
      const grades = curriculum ? await fetchOptions(`type=grades&curriculumId=${curriculum.id}`) : [];
      const grade = grades[0];
      const subjects = curriculum && grade ? await fetchOptions(
        `type=subjects&curriculumId=${curriculum.id}&gradeId=${grade.id}`
      ) : [];
      update((state) => {
        const next = {
          ...state,
          onboarding: {
            ...state.onboarding,
            selectedCountryId: countryId,
            selectedCurriculumId: curriculum?.id ?? "",
            selectedGradeId: grade?.id ?? "",
            selectedSubjectIds: [],
            selectedSubjectNames: [],
            customSubjects: [],
            customSubjectInput: "",
            error: null,
            options: {
              ...state.onboarding.options,
              curriculums,
              grades,
              subjects
            }
          }
        };
        void syncOnboardingProgress();
        return persistAndSync(next);
      });
    },
    selectOnboardingCurriculum: async (curriculumId) => {
      const grades = await fetchOptions(`type=grades&curriculumId=${curriculumId}`);
      const grade = grades[0];
      const subjects = grade ? await fetchOptions(
        `type=subjects&curriculumId=${curriculumId}&gradeId=${grade.id}`
      ) : [];
      update((state) => {
        const next = {
          ...state,
          onboarding: {
            ...state.onboarding,
            selectedCurriculumId: curriculumId,
            selectedGradeId: grade?.id ?? "",
            selectedSubjectIds: [],
            selectedSubjectNames: [],
            customSubjects: [],
            customSubjectInput: "",
            options: {
              ...state.onboarding.options,
              grades,
              subjects
            }
          }
        };
        void syncOnboardingProgress();
        return persistAndSync(next);
      });
    },
    selectOnboardingGrade: async (gradeId) => {
      update((state) => ({
        ...state,
        onboarding: {
          ...state.onboarding,
          isSaving: true,
          selectedGradeId: gradeId
        }
      }));
      const currentState = readState();
      const subjects = await fetchOptions(
        `type=subjects&curriculumId=${currentState.onboarding.selectedCurriculumId}&gradeId=${gradeId}`
      );
      update((state) => {
        const next = {
          ...state,
          onboarding: {
            ...state.onboarding,
            isSaving: false,
            selectedGradeId: gradeId,
            selectedSubjectIds: [],
            selectedSubjectNames: [],
            customSubjects: [],
            customSubjectInput: "",
            options: {
              ...state.onboarding.options,
              subjects
            }
          }
        };
        void syncOnboardingProgress();
        return persistAndSync(next);
      });
    },
    toggleOnboardingSubject: (subjectId) => update((state) => {
      const isSelected = state.onboarding.selectedSubjectIds.includes(subjectId);
      const selectedSubjectIds = isSelected ? state.onboarding.selectedSubjectIds.filter((item) => item !== subjectId) : [...state.onboarding.selectedSubjectIds, subjectId];
      const selectedSubjectNames = state.onboarding.options.subjects.filter((subject) => selectedSubjectIds.includes(subject.id)).map((subject) => subject.name);
      const next = {
        ...state,
        onboarding: {
          ...state.onboarding,
          selectedSubjectIds,
          selectedSubjectNames,
          selectionMode: selectedSubjectIds.length > 0 || state.onboarding.customSubjects.length > 0 ? state.onboarding.customSubjects.length > 0 ? "mixed" : "structured" : state.onboarding.selectionMode
        }
      };
      void syncOnboardingProgress();
      return persistAndSync(next);
    }),
    setOnboardingCustomSubjectInput: (customSubjectInput) => update((state) => {
      const next = persistAndSync({
        ...state,
        onboarding: {
          ...state.onboarding,
          customSubjectInput
        }
      });
      return next;
    }),
    addOnboardingCustomSubject: () => update((state) => {
      const nextCustomSubjects = deduplicateSubjects([
        ...state.onboarding.customSubjects,
        state.onboarding.customSubjectInput
      ]);
      const next = {
        ...state,
        onboarding: {
          ...state.onboarding,
          customSubjects: nextCustomSubjects,
          customSubjectInput: "",
          selectionMode: state.onboarding.selectedSubjectIds.length > 0 ? "mixed" : "structured"
        }
      };
      void syncOnboardingProgress();
      return persistAndSync(next);
    }),
    removeOnboardingCustomSubject: (subjectName) => update((state) => {
      const nextCustomSubjects = state.onboarding.customSubjects.filter((item) => item !== subjectName);
      const next = {
        ...state,
        onboarding: {
          ...state.onboarding,
          customSubjects: nextCustomSubjects,
          selectionMode: nextCustomSubjects.length === 0 && state.onboarding.selectedSubjectIds.length === 0 ? "unsure" : nextCustomSubjects.length > 0 && state.onboarding.selectedSubjectIds.length > 0 ? "mixed" : "structured"
        }
      };
      void syncOnboardingProgress();
      return persistAndSync(next);
    }),
    setOnboardingUnsure: (isUnsure) => update((state) => {
      const next = {
        ...state,
        onboarding: {
          ...state.onboarding,
          selectionMode: isUnsure ? "unsure" : state.onboarding.customSubjects.length > 0 && state.onboarding.selectedSubjectIds.length > 0 ? "mixed" : "structured"
        }
      };
      void syncOnboardingProgress();
      return persistAndSync(next);
    }),
    completeOnboarding: async (fullName, gradeLabel) => {
      update((state) => ({
        ...state,
        onboarding: {
          ...state.onboarding,
          isSaving: true,
          error: null
        }
      }));
      const snapshot = readState();
      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          profileId: snapshot.profile.id,
          countryId: snapshot.onboarding.selectedCountryId,
          curriculumId: snapshot.onboarding.selectedCurriculumId,
          gradeId: snapshot.onboarding.selectedGradeId,
          schoolYear: snapshot.onboarding.schoolYear,
          term: snapshot.onboarding.term,
          selectedSubjectIds: snapshot.onboarding.selectedSubjectIds,
          selectedSubjectNames: snapshot.onboarding.selectedSubjectNames,
          customSubjects: snapshot.onboarding.customSubjects,
          isUnsure: snapshot.onboarding.selectionMode === "unsure"
        })
      });
      const payload = await response.json();
      update((state) => {
        const curriculum = state.onboarding.options.curriculums.find(
          (item) => item.id === state.onboarding.selectedCurriculumId
        ) ?? state.onboarding.options.curriculums[0];
        const country = state.onboarding.options.countries.find((item) => item.id === state.onboarding.selectedCountryId) ?? state.onboarding.options.countries[0];
        const grade = state.onboarding.options.grades.find((item) => item.id === state.onboarding.selectedGradeId) ?? state.onboarding.options.grades[0];
        const next = {
          ...state,
          onboarding: {
            ...state.onboarding,
            completed: true,
            completedAt: (/* @__PURE__ */ new Date()).toISOString(),
            currentStep: "review",
            isSaving: false,
            recommendation: payload.recommendation,
            selectionMode: payload.selectionMode
          },
          profile: {
            ...state.profile,
            fullName,
            grade: gradeLabel,
            gradeId: grade?.id ?? state.profile.gradeId,
            country: country?.name ?? state.profile.country,
            countryId: country?.id ?? state.profile.countryId,
            curriculum: curriculum?.name ?? state.profile.curriculum,
            curriculumId: curriculum?.id ?? state.profile.curriculumId,
            schoolYear: state.onboarding.schoolYear,
            term: state.onboarding.term,
            recommendedStartSubjectId: payload.recommendation.subjectId,
            recommendedStartSubjectName: payload.recommendation.subjectName
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
      });
    },
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
              currentScreen: state.onboarding.completed ? "dashboard" : "onboarding"
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
            currentScreen: error ? state.ui.currentScreen : state.onboarding.completed ? "dashboard" : "onboarding"
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
            },
            ui: {
              ...state.ui,
              currentScreen: "onboarding"
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
          },
          ui: {
            ...state.ui,
            currentScreen: error ? state.ui.currentScreen : "onboarding"
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
        const initial = createInitialState();
        const next = {
          ...initial,
          ui: {
            ...initial.ui,
            theme: state.ui.theme
          }
        };
        return next;
      });
      await goto();
    },
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
    selectPracticeQuestion: (questionId) => update(
      (state) => persistAndSync({
        ...state,
        ui: {
          ...state.ui,
          practiceQuestionId: questionId
        }
      })
    ),
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
    const { state } = $$props;
    const summary = derived(() => getCompletionSummary(state));
    const weakTopics = derived(() => getWeakTopicLabels(state));
    const continueLesson = derived(() => state.lessons.find((lesson) => lesson.id === state.ui.selectedLessonId) ?? state.lessons[0]);
    const selectedSubjects = derived(() => state.onboarding.selectedSubjectNames);
    const focusSubjects = derived(() => selectedSubjects().length > 0 ? selectedSubjects() : ["Mathematics"]);
    $$renderer2.push(`<section class="view svelte-1kfr389"><header class="hero card svelte-1kfr389"><div class="hero-copy svelte-1kfr389"><p class="eyebrow svelte-1kfr389">Dashboard</p> <h2 class="svelte-1kfr389">Learning, shaped around your actual school context.</h2> <p class="svelte-1kfr389">${escape_html(state.profile.schoolYear)} ${escape_html(state.profile.term)} is centered on ${escape_html(focusSubjects().join(", "))}. Lessons stay primary, with revision and ask-question as support tools.</p></div> <div class="hero-actions svelte-1kfr389"><button type="button" class="svelte-1kfr389">Continue lesson</button> <button type="button" class="secondary svelte-1kfr389">Open revision</button></div></header> <div class="stats svelte-1kfr389"><article class="card stat-card svelte-1kfr389"><strong class="svelte-1kfr389">${escape_html(summary().completedLessons)}/${escape_html(summary().totalLessons)}</strong> <span class="svelte-1kfr389">Lessons completed</span></article> <article class="card stat-card svelte-1kfr389"><strong class="svelte-1kfr389">${escape_html(summary().averageMastery)}%</strong> <span class="svelte-1kfr389">Average mastery</span></article> <article class="card stat-card svelte-1kfr389"><strong class="svelte-1kfr389">${escape_html(state.sessions.length)}</strong> <span class="svelte-1kfr389">Saved sessions</span></article></div> <div class="grid svelte-1kfr389"><article class="card svelte-1kfr389"><p class="eyebrow svelte-1kfr389">Continue</p> <h3 class="svelte-1kfr389">${escape_html(continueLesson().title)}</h3> <p class="svelte-1kfr389">Resume the current lesson path with explanation, example, practice, and mastery.</p> <div class="meta svelte-1kfr389"><span class="svelte-1kfr389">Recommended start</span> <strong class="svelte-1kfr389">${escape_html(state.profile.recommendedStartSubjectName ?? "Choose a subject in settings")}</strong></div> <button type="button" class="svelte-1kfr389">Open lesson</button></article> <article class="card svelte-1kfr389"><p class="eyebrow svelte-1kfr389">Subject focus</p> <h3 class="svelte-1kfr389">Selected subjects</h3> <div class="subject-pills svelte-1kfr389"><!--[-->`);
    const each_array = ensure_array_like(focusSubjects());
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let subject = each_array[$$index];
      $$renderer2.push(`<span class="svelte-1kfr389">${escape_html(subject)}</span>`);
    }
    $$renderer2.push(`<!--]--> <!--[-->`);
    const each_array_1 = ensure_array_like(state.onboarding.customSubjects);
    for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
      let subject = each_array_1[$$index_1];
      $$renderer2.push(`<span class="soft svelte-1kfr389">${escape_html(subject)}</span>`);
    }
    $$renderer2.push(`<!--]--></div> <p class="svelte-1kfr389">The dashboard stays constrained to the subjects you selected during onboarding.</p></article> <article class="card svelte-1kfr389"><p class="eyebrow svelte-1kfr389">Weak areas</p> <h3 class="svelte-1kfr389">Topics needing attention</h3> <ul class="svelte-1kfr389"><!--[-->`);
    const each_array_2 = ensure_array_like(weakTopics());
    for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
      let topic = each_array_2[$$index_2];
      $$renderer2.push(`<li>${escape_html(topic)}</li>`);
    }
    $$renderer2.push(`<!--]--></ul></article> <article class="card svelte-1kfr389"><p class="eyebrow svelte-1kfr389">Revision</p> <h3 class="svelte-1kfr389">Exam preparation</h3> <p class="svelte-1kfr389">Generate a focused plan from the current subject and mastery data.</p> <button type="button" class="secondary svelte-1kfr389">Go to revision</button></article></div></section>`);
  });
}
function ThemeToggle($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let theme = $$props["theme"];
    $$renderer2.push(`<div class="toggle svelte-1cmi4dh"><button type="button"${attr_class("svelte-1cmi4dh", void 0, { "active": theme === "light" })}>Light</button> <button type="button"${attr_class("svelte-1cmi4dh", void 0, { "active": theme === "dark" })}>Dark</button></div>`);
    bind_props($$props, { theme });
  });
}
function LandingView($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const { state: viewState } = $$props;
    let authMode = "signup";
    let fullName = "";
    let email = "";
    let password = "";
    $$renderer2.push(`<section class="landing-shell svelte-stkfxm"><article class="intro card svelte-stkfxm"><div class="topbar svelte-stkfxm"><p class="eyebrow svelte-stkfxm">Doceo</p> `);
    ThemeToggle($$renderer2, { theme: viewState.ui.theme });
    $$renderer2.push(`<!----></div> <div class="intro-copy svelte-stkfxm"><h1 class="svelte-stkfxm">Structured learning, not chatbot drift.</h1> <p class="svelte-stkfxm">Learn in order, revise with intent, and ask focused questions only when you need the next step.</p></div> <div class="intro-summary svelte-stkfxm"><strong class="svelte-stkfxm">Built for students who want a clear path.</strong> <span class="svelte-stkfxm">South Africa first. Curriculum-aware from the moment onboarding starts.</span></div> <div class="bullet-grid svelte-stkfxm"><div class="svelte-stkfxm"><strong class="svelte-stkfxm">Dashboard</strong> <span class="svelte-stkfxm">Continue lessons and track weak areas.</span></div> <div class="svelte-stkfxm"><strong class="svelte-stkfxm">Lesson flow</strong> <span class="svelte-stkfxm">Overview, example, practice, mastery.</span></div> <div class="svelte-stkfxm"><strong class="svelte-stkfxm">Revision</strong> <span class="svelte-stkfxm">Condense the syllabus into focused exam preparation.</span></div> <div class="svelte-stkfxm"><strong class="svelte-stkfxm">Ask Question</strong> <span class="svelte-stkfxm">Get the next helpful step without answer dumping.</span></div></div></article> <article class="auth card svelte-stkfxm"><div class="tabs svelte-stkfxm"><button type="button"${attr_class("svelte-stkfxm", void 0, { "active": authMode === "signup" })}>Create account</button> <button type="button"${attr_class("svelte-stkfxm", void 0, { "active": authMode === "signin" })}>Sign in</button></div> <h2 class="svelte-stkfxm">${escape_html("Create your student account")}</h2> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<label class="svelte-stkfxm"><span class="svelte-stkfxm">Full name</span> <input${attr("value", fullName)} class="svelte-stkfxm"/></label>`);
    }
    $$renderer2.push(`<!--]--> <label class="svelte-stkfxm"><span class="svelte-stkfxm">Email</span> <input${attr("value", email)} type="email" class="svelte-stkfxm"/></label> <label class="svelte-stkfxm"><span class="svelte-stkfxm">Password</span> <input${attr("value", password)} type="password" class="svelte-stkfxm"/></label> <button type="button"${attr("disabled", viewState.auth.status === "loading", true)} class="svelte-stkfxm">${escape_html(viewState.auth.status === "loading" ? "Working..." : "Create account")}</button> `);
    if (viewState.auth.error) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<p class="error svelte-stkfxm">${escape_html(viewState.auth.error)}</p>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></article></section>`);
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
function OnboardingWizard($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const { state } = $$props;
    const stepLabels = {
      country: "Country",
      academic: "Curriculum and grade",
      subjects: "Subjects",
      review: "Review"
    };
    const stepIndex = derived(() => state.onboarding.stepOrder.indexOf(state.onboarding.currentStep));
    const currentGradeLabel = derived(() => state.onboarding.options.grades.find((grade) => grade.id === state.onboarding.selectedGradeId)?.label ?? state.profile.grade);
    const liveRecommendation = derived(() => getRecommendedSubject(state.onboarding.selectedSubjectIds, state.onboarding.customSubjects, state.onboarding.options.subjects));
    const selectedCount = derived(() => state.onboarding.selectedSubjectIds.length + state.onboarding.customSubjects.length);
    function canContinue() {
      if (state.onboarding.currentStep === "country") {
        return state.onboarding.selectedCountryId.length > 0;
      }
      if (state.onboarding.currentStep === "academic") {
        return state.onboarding.selectedCurriculumId.length > 0 && state.onboarding.selectedGradeId.length > 0 && state.onboarding.schoolYear.length === 4 && state.onboarding.term.length > 0;
      }
      if (state.onboarding.currentStep === "subjects") {
        return state.onboarding.selectedSubjectIds.length > 0 || state.onboarding.customSubjects.length > 0 || state.onboarding.selectionMode === "unsure";
      }
      return true;
    }
    function groupedSubjects(category) {
      return state.onboarding.options.subjects.filter((subject) => subject.category === category);
    }
    $$renderer2.push(`<section class="wizard-shell svelte-14holku"><header class="hero card svelte-14holku"><div class="hero-copy svelte-14holku"><p class="eyebrow svelte-14holku">Student setup</p> <h1 class="svelte-14holku">Build a student profile that keeps the app relevant from the first screen.</h1> <p class="svelte-14holku">This takes four short steps. We use your country, curriculum, grade, term, and subjects to tailor the dashboard and recommend where to begin.</p></div> <div class="hero-meta svelte-14holku"><span class="svelte-14holku">Step ${escape_html(stepIndex() + 1)} of ${escape_html(state.onboarding.stepOrder.length)}</span> <div class="progress-track svelte-14holku"><div class="progress-fill svelte-14holku"${attr_style(`width:${(stepIndex() + 1) / state.onboarding.stepOrder.length * 100}%`)}></div></div> <p class="svelte-14holku">${escape_html(selectedCount())} subject${escape_html(selectedCount() === 1 ? "" : "s")} currently selected</p></div></header> <div class="content-grid svelte-14holku"><aside class="steps card svelte-14holku"><!--[-->`);
    const each_array = ensure_array_like(state.onboarding.stepOrder);
    for (let index = 0, $$length = each_array.length; index < $$length; index++) {
      let step = each_array[index];
      $$renderer2.push(`<button type="button"${attr_class("step-card svelte-14holku", void 0, { "active": state.onboarding.currentStep === step })}><span class="svelte-14holku">${escape_html(index + 1)}</span> <div class="svelte-14holku"><strong class="svelte-14holku">${escape_html(stepLabels[step])}</strong> <small class="svelte-14holku">${escape_html(step === "country" ? "Top-level school context" : step === "academic" ? "Curriculum, grade, year, term" : step === "subjects" ? "Everything you actually study" : "Final check before entry")}</small></div></button>`);
    }
    $$renderer2.push(`<!--]--> <div class="summary-card svelte-14holku"><p class="eyebrow svelte-14holku">Live summary</p> <div class="summary-row svelte-14holku"><span class="svelte-14holku">Country</span> <strong class="svelte-14holku">${escape_html(state.onboarding.options.countries.find((country) => country.id === state.onboarding.selectedCountryId)?.name ?? "Not chosen")}</strong></div> <div class="summary-row svelte-14holku"><span class="svelte-14holku">Curriculum</span> <strong class="svelte-14holku">${escape_html(state.onboarding.options.curriculums.find((curriculum) => curriculum.id === state.onboarding.selectedCurriculumId)?.name ?? "Not chosen")}</strong></div> <div class="summary-row svelte-14holku"><span class="svelte-14holku">Grade</span> <strong class="svelte-14holku">${escape_html(currentGradeLabel())}</strong></div> <div class="summary-row svelte-14holku"><span class="svelte-14holku">Recommended start</span> <strong class="svelte-14holku">${escape_html(liveRecommendation().subjectName ?? "Pending")}</strong></div></div></aside> <article class="panel card svelte-14holku">`);
    if (state.onboarding.currentStep === "country") {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="section-copy svelte-14holku"><p class="eyebrow svelte-14holku">Step 1</p> <h2 class="svelte-14holku">Choose your country</h2> <p class="svelte-14holku">South Africa is supported in v1. The flow stays structured so more countries can be added later without changing the experience.</p></div> <div class="selection-grid svelte-14holku"><!--[-->`);
      const each_array_1 = ensure_array_like(state.onboarding.options.countries);
      for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
        let country = each_array_1[$$index_1];
        $$renderer2.push(`<button type="button"${attr_class("choice-card svelte-14holku", void 0, { "active": state.onboarding.selectedCountryId === country.id })}><strong class="svelte-14holku">${escape_html(country.name)}</strong> <span class="svelte-14holku">Curriculum-aware onboarding</span></button>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (state.onboarding.currentStep === "academic") {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="section-copy svelte-14holku"><p class="eyebrow svelte-14holku">Step 2</p> <h2 class="svelte-14holku">Set your academic context</h2> <p class="svelte-14holku">These choices drive which grades and subjects are shown next.</p></div> <div class="selection-grid svelte-14holku"><!--[-->`);
      const each_array_2 = ensure_array_like(state.onboarding.options.curriculums);
      for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
        let curriculum = each_array_2[$$index_2];
        $$renderer2.push(`<button type="button"${attr_class("choice-card svelte-14holku", void 0, {
          "active": state.onboarding.selectedCurriculumId === curriculum.id
        })}><strong class="svelte-14holku">${escape_html(curriculum.name)}</strong> <span class="svelte-14holku">${escape_html(curriculum.description)}</span></button>`);
      }
      $$renderer2.push(`<!--]--></div> <div class="form-grid svelte-14holku"><label class="svelte-14holku"><span class="svelte-14holku">Grade</span> `);
      $$renderer2.select(
        {
          value: state.onboarding.selectedGradeId,
          onchange: (event) => appState.selectOnboardingGrade(event.currentTarget.value),
          class: ""
        },
        ($$renderer3) => {
          $$renderer3.push(`<!--[-->`);
          const each_array_3 = ensure_array_like(state.onboarding.options.grades);
          for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
            let grade = each_array_3[$$index_3];
            $$renderer3.option({ value: grade.id }, ($$renderer4) => {
              $$renderer4.push(`${escape_html(grade.label)}`);
            });
          }
          $$renderer3.push(`<!--]-->`);
        },
        "svelte-14holku"
      );
      $$renderer2.push(`</label> <label class="svelte-14holku"><span class="svelte-14holku">School year</span> <input${attr("value", state.onboarding.schoolYear)} maxlength="4" inputmode="numeric" placeholder="2026" class="svelte-14holku"/></label></div> <div class="term-row svelte-14holku"><!--[-->`);
      const each_array_4 = ensure_array_like(["Term 1", "Term 2", "Term 3", "Term 4"]);
      for (let $$index_4 = 0, $$length = each_array_4.length; $$index_4 < $$length; $$index_4++) {
        let term = each_array_4[$$index_4];
        $$renderer2.push(`<button type="button"${attr_class("term-chip svelte-14holku", void 0, { "active": state.onboarding.term === term })}>${escape_html(term)}</button>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (state.onboarding.currentStep === "subjects") {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="section-copy svelte-14holku"><p class="eyebrow svelte-14holku">Step 3</p> <h2 class="svelte-14holku">Select the subjects you study</h2> <p class="svelte-14holku">Choose everything relevant this year. If something is missing, add it manually and we’ll keep it in your profile.</p></div> <div class="selection-meta svelte-14holku"><div class="svelte-14holku"><strong class="svelte-14holku">${escape_html(selectedCount())}</strong> <span class="svelte-14holku">subjects selected</span></div> <div class="svelte-14holku"><strong class="svelte-14holku">${escape_html(state.onboarding.selectionMode === "unsure" ? "Not sure" : "Structured profile")}</strong> <span class="svelte-14holku">selection state</span></div></div> <div class="category-block svelte-14holku"><h3 class="svelte-14holku">Core</h3> <div class="checkbox-grid svelte-14holku"><!--[-->`);
      const each_array_5 = ensure_array_like(groupedSubjects("core"));
      for (let $$index_5 = 0, $$length = each_array_5.length; $$index_5 < $$length; $$index_5++) {
        let subject = each_array_5[$$index_5];
        $$renderer2.push(`<button type="button"${attr_class("subject-card svelte-14holku", void 0, {
          "active": state.onboarding.selectedSubjectIds.includes(subject.id)
        })}>${escape_html(subject.name)}</button>`);
      }
      $$renderer2.push(`<!--]--></div></div> <div class="category-block svelte-14holku"><h3 class="svelte-14holku">Languages</h3> <div class="checkbox-grid svelte-14holku"><!--[-->`);
      const each_array_6 = ensure_array_like(groupedSubjects("language"));
      for (let $$index_6 = 0, $$length = each_array_6.length; $$index_6 < $$length; $$index_6++) {
        let subject = each_array_6[$$index_6];
        $$renderer2.push(`<button type="button"${attr_class("subject-card svelte-14holku", void 0, {
          "active": state.onboarding.selectedSubjectIds.includes(subject.id)
        })}>${escape_html(subject.name)}</button>`);
      }
      $$renderer2.push(`<!--]--></div></div> <div class="category-block svelte-14holku"><h3 class="svelte-14holku">Other subjects</h3> <div class="checkbox-grid svelte-14holku"><!--[-->`);
      const each_array_7 = ensure_array_like(groupedSubjects("elective"));
      for (let $$index_7 = 0, $$length = each_array_7.length; $$index_7 < $$length; $$index_7++) {
        let subject = each_array_7[$$index_7];
        $$renderer2.push(`<button type="button"${attr_class("subject-card svelte-14holku", void 0, {
          "active": state.onboarding.selectedSubjectIds.includes(subject.id)
        })}>${escape_html(subject.name)}</button>`);
      }
      $$renderer2.push(`<!--]--></div></div> <div class="custom-row svelte-14holku"><label class="grow svelte-14holku"><span class="svelte-14holku">Add a missing subject</span> <input${attr("value", state.onboarding.customSubjectInput)} placeholder="Type the subject name" class="svelte-14holku"/></label> <button type="button" class="secondary svelte-14holku">Add subject</button></div> `);
      if (state.onboarding.customSubjects.length > 0) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<div class="tags svelte-14holku"><!--[-->`);
        const each_array_8 = ensure_array_like(state.onboarding.customSubjects);
        for (let $$index_8 = 0, $$length = each_array_8.length; $$index_8 < $$length; $$index_8++) {
          let subject = each_array_8[$$index_8];
          $$renderer2.push(`<button type="button" class="tag svelte-14holku">${escape_html(subject)}</button>`);
        }
        $$renderer2.push(`<!--]--></div>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> <label class="unsure svelte-14holku"><input type="checkbox"${attr("checked", state.onboarding.selectionMode === "unsure", true)} class="svelte-14holku"/> <span class="svelte-14holku">I’m not sure yet. Let me continue and refine this later.</span></label>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (state.onboarding.currentStep === "review") {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="section-copy svelte-14holku"><p class="eyebrow svelte-14holku">Step 4</p> <h2 class="svelte-14holku">Review your learning profile</h2> <p class="svelte-14holku">This is the information used to personalize the dashboard, subject view, and starting recommendation.</p></div> <div class="review-grid svelte-14holku"><div class="review-card svelte-14holku"><span class="svelte-14holku">Country</span> <strong class="svelte-14holku">${escape_html(state.onboarding.options.countries.find((country) => country.id === state.onboarding.selectedCountryId)?.name)}</strong></div> <div class="review-card svelte-14holku"><span class="svelte-14holku">Curriculum</span> <strong class="svelte-14holku">${escape_html(state.onboarding.options.curriculums.find((curriculum) => curriculum.id === state.onboarding.selectedCurriculumId)?.name)}</strong></div> <div class="review-card svelte-14holku"><span class="svelte-14holku">Grade</span> <strong class="svelte-14holku">${escape_html(currentGradeLabel())}</strong></div> <div class="review-card svelte-14holku"><span class="svelte-14holku">School year / term</span> <strong class="svelte-14holku">${escape_html(state.onboarding.schoolYear)} · ${escape_html(state.onboarding.term)}</strong></div></div> <div class="review-card wide svelte-14holku"><span class="svelte-14holku">Selected subjects</span> <strong class="svelte-14holku">${escape_html(state.onboarding.selectedSubjectNames.join(", ") || "None selected")}</strong> `);
      if (state.onboarding.customSubjects.length > 0) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<p class="svelte-14holku">Custom subjects: ${escape_html(state.onboarding.customSubjects.join(", "))}</p>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></div> <div class="recommendation-card svelte-14holku"><p class="eyebrow svelte-14holku">Recommended start</p> <h3 class="svelte-14holku">${escape_html(liveRecommendation().subjectName ?? "Choose a subject first")}</h3> <p class="svelte-14holku">${escape_html(liveRecommendation().reason)}</p></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <footer class="actions svelte-14holku"><button type="button" class="secondary svelte-14holku"${attr("disabled", state.onboarding.currentStep === "country", true)}>Back</button> `);
    if (state.onboarding.currentStep === "review") {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<button type="button"${attr("disabled", state.onboarding.isSaving, true)} class="svelte-14holku">${escape_html(state.onboarding.isSaving ? "Saving profile..." : "Start learning")}</button>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<button type="button"${attr("disabled", !canContinue(), true)} class="svelte-14holku">Continue</button>`);
    }
    $$renderer2.push(`<!--]--></footer></article></div></section>`);
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
function SettingsView($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const { state } = $$props;
    $$renderer2.push(`<section class="view svelte-ozb5fk"><header class="card hero svelte-ozb5fk"><div><p class="eyebrow svelte-ozb5fk">Settings</p> <h2 class="svelte-ozb5fk">Academic profile</h2> <p class="svelte-ozb5fk">Revisit onboarding if your school year, term, curriculum, or subjects change.</p></div> <button type="button" class="svelte-ozb5fk">Edit onboarding</button></header> <div class="grid svelte-ozb5fk"><article class="card svelte-ozb5fk"><p class="eyebrow svelte-ozb5fk">School context</p> <div class="row svelte-ozb5fk"><span class="svelte-ozb5fk">Country</span> <strong class="svelte-ozb5fk">${escape_html(state.profile.country)}</strong></div> <div class="row svelte-ozb5fk"><span class="svelte-ozb5fk">Curriculum</span> <strong class="svelte-ozb5fk">${escape_html(state.profile.curriculum)}</strong></div> <div class="row svelte-ozb5fk"><span class="svelte-ozb5fk">Grade</span> <strong class="svelte-ozb5fk">${escape_html(state.profile.grade)}</strong></div> <div class="row svelte-ozb5fk"><span class="svelte-ozb5fk">School year</span> <strong class="svelte-ozb5fk">${escape_html(state.profile.schoolYear)}</strong></div> <div class="row svelte-ozb5fk"><span class="svelte-ozb5fk">Term</span> <strong class="svelte-ozb5fk">${escape_html(state.profile.term)}</strong></div> <button type="button" class="secondary svelte-ozb5fk">Update school context</button></article> <article class="card svelte-ozb5fk"><p class="eyebrow svelte-ozb5fk">Subjects</p> <div class="subject-pills svelte-ozb5fk"><!--[-->`);
    const each_array = ensure_array_like(state.onboarding.selectedSubjectNames);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let subject = each_array[$$index];
      $$renderer2.push(`<span class="svelte-ozb5fk">${escape_html(subject)}</span>`);
    }
    $$renderer2.push(`<!--]--> <!--[-->`);
    const each_array_1 = ensure_array_like(state.onboarding.customSubjects);
    for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
      let subject = each_array_1[$$index_1];
      $$renderer2.push(`<span class="soft svelte-ozb5fk">${escape_html(subject)}</span>`);
    }
    $$renderer2.push(`<!--]--></div> <div class="row svelte-ozb5fk"><span class="svelte-ozb5fk">Recommended start</span> <strong class="svelte-ozb5fk">${escape_html(state.profile.recommendedStartSubjectName ?? "Not set")}</strong></div> <button type="button" class="secondary svelte-ozb5fk">Edit subjects</button></article></div></section>`);
  });
}
function StudentNav($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const { state } = $$props;
    const links = [
      {
        id: "dashboard",
        label: "Dashboard",
        caption: "Next steps and focus areas"
      },
      {
        id: "subject",
        label: "Subjects",
        caption: "Roadmap and active topics"
      },
      { id: "lesson", label: "Lesson", caption: "Learn in sequence" },
      {
        id: "revision",
        label: "Revision",
        caption: "Exam-focused practice"
      },
      {
        id: "ask",
        label: "Ask Question",
        caption: "Targeted help only"
      },
      {
        id: "progress",
        label: "Progress",
        caption: "Mastery and sessions"
      },
      {
        id: "settings",
        label: "Settings",
        caption: "Academic profile"
      }
    ];
    const activeSubject = derived(() => state.curriculum.subjects.find((item) => item.id === state.ui.selectedSubjectId) ?? state.curriculum.subjects[0]);
    $$renderer2.push(`<aside class="sidebar svelte-gwv0ec"><header class="brand card svelte-gwv0ec"><div class="brand-top svelte-gwv0ec"><p class="eyebrow svelte-gwv0ec">Doceo</p> `);
    ThemeToggle($$renderer2, { theme: state.ui.theme });
    $$renderer2.push(`<!----></div> <div class="brand-copy svelte-gwv0ec"><h1 class="svelte-gwv0ec">${escape_html(state.profile.fullName)}</h1> <p class="svelte-gwv0ec">${escape_html(state.profile.grade)} · ${escape_html(state.profile.curriculum)} · ${escape_html(state.profile.country)}</p></div></header> <nav class="nav card svelte-gwv0ec"><!--[-->`);
    const each_array = ensure_array_like(links);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let link = each_array[$$index];
      $$renderer2.push(`<button type="button"${attr_class("svelte-gwv0ec", void 0, { "active": state.ui.currentScreen === link.id })}><strong class="svelte-gwv0ec">${escape_html(link.label)}</strong> <span class="svelte-gwv0ec">${escape_html(link.caption)}</span></button>`);
    }
    $$renderer2.push(`<!--]--></nav> <section class="card info-card svelte-gwv0ec"><p class="eyebrow svelte-gwv0ec">Learning profile</p> <div class="stat-row svelte-gwv0ec"><span class="svelte-gwv0ec">School context</span> <strong class="svelte-gwv0ec">${escape_html(state.profile.schoolYear)} · ${escape_html(state.profile.term)}</strong></div> <div class="stat-row svelte-gwv0ec"><span class="svelte-gwv0ec">Recommended start</span> <strong class="svelte-gwv0ec">${escape_html(state.profile.recommendedStartSubjectName ?? "Not set yet")}</strong></div> <div class="subjects svelte-gwv0ec"><!--[-->`);
    const each_array_1 = ensure_array_like(state.onboarding.selectedSubjectNames.slice(0, 4));
    for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
      let subject = each_array_1[$$index_1];
      $$renderer2.push(`<span class="pill svelte-gwv0ec">${escape_html(subject)}</span>`);
    }
    $$renderer2.push(`<!--]--> `);
    if (state.onboarding.customSubjects.length > 0) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<!--[-->`);
      const each_array_2 = ensure_array_like(state.onboarding.customSubjects.slice(0, 2));
      for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
        let subject = each_array_2[$$index_2];
        $$renderer2.push(`<span class="pill soft svelte-gwv0ec">${escape_html(subject)}</span>`);
      }
      $$renderer2.push(`<!--]-->`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div></section> <section class="card info-card svelte-gwv0ec"><p class="eyebrow svelte-gwv0ec">Current subject</p> <h2 class="svelte-gwv0ec">${escape_html(activeSubject().name)}</h2> <label class="svelte-gwv0ec"><span class="svelte-gwv0ec">Switch subject</span> `);
    $$renderer2.select(
      {
        value: state.ui.selectedSubjectId,
        onchange: (event) => appState.selectSubject(event.currentTarget.value),
        class: ""
      },
      ($$renderer3) => {
        $$renderer3.push(`<!--[-->`);
        const each_array_3 = ensure_array_like(state.curriculum.subjects);
        for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
          let subject = each_array_3[$$index_3];
          $$renderer3.option({ value: subject.id }, ($$renderer4) => {
            $$renderer4.push(`${escape_html(subject.name)}`);
          });
        }
        $$renderer3.push(`<!--]-->`);
      },
      "svelte-gwv0ec"
    );
    $$renderer2.push(`</label></section> <button type="button" class="signout svelte-gwv0ec">Sign out</button></aside>`);
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
    if (state.ui.currentScreen === "landing" || state.auth.status === "signed_out") {
      $$renderer2.push("<!--[0-->");
      LandingView($$renderer2, { state });
    } else if (state.ui.currentScreen === "onboarding" || !state.onboarding.completed) {
      $$renderer2.push("<!--[1-->");
      OnboardingWizard($$renderer2, { state });
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
      } else if (state.ui.currentScreen === "settings") {
        $$renderer2.push("<!--[5-->");
        SettingsView($$renderer2, { state });
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
