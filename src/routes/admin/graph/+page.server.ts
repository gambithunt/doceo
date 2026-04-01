import { error } from '@sveltejs/kit';
import { requireAdminSession } from '$lib/server/admin/admin-guard';
import { createAdminGraphService, type AdminGraphFilters } from '$lib/server/admin/admin-graph';
import { createServerGraphRepository } from '$lib/server/graph-repository';
import { createServerLessonArtifactRepository } from '$lib/server/lesson-artifact-repository';
import { createServerRevisionArtifactRepository } from '$lib/server/revision-artifact-repository';

function parseFilters(url: URL): AdminGraphFilters {
  const minTrust = url.searchParams.get('minTrust');

  return {
    countryId: url.searchParams.get('countryId') || null,
    curriculumId: url.searchParams.get('curriculumId') || null,
    gradeId: url.searchParams.get('gradeId') || null,
    status: (url.searchParams.get('status') as AdminGraphFilters['status']) ?? 'all',
    origin: (url.searchParams.get('origin') as AdminGraphFilters['origin']) ?? 'all',
    minTrust: minTrust ? Number(minTrust) : null,
    eventType: (url.searchParams.get('eventType') as AdminGraphFilters['eventType']) ?? 'all',
    actorType: (url.searchParams.get('actorType') as AdminGraphFilters['actorType']) ?? 'all',
    days: Number(url.searchParams.get('days') || 0) || null
  };
}

function createServiceOrThrow() {
  const graphRepository = createServerGraphRepository();
  const lessonArtifactRepository = createServerLessonArtifactRepository();
  const revisionArtifactRepository = createServerRevisionArtifactRepository();

  if (!graphRepository || !lessonArtifactRepository || !revisionArtifactRepository) {
    throw error(503, 'Admin graph tooling is unavailable.');
  }

  return createAdminGraphService({
    graphRepository,
    lessonArtifactRepository,
    revisionArtifactRepository
  });
}

export async function load({ request, url }: { request: Request; url: URL }) {
  await requireAdminSession(request);
  const filters = parseFilters(url);
  const service = createServiceOrThrow();

  return {
    dashboard: await service.getDashboard(filters)
  };
}
