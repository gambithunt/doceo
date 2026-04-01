import { json } from '@sveltejs/kit';
import { isBackendUnavailableError } from '$lib/server/backend-availability';
import {
  fetchCountries,
  fetchCurriculums,
  fetchGrades,
  fetchSubjects
} from '$lib/server/onboarding-repository';

export async function GET({ url }) {
  try {
    const type = url.searchParams.get('type');
    const countryId = url.searchParams.get('countryId') ?? '';
    const curriculumId = url.searchParams.get('curriculumId') ?? '';
    const gradeId = url.searchParams.get('gradeId') ?? '';

    if (type === 'countries') {
      return json({ options: await fetchCountries() });
    }

    if (type === 'curriculums') {
      return json({ options: await fetchCurriculums(countryId) });
    }

    if (type === 'grades') {
      return json({ options: await fetchGrades(curriculumId) });
    }

    if (type === 'subjects') {
      return json({ options: await fetchSubjects(curriculumId, gradeId) });
    }

    return json({ options: [] });
  } catch (error) {
    if (isBackendUnavailableError(error)) {
      return json(
        {
          options: [],
          error: 'Curriculum catalog backend unavailable.'
        },
        { status: 503 }
      );
    }

    throw error;
  }
}
