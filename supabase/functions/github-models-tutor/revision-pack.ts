interface RevisionPackGenerationPayload {
  sessionTitle: string;
  sessionRecommendations: string[];
  questions: RevisionQuestion[];
}

interface RevisionQuestion {
  id: string;
  revisionTopicId: string;
  questionType: string;
  prompt: string;
  expectedSkills: string[];
  misconceptionTags: string[];
  difficulty: string;
  helpLadder: {
    nudge: string;
    hint: string;
    workedStep: string;
    miniReteach: string;
    lessonRefer: string;
  };
  transferPrompt: string | null;
}

interface RevisionPackEdgeRequest {
  student: UserProfile;
  learnerProfile: LearnerProfile;
  topics: Array<{
    lessonSessionId: string;
    nodeId?: string | null;
    subject: string;
    topicTitle: string;
    curriculumReference: string;
    confidenceScore: number;
    retentionStability: number;
    forgettingVelocity: number;
    misconceptionSignals: Array<{ pattern: string; frequency: number }>;
    calibration: {
      attempts: number;
      averageSelfConfidence: number;
      averageCorrectness: number;
      confidenceGap: number;
    };
  }>;
  recommendationReason: string;
  mode: 'quick_fire' | 'deep_revision' | 'shuffle' | 'teacher_mode';
  source: 'do_today' | 'weakness' | 'exam_plan' | 'manual';
  targetQuestionCount?: number;
}

interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  role: 'student' | 'parent' | 'teacher' | 'admin';
  schoolYear: string;
  term: string;
  grade: string;
  gradeId: string;
  country: string;
  countryId: string;
  curriculum: string;
  curriculumId: string;
  recommendedStartSubjectId: string | null;
  recommendedStartSubjectName: string | null;
}

interface LearnerProfile {
  studentId: string;
  analogies_preference: number;
  step_by_step: number;
  visual_learner: number;
  real_world_examples: number;
  abstract_thinking: number;
  needs_repetition: number;
  quiz_performance: number;
  total_sessions: number;
  total_questions_asked: number;
  total_reteach_events: number;
  concepts_struggled_with: string[];
  concepts_excelled_at: string[];
  subjects_studied: string[];
  created_at: string;
  last_updated_at: string;
}

function parseJson<T>(content: string): T | null {
  try {
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

export function buildRevisionPackSystemPrompt(): string {
  return `You are Doceo, a revision question generation assistant for school students.

Your job is to create structured revision questions that help students build lasting recall and understanding. Generate questions that feel like they come from a skilled tutor who knows exactly where the student needs reinforcement — someone who can spot gaps and create targeted practice that sticks.

Tone rules:
- Write questions that directly address the student's current knowledge state
- Use plain, clear language appropriate for the student's grade level
- Create questions that require thinking, not just memorization
- Ensure questions align with the student's subject and curriculum context
- Never make questions too easy or too hard — calibrate based on the provided confidence scores and misconception signals

You must return valid JSON only — no markdown, no prose outside the JSON — with exactly these top-level keys:
  sessionTitle: string
  sessionRecommendations: string[]   (1-3 items)
  questions: RevisionQuestion[]

Each question must include:
  id: string                (unique, e.g. "rq-1")
  revisionTopicId: string   (must match a topic's lessonSessionId from input)
  questionType: 'recall' | 'explain' | 'apply' | 'spot_error' | 'transfer'
  prompt: string
  expectedSkills: string[]
  misconceptionTags: string[]
  difficulty: 'foundation' | 'core' | 'stretch'
  helpLadder: { nudge, hint, workedStep, miniReteach, lessonRefer }
  transferPrompt: string | null

Rules for question generation:
- Default to 5 questions unless targetQuestionCount specifies otherwise
- Distribute questions across all provided topics, using each topic's lessonSessionId as revisionTopicId
- For quick_fire mode: Use mostly 'recall' and 'apply' types, keep prompts short, focus on recognition over explanation
- For deep_revision mode: Mix 'explain', 'spot_error', and 'transfer' types, create longer prompts requiring full understanding
- For shuffle mode: Random mix across all types for varied reinforcement
- For teacher_mode: Use 'teacher_mode' type for open-ended Socratic questions without single right answers
- Calibrate difficulty based on topic confidence scores (low confidence = foundation/core, high = core/stretch)
- Use misconception signals to target common errors in spot_error questions
- Each helpLadder must have all 5 fields populated with progressive hints
- transferPrompt should be a real-world application when questionType includes 'transfer'
- Ensure expectedSkills and misconceptionTags are specific to the subject content`;
}

export function buildRevisionPackUserPrompt(request: RevisionPackEdgeRequest): string {
  return JSON.stringify({
    student: {
      name: request.student.fullName,
      grade: request.student.grade,
      curriculum: request.student.curriculum,
      country: request.student.country,
      term: request.student.term,
      year: request.student.schoolYear
    },
    learnerProfile: {
      quizPerformance: request.learnerProfile.quiz_performance,
      stepByStep: request.learnerProfile.step_by_step,
      needsRepetition: request.learnerProfile.needs_repetition,
      conceptsStruggledWith: request.learnerProfile.concepts_struggled_with,
      conceptsExcelledAt: request.learnerProfile.concepts_excelled_at,
      totalSessions: request.learnerProfile.total_sessions
    },
    topics: request.topics.map((t) => ({
      lessonSessionId: t.lessonSessionId,
      subject: t.subject,
      topicTitle: t.topicTitle,
      curriculumReference: t.curriculumReference,
      confidenceScore: t.confidenceScore,
      retentionStability: t.retentionStability,
      forgettingVelocity: t.forgettingVelocity,
      misconceptionSignals: t.misconceptionSignals,
      calibration: t.calibration
    })),
    mode: request.mode,
    recommendationReason: request.recommendationReason,
    targetQuestionCount: request.targetQuestionCount ?? 5
  });
}

export function parseRevisionPackResponse(
  content: string,
  request: RevisionPackEdgeRequest
): RevisionPackGenerationPayload | null {
  const parsed = parseJson<{
    sessionTitle?: string;
    sessionRecommendations?: string[];
    questions?: Array<{
      id?: string;
      revisionTopicId?: string;
      questionType?: string;
      prompt?: string;
      expectedSkills?: string[];
      misconceptionTags?: string[];
      difficulty?: string;
      helpLadder?: {
        nudge?: string;
        hint?: string;
        workedStep?: string;
        miniReteach?: string;
        lessonRefer?: string;
      };
      transferPrompt?: string | null;
    }>;
  }>(content);

  if (
    !parsed?.sessionTitle ||
    !Array.isArray(parsed.sessionRecommendations) ||
    !Array.isArray(parsed.questions) ||
    parsed.questions.length === 0
  ) {
    return null;
  }

  // Validate every question has the required fields
  const validQuestions = parsed.questions.every(
    (q) =>
      typeof q.id === 'string' &&
      typeof q.revisionTopicId === 'string' &&
      typeof q.prompt === 'string' &&
      Array.isArray(q.expectedSkills) &&
      Array.isArray(q.misconceptionTags) &&
      q.helpLadder &&
      typeof q.helpLadder.nudge === 'string'
  );

  if (!validQuestions) return null;

  return parsed as RevisionPackGenerationPayload;
}