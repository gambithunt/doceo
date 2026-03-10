export type ThemeMode = 'light' | 'dark';
export type LearningMode = 'learn' | 'revision' | 'ask';
export type LessonStage =
  | 'overview'
  | 'deeper-explanation'
  | 'example'
  | 'practice'
  | 'mastery';
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

export interface UserProfile {
  id: string;
  fullName: string;
  role: 'student' | 'parent' | 'teacher' | 'admin';
  grade: string;
  country: string;
  curriculum: string;
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
    | 'ask_question_submitted';
  createdAt: string;
  detail: string;
}

export interface StudySession {
  id: string;
  mode: LearningMode;
  lessonId?: string;
  startedAt: string;
  updatedAt: string;
  resumeLabel: string;
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

export interface RevisionPlan {
  subjectId: string;
  examDate: string;
  topics: string[];
  quickSummary: string;
  keyConcepts: string[];
  examFocus: string[];
  weaknessDetection: string;
}

export interface AppState {
  profile: UserProfile;
  curriculum: CurriculumDefinition;
  lessons: Lesson[];
  questions: Question[];
  progress: Record<string, LessonProgress>;
  sessions: StudySession[];
  analytics: AnalyticsEvent[];
  revisionPlan: RevisionPlan;
  askQuestion: {
    request: AskQuestionRequest;
    response: AskQuestionResponse;
  };
  ui: {
    theme: ThemeMode;
    learningMode: LearningMode;
    selectedSubjectId: string;
    selectedTopicId: string;
    selectedLessonId: string;
    practiceQuestionId: string;
  };
}
