import { json } from '@sveltejs/kit';
import { loadLearningProgram } from '$lib/server/learning-program-repository';

interface ProgramRequestBody {
  country: string;
  curriculumName: string;
  curriculumId: string;
  grade: string;
  gradeId: string;
  selectedSubjectIds: string[];
  selectedSubjectNames: string[];
  customSubjects: string[];
}

export async function POST({ request }) {
  const payload = (await request.json()) as ProgramRequestBody;
  const result = await loadLearningProgram(payload);

  return json(result);
}
