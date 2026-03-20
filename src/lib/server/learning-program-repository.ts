import { buildLearningProgram } from '$lib/data/learning-content';
import { fetchSubjects } from '$lib/server/onboarding-repository';
import { createServerSupabaseAdmin, isSupabaseConfigured } from '$lib/server/supabase';
import type { CurriculumDefinition, Lesson, Question, QuestionOption } from '$lib/types';

interface TopicRow {
  id: string;
  subject_id: string;
  name: string;
  topic_order: number;
}

interface SubtopicRow {
  id: string;
  topic_id: string;
  name: string;
  subtopic_order: number;
}

interface LessonRow {
  id: string;
  subject_id: string;
  topic_id: string;
  subtopic_id: string;
  title: string;
  grade_label: string;
  overview_title: string;
  overview_body: string;
  deeper_explanation_title: string;
  deeper_explanation_body: string;
  example_title: string;
  example_body: string;
  lesson_order: number;
}

interface QuestionRow {
  id: string;
  lesson_id: string;
  topic_id: string;
  subtopic_id: string;
  question_type: Question['type'];
  prompt: string;
  expected_answer: string;
  accepted_answers: string[];
  rubric: string;
  explanation: string;
  hint_levels: string[];
  misconception_tags: string[];
  difficulty: Question['difficulty'];
  option_json: QuestionOption[] | null;
  question_order: number;
}

export interface LearningProgramResult {
  curriculum: CurriculumDefinition;
  lessons: Lesson[];
  questions: Question[];
  source: 'supabase' | 'local';
}

interface ProgramInput {
  country: string;
  curriculumName: string;
  curriculumId: string;
  grade: string;
  gradeId: string;
  selectedSubjectIds: string[];
  selectedSubjectNames: string[];
  customSubjects: string[];
}

function dedupe(values: string[]): string[] {
  return values.filter((value, index) => value.length > 0 && values.indexOf(value) === index);
}

function mergePrograms(
  primary: LearningProgramResult,
  additional: LearningProgramResult[]
): LearningProgramResult {
  const programs = [primary, ...additional];

  return {
    curriculum: {
      country: primary.curriculum.country,
      name: primary.curriculum.name,
      grade: primary.curriculum.grade,
      subjects: programs.flatMap((program) => program.curriculum.subjects)
    },
    lessons: programs.flatMap((program) => program.lessons),
    questions: programs.flatMap((program) => program.questions),
    source: primary.source
  };
}

function buildLocalProgram(input: ProgramInput): LearningProgramResult {
  const program = buildLearningProgram(
    input.country,
    input.curriculumName,
    input.grade,
    dedupe([...input.selectedSubjectNames, ...input.customSubjects])
  );

  return {
    ...program,
    source: 'local'
  };
}

export async function loadLearningProgram(input: ProgramInput): Promise<LearningProgramResult> {
  const supabase = createServerSupabaseAdmin();

  if (!supabase || !isSupabaseConfigured() || input.selectedSubjectIds.length === 0) {
    return buildLocalProgram(input);
  }

  const subjects = await fetchSubjects(input.curriculumId, input.gradeId);
  const selectedSubjects = subjects.filter((subject) => input.selectedSubjectIds.includes(subject.id));
  const subjectNameById = new Map(selectedSubjects.map((subject) => [subject.id, subject.name]));
  const selectedSubjectNames = selectedSubjects.map((subject) => subject.name);

  const { data: topicRows } = await supabase
    .from('curriculum_topics')
    .select('id, subject_id, name, topic_order')
    .in('subject_id', input.selectedSubjectIds)
    .order('topic_order')
    .returns<TopicRow[]>();

  const { data: subtopicRows } = await supabase
    .from('curriculum_subtopics')
    .select('id, topic_id, name, subtopic_order')
    .in('topic_id', (topicRows ?? []).map((row) => row.id))
    .order('subtopic_order')
    .returns<SubtopicRow[]>();

  const { data: lessonRows } = await supabase
    .from('curriculum_lessons')
    .select(
      'id, subject_id, topic_id, subtopic_id, title, grade_label, overview_title, overview_body, deeper_explanation_title, deeper_explanation_body, example_title, example_body, lesson_order'
    )
    .in('subject_id', input.selectedSubjectIds)
    .order('lesson_order')
    .returns<LessonRow[]>();

  const { data: questionRows } = await supabase
    .from('curriculum_questions')
    .select(
      'id, lesson_id, topic_id, subtopic_id, question_type, prompt, expected_answer, accepted_answers, rubric, explanation, hint_levels, misconception_tags, difficulty, option_json, question_order'
    )
    .in('lesson_id', (lessonRows ?? []).map((row) => row.id))
    .order('question_order')
    .returns<QuestionRow[]>();

  if (!topicRows?.length || !subtopicRows?.length || !lessonRows?.length || !questionRows?.length) {
    return buildLocalProgram(input);
  }

  const lessons: Lesson[] = lessonRows.map((row) => {
    const topicName = row.title.replace(/^.*?:\s*/, '');
    return {
      id: row.id,
      topicId: row.topic_id,
      subtopicId: row.subtopic_id,
      title: row.title,
      subjectId: row.subject_id,
      grade: row.grade_label,
      orientation: {
        title: row.overview_title,
        body: row.overview_body
      },
      mentalModel: {
        title: 'Big Picture',
        body: `Before diving into rules, picture **${topicName}** as one connected idea. Once you have the big picture, the details fall into place.`
      },
      concepts: {
        title: row.deeper_explanation_title,
        body: row.deeper_explanation_body
      },
      guidedConstruction: {
        title: 'Guided Construction',
        body: `Let's work through **${topicName}** step by step. Identify what the problem asks, apply the rule, and check your reasoning at each step.`
      },
      workedExample: {
        title: row.example_title,
        body: row.example_body
      },
      practicePrompt: {
        title: 'Active Practice',
        body: `Now try it yourself. Apply what you have learned about **${topicName}** to a similar problem. Write out each step and explain your reasoning.`
      },
      commonMistakes: {
        title: 'Common Mistakes',
        body: `The most common error with **${topicName}** is skipping the reasoning step. Always name the rule first, then apply it.`
      },
      transferChallenge: {
        title: 'Transfer Challenge',
        body: `Can you apply **${topicName}** in a different context? Identify the same core idea in a new situation.`
      },
      summary: {
        title: 'Summary',
        body: `**${topicName} — key takeaways:**\n\n${row.deeper_explanation_body.split('\n')[0]}\n\nIf you can explain this to someone else using one example, you've got it.`
      },
      practiceQuestionIds: questionRows
        .filter((question) => question.lesson_id === row.id)
        .map((question) => question.id),
      masteryQuestionIds: questionRows
        .filter((question) => question.lesson_id === row.id)
        .map((question) => question.id)
    };
  });

  const questions: Question[] = questionRows.map((row) => ({
    id: row.id,
    lessonId: row.lesson_id,
    type: row.question_type,
    prompt: row.prompt,
    expectedAnswer: row.expected_answer,
    acceptedAnswers: row.accepted_answers,
    rubric: row.rubric,
    explanation: row.explanation,
    hintLevels: row.hint_levels,
    misconceptionTags: row.misconception_tags,
    difficulty: row.difficulty,
    topicId: row.topic_id,
    subtopicId: row.subtopic_id,
    options: row.option_json ?? undefined
  }));

  const curriculum: CurriculumDefinition = {
    country: input.country,
    name: input.curriculumName,
    grade: input.grade,
    subjects: input.selectedSubjectIds.map((subjectId) => {
      const topicsForSubject = topicRows.filter((topic) => topic.subject_id === subjectId);

      return {
        id: subjectId,
        name: subjectNameById.get(subjectId) ?? subjectId,
        topics: topicsForSubject.map((topic) => ({
          id: topic.id,
          name: topic.name,
          subtopics: subtopicRows
            .filter((subtopic) => subtopic.topic_id === topic.id)
            .map((subtopic) => ({
              id: subtopic.id,
              name: subtopic.name,
              lessonIds: lessons
                .filter((lesson) => lesson.subtopicId === subtopic.id)
                .map((lesson) => lesson.id)
            }))
        }))
      };
    })
  };

  const customPrograms = input.customSubjects.length
    ? [
        {
          ...buildLearningProgram(input.country, input.curriculumName, input.grade, input.customSubjects),
          source: 'local' as const
        }
      ]
    : [];

  return mergePrograms(
    {
      curriculum,
      lessons,
      questions,
      source: 'supabase'
    },
    customPrograms
  );
}
