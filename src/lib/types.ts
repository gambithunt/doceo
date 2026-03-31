export type ThemeMode = 'light' | 'dark';
export type LearningMode = 'learn' | 'revision';
export type { ModelTier } from '$lib/ai/model-tiers';
export type AppScreen =
  | 'landing'
  | 'onboarding'
  | 'dashboard'
  | 'subject'
  | 'lesson'
  | 'revision'
  | 'progress'
  | 'settings';
export type OnboardingStep = 'country' | 'academic' | 'subjects' | 'review';
export type SchoolTerm = 'Term 1' | 'Term 2' | 'Term 3' | 'Term 4';
export type SubjectSelectionMode = 'structured' | 'mixed' | 'unsure';
export type LessonStage = 'orientation' | 'concepts' | 'construction' | 'examples' | 'practice' | 'check' | 'complete';
export type QuestionType =
  | 'multiple-choice'
  | 'short-answer'
  | 'numeric'
  | 'step-by-step'
  | 'ask-follow-up';
export type ProblemType = 'concept' | 'procedural' | 'word_problem' | 'proof' | 'revision';
export type RevisionQuestionType = 'recall' | 'explain' | 'apply' | 'spot_error' | 'transfer' | 'teacher_mode';
export type RevisionInterventionType = 'none' | 'nudge' | 'hint' | 'worked_step' | 'mini_reteach' | 'lesson_refer';
export type ResponseStage =
  | 'clarify'
  | 'hint'
  | 'guided_step'
  | 'worked_example'
  | 'final_explanation';
export type AssistantAction = 'advance' | 'reteach' | 'side_thread' | 'complete' | 'stay';
export type LessonMessageType =
  | 'teaching'
  | 'check'
  | 'response'
  | 'question'
  | 'side_thread'
  | 'feedback'
  | 'stage_start'
  | 'concept_cards';
export type LessonSessionStatus = 'active' | 'complete' | 'archived';
export type ConfidenceLevel = 'low' | 'medium' | 'high';
export type ReteachStyle = 'analogy' | 'example' | 'step_by_step' | 'visual';

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  role: 'student' | 'parent' | 'teacher' | 'admin';
  schoolYear: string;
  term: SchoolTerm;
  grade: string;
  gradeId: string;
  country: string;
  countryId: string;
  curriculum: string;
  curriculumId: string;
  recommendedStartSubjectId: string | null;
  recommendedStartSubjectName: string | null;
}

export interface CountryOption {
  id: string;
  name: string;
}

export interface CurriculumOption {
  id: string;
  countryId: string;
  name: string;
  description: string;
}

export interface GradeOption {
  id: string;
  curriculumId: string;
  label: string;
  order: number;
}

export interface SubjectOption {
  id: string;
  curriculumId: string;
  gradeId: string;
  name: string;
  category: 'core' | 'elective' | 'language';
  source?: 'seeded' | 'user_contributed';
}

export type SubjectVerificationStatus = 'idle' | 'loading' | 'verified' | 'invalid' | 'provisional' | 'error';

export interface SubjectVerificationState {
  status: SubjectVerificationStatus;
  input: string;
  subjectId: string | null;
  normalizedName: string | null;
  category: 'core' | 'language' | 'elective' | null;
  reason: string | null;
  suggestion: string | null;
  provisional: boolean;
}

export interface QuestionOption {
  id: string;
  label: string;
  text: string;
}

export interface Question {
  id: string;
  lessonId: string;
  type: QuestionType;
  prompt: string;
  expectedAnswer: string;
  acceptedAnswers?: string[];
  rubric: string;
  explanation: string;
  hintLevels: string[];
  misconceptionTags: string[];
  difficulty: 'foundation' | 'core' | 'stretch';
  topicId: string;
  subtopicId: string;
  options?: QuestionOption[];
}

export interface LessonSection {
  title: string;
  body: string;
}

export interface ConceptItem {
  name: string;
  summary: string;
  detail: string;
  example: string;
}

export interface Lesson {
  id: string;
  topicId: string;
  subtopicId: string;
  title: string;
  subjectId: string;
  grade: string;
  orientation: LessonSection;
  mentalModel: LessonSection;
  concepts: LessonSection;
  guidedConstruction: LessonSection;
  workedExample: LessonSection;
  practicePrompt: LessonSection;
  commonMistakes: LessonSection;
  transferChallenge: LessonSection;
  summary: LessonSection;
  keyConcepts?: ConceptItem[];
  practiceQuestionIds: string[];
  masteryQuestionIds: string[];
}

export interface Subtopic {
  id: string;
  name: string;
  lessonIds: string[];
}

export interface Topic {
  id: string;
  name: string;
  subtopics: Subtopic[];
}

export interface Subject {
  id: string;
  name: string;
  topics: Topic[];
}

export interface CurriculumDefinition {
  country: string;
  name: string;
  grade: string;
  subjects: Subject[];
}

export interface StudentAnswer {
  questionId: string;
  answer: string;
  isCorrect: boolean;
  attemptedAt: string;
}

export interface LessonProgress {
  lessonId: string;
  completed: boolean;
  masteryLevel: number;
  weakAreas: string[];
  answers: StudentAnswer[];
  timeSpentMinutes: number;
  lastStage: LessonStage;
}

export interface AnalyticsEvent {
  id: string;
  type:
    | 'session_started'
    | 'session_resumed'
    | 'lesson_viewed'
    | 'lesson_completed'
    | 'question_answered'
    | 'mastery_updated'
    | 'revision_generated'
    | 'ask_question_submitted'
    | 'topic_shortlisted'
    | 'lesson_message_sent';
  createdAt: string;
  detail: string;
}

export interface AskQuestionRequest {
  question: string;
  topic: string;
  subject: string;
  grade: string;
  currentAttempt: string;
}

export interface AskQuestionResponse {
  problemType: ProblemType;
  studentGoal: string;
  diagnosis: string;
  responseStage: ResponseStage;
  teacherResponse: string;
  checkForUnderstanding: string;
}

export interface LessonSelectorRequest {
  subject: string;
  studentName: string;
  studentPrompt: string;
  availableSections: string[];
}

export interface LessonSelectorResponse {
  studentIntent: string;
  matchedSection: string;
  matchedTopic: string;
  confidence: ConfidenceLevel;
  reasoning: string;
  clarificationNeeded: boolean;
  candidateSections: string[];
}

export type RevisionPlanStyle = 'weak_topics' | 'full_subject' | 'manual';

export interface RevisionPlan {
  id: string;
  subjectId: string;
  subjectName: string;
  examName?: string;
  examDate: string;
  topics: string[];
  planStyle: RevisionPlanStyle;
  studyMode?: RevisionPlanStyle;
  timeBudgetMinutes?: number;
  quickSummary: string;
  keyConcepts: string[];
  examFocus: string[];
  weaknessDetection: string;
  status: 'active' | 'completed' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface UpcomingExam {
  id: string;
  revisionPlanId?: string;
  subjectId: string;
  subjectName: string;
  examName: string;
  examDate: string;
  topics: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RevisionQuestion {
  id: string;
  revisionTopicId: string;
  questionType: RevisionQuestionType;
  prompt: string;
  expectedSkills: string[];
  misconceptionTags: string[];
  difficulty: 'foundation' | 'core' | 'stretch';
}

export interface RevisionTurnScores {
  correctness: number;
  reasoning: number;
  completeness: number;
  confidenceAlignment: number;
  selfConfidenceScore: number;
  calibrationGap: number;
}

export interface RevisionTopicCalibration {
  attempts: number;
  averageSelfConfidence: number;
  averageCorrectness: number;
  confidenceGap: number;
  overconfidenceCount: number;
  underconfidenceCount: number;
}

export interface RevisionQuestionFeedback {
  difficulty: 'too_easy' | 'just_right' | 'too_hard';
  clarity: 'clear' | 'confusing';
  submittedAt: string;
}

export interface RevisionMisconceptionSignal {
  tag: string;
  count: number;
  lastSeenAt: string;
}

export interface RevisionDiagnosis {
  type:
    | 'forgotten_fact'
    | 'weak_explanation'
    | 'procedure_break'
    | 'misconception'
    | 'transfer_failure'
    | 'false_confidence'
    | 'underconfidence';
  summary: string;
  misconceptionTags: string[];
}

export interface RevisionIntervention {
  type: RevisionInterventionType;
  content: string;
}

export interface RevisionTurnResult {
  scores: RevisionTurnScores;
  diagnosis: RevisionDiagnosis;
  intervention: RevisionIntervention;
  nextQuestion: RevisionQuestion | null;
  topicUpdate: {
    confidenceScore: number;
    nextRevisionAt: string;
    previousIntervalDays: number;
    lastReviewedAt: string;
    retentionStability: number;
    forgettingVelocity: number;
    misconceptionSignals: RevisionMisconceptionSignal[];
    calibration: RevisionTopicCalibration;
  };
  sessionDecision: 'continue' | 'complete' | 'reschedule' | 'lesson_revisit';
}

export interface RevisionAttemptRecord {
  id: string;
  revisionTopicId: string;
  questionId: string;
  answer: string;
  selfConfidence: number;
  result: RevisionTurnResult;
  studentFeedback?: RevisionQuestionFeedback;
  createdAt: string;
}

export interface ActiveRevisionSession {
  id: string;
  revisionPlanId?: string;
  revisionTopicId: string;
  revisionTopicIds: string[];
  mode: 'quick_fire' | 'deep_revision' | 'shuffle' | 'teacher_mode';
  source: 'do_today' | 'weakness' | 'exam_plan' | 'manual';
  topicTitle: string;
  recommendationReason: string;
  questions: RevisionQuestion[];
  questionIndex: number;
  currentInterventionLevel: RevisionInterventionType;
  currentHelp: RevisionIntervention | null;
  selfConfidenceHistory: number[];
  lastTurnResult: RevisionTurnResult | null;
  status: 'active' | 'completed' | 'abandoned' | 'escalated_to_lesson';
  startedAt: string;
  lastActiveAt: string;
}

export interface ShortlistedTopic {
  id: string;
  title: string;
  description: string;
  curriculumReference: string;
  relevance: string;
  topicId: string;
  subtopicId: string;
  lessonId: string;
}

export interface TopicShortlistRequest {
  studentId: string;
  studentName: string;
  country: string;
  curriculum: string;
  grade: string;
  subject: string;
  term: string;
  year: string;
  studentInput: string;
  availableTopics: Array<{
    topicId: string;
    topicName: string;
    subtopicId: string;
    subtopicName: string;
    lessonId: string;
    lessonTitle: string;
  }>;
}

export interface TopicShortlistResponse {
  matchedSection: string;
  subtopics: ShortlistedTopic[];
}

export interface LearnerProfileSignals {
  analogies_preference: number;
  step_by_step: number;
  visual_learner: number;
  real_world_examples: number;
  abstract_thinking: number;
  needs_repetition: number;
  quiz_performance: number;
}

export interface LearnerProfileUpdate extends Partial<LearnerProfileSignals> {
  engagement_level?: 'high' | 'medium' | 'low' | null;
  struggled_with?: string[];
  excelled_at?: string[];
}

export interface LearnerProfile extends LearnerProfileSignals {
  studentId: string;
  total_sessions: number;
  total_questions_asked: number;
  total_reteach_events: number;
  concepts_struggled_with: string[];
  concepts_excelled_at: string[];
  subjects_studied: string[];
  created_at: string;
  last_updated_at: string;
}

export interface DoceoMeta {
  action: AssistantAction;
  next_stage: LessonStage | null;
  reteach_style: ReteachStyle | null;
  reteach_count: number;
  confidence_assessment: number;
  needs_teacher_review?: boolean;
  stuck_concept?: string | null;
  profile_update: LearnerProfileUpdate;
}

export interface LessonMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  type: LessonMessageType;
  content: string;
  stage: LessonStage;
  timestamp: string;
  metadata?: DoceoMeta | null;
  conceptItems?: ConceptItem[];
}

export interface LessonSession {
  id: string;
  studentId: string;
  subjectId: string;
  subject: string;
  topicId: string;
  topicTitle: string;
  topicDescription: string;
  curriculumReference: string;
  matchedSection: string;
  lessonId: string;
  currentStage: LessonStage;
  stagesCompleted: LessonStage[];
  messages: LessonMessage[];
  questionCount: number;
  reteachCount: number;
  confidenceScore: number;
  needsTeacherReview: boolean;
  stuckConcept: string | null;
  startedAt: string;
  lastActiveAt: string;
  completedAt: string | null;
  status: LessonSessionStatus;
  profileUpdates: LearnerProfileUpdate[];
}

export interface LessonChatRequest {
  student: UserProfile;
  learnerProfile: LearnerProfile;
  lesson: Lesson;
  lessonSession: LessonSession;
  message: string;
  messageType: 'question' | 'response';
}

export interface LessonChatResponse {
  displayContent: string;
  metadata: DoceoMeta | null;
  provider: string;
  modelTier?: import('$lib/ai/model-tiers').ModelTier;
  model?: string;
  error?: string;
}

export interface LessonPlanRequest {
  student: UserProfile;
  subjectId: string;
  subject: string;
  topicTitle: string;
  topicDescription: string;
  curriculumReference: string;
}

export interface LessonPlanResponse {
  lesson: Lesson;
  questions: Question[];
  provider: string;
  modelTier?: import('$lib/ai/model-tiers').ModelTier;
  model?: string;
  error?: string;
}

export interface TopicDiscoveryState {
  selectedSubjectId: string;
  input: string;
  status: 'idle' | 'loading' | 'ready' | 'error';
  shortlist: TopicShortlistResponse | null;
  provider: string | null;
  error: string | null;
}

export interface RevisionTopic {
  lessonSessionId: string;
  subjectId: string;
  subject: string;
  topicTitle: string;
  curriculumReference: string;
  confidenceScore: number;
  previousIntervalDays: number;
  nextRevisionAt: string;
  lastReviewedAt: string | null;
  retentionStability: number;
  forgettingVelocity: number;
  misconceptionSignals: RevisionMisconceptionSignal[];
  calibration: RevisionTopicCalibration;
  isSynthetic?: boolean;
  hasLesson?: boolean;
}

export interface AppState {
  auth: {
    status: 'signed_out' | 'loading' | 'signed_in';
    error: string | null;
  };
  onboarding: {
    completed: boolean;
    completedAt: string | null;
    currentStep: OnboardingStep;
    stepOrder: OnboardingStep[];
    canSkipCurriculum: boolean;
    schoolYear: string;
    term: SchoolTerm;
    selectedCountryId: string;
    selectedCurriculumId: string;
    selectedGradeId: string;
    selectedSubjectIds: string[];
    selectedSubjectNames: string[];
    customSubjects: string[];
    customSubjectInput: string;
    selectionMode: SubjectSelectionMode;
    subjectVerification: SubjectVerificationState;
    isSaving: boolean;
    error: string | null;
    recommendation: {
      subjectId: string | null;
      subjectName: string | null;
      reason: string;
    };
    options: {
      countries: CountryOption[];
      curriculums: CurriculumOption[];
      grades: GradeOption[];
      subjects: SubjectOption[];
    };
  };
  profile: UserProfile;
  learnerProfile: LearnerProfile;
  curriculum: CurriculumDefinition;
  lessons: Lesson[];
  questions: Question[];
  progress: Record<string, LessonProgress>;
  lessonSessions: LessonSession[];
  revisionTopics: RevisionTopic[];
  revisionAttempts: RevisionAttemptRecord[];
  revisionSession: ActiveRevisionSession | null;
  analytics: AnalyticsEvent[];
  revisionPlans: RevisionPlan[];
  activeRevisionPlanId: string | null;
  revisionPlan: RevisionPlan;
  upcomingExams: UpcomingExam[];
  askQuestion: {
    request: AskQuestionRequest;
    response: AskQuestionResponse;
    provider: string;
    isLoading: boolean;
    error: string | null;
  };
  topicDiscovery: TopicDiscoveryState;
  backend: {
    isConfigured: boolean;
    lastSyncAt: string | null;
    lastSyncStatus: 'idle' | 'syncing' | 'synced' | 'error';
    lastSyncError: string | null;
  };
  ui: {
    theme: ThemeMode;
    learningMode: LearningMode;
    currentScreen: AppScreen;
    selectedSubjectId: string;
    selectedTopicId: string;
    selectedSubtopicId: string;
    selectedLessonId: string;
    practiceQuestionId: string;
    activeLessonSessionId: string | null;
    pendingAssistantSessionId: string | null;
    composerDraft: string;
    showTopicDiscoveryComposer: boolean;
    showLessonCloseConfirm: boolean;
    showRevisionPlanner: boolean;
  };
}
