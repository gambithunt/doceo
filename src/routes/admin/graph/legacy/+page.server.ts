import { error, fail } from '@sveltejs/kit';
import { requireAdminSession } from '$lib/server/admin/admin-guard';
import { createServerLegacyMigrationService } from '$lib/server/legacy-migration-service';

function createServiceOrThrow() {
  const service = createServerLegacyMigrationService({
    pedagogyVersion: 'v1',
    promptVersion: 'v1'
  });

  if (!service) {
    throw error(503, 'Legacy migration tooling is unavailable.');
  }

  return service;
}

export async function load({ request }: { request: Request }) {
  await requireAdminSession(request);
  const service = createServiceOrThrow();

  const [dashboard, unresolved] = await Promise.all([
    service.getDashboard(),
    service.listUnresolvedRecords()
  ]);

  return {
    dashboard,
    unresolved
  };
}

export const actions = {
  runBatch: async ({ request }: { request: Request }) => {
    await requireAdminSession(request);
    try {
      const service = createServiceOrThrow();
      const result = await service.runMigrationBatch();

      return {
        success: true,
        action: 'runBatch',
        summary: result.summary
      };
    } catch (caught) {
      return fail(400, {
        error: caught instanceof Error ? caught.message : 'Migration batch failed.'
      });
    }
  },

  resolveRecord: async ({ request }: { request: Request }) => {
    const admin = await requireAdminSession(request);
    try {
      const form = await request.formData();
      const queueId = String(form.get('queueId') ?? '').trim();
      const nodeId = String(form.get('nodeId') ?? '').trim();

      if (!queueId || !nodeId) {
        return fail(400, { error: 'Choose an unresolved record and a graph node.' });
      }

      const service = createServiceOrThrow();
      await service.resolveUnresolvedRecord({
        queueId,
        nodeId,
        actorId: admin.profileId
      });

      return {
        success: true,
        action: 'resolveRecord'
      };
    } catch (caught) {
      return fail(400, {
        error: caught instanceof Error ? caught.message : 'Manual resolution failed.'
      });
    }
  }
};
