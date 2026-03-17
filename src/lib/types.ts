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
export type LessonStage = 'overview' | 'concepts' | 'detail' | 'examples' | 'check' | 'complete';
export type QuestionType =
  | 'multiple-choice'
  | 'short-answer'
  | 'numeric'
  | 'step-by-step'
  | 'ask-follow-up';
export type ProblemType = 'concept' | 'procedural' | 'word_problem' | 'proof' | 'revision';
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
  | 'stage_start';
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

export interface Lesson {
  id: string;
  topicId: string;
  subtopicId: string;
  title: string;
  subjectId: string;
  grade: string;
  overview: LessonSection;
  deeperExplanation: LessonSection;
  detailedSteps?: LessonSection;
  example: LessonSection;
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

export interface RevisionPlan {
  subjectId: string;
  examDate: string;
  topics: string[];
  quickSummary: string;
  keyConcepts: string[];
  examFocus: string[];
  weaknessDetection: string;
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
  analytics: AnalyticsEvent[];
  revisionPlan: RevisionPlan;
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
  };
}
