import { error, fail } from '@sveltejs/kit';
import { requireAdminSession } from '$lib/server/admin/admin-guard';
import { createAdminGraphService } from '$lib/server/admin/admin-graph';
import { createServerGraphRepository } from '$lib/server/graph-repository';
import { createServerLessonArtifactRepository } from '$lib/server/lesson-artifact-repository';
import { createServerRevisionArtifactRepository } from '$lib/server/revision-artifact-repository';

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

function toAliasList(value: FormDataEntryValue | null): string[] {
  return String(value ?? '')
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export async function load({ request, params }: { request: Request; params: { nodeId: string } }) {
  await requireAdminSession(request);
  const service = createServiceOrThrow();

  return {
    detail: await service.getNodeDetail(params.nodeId)
  };
}

export const actions = {
  renameNode: async ({ request, params }: { request: Request; params: { nodeId: string } }) => {
    const admin = await requireAdminSession(request);
    try {
      const form = await request.formData();
      const label = String(form.get('label') ?? '').trim();

      if (!label) {
        return fail(400, { error: 'Label is required.' });
      }

      const service = createServiceOrThrow();
      await service.applyNodeAction({
        type: 'rename',
        nodeId: params.nodeId,
        label,
        actorId: admin.profileId
      });

      return { success: true, action: 'renameNode' };
    } catch (caught) {
      return fail(400, { error: caught instanceof Error ? caught.message : 'Rename failed.' });
    }
  },

  saveAliases: async ({ request, params }: { request: Request; params: { nodeId: string } }) => {
    const admin = await requireAdminSession(request);
    try {
      const form = await request.formData();
      const aliases = toAliasList(form.get('aliases'));
      const service = createServiceOrThrow();

      await service.applyNodeAction({
        type: 'replace-aliases',
        nodeId: params.nodeId,
        aliases,
        actorId: admin.profileId
      });

      return { success: true, action: 'saveAliases' };
    } catch (caught) {
      return fail(400, { error: caught instanceof Error ? caught.message : 'Alias update failed.' });
    }
  },

  mergeNode: async ({ request, params }: { request: Request; params: { nodeId: string } }) => {
    const admin = await requireAdminSession(request);
    try {
      const form = await request.formData();
      const targetNodeId = String(form.get('targetNodeId') ?? '').trim();

      if (!targetNodeId) {
        return fail(400, { error: 'Choose a merge target.' });
      }

      const service = createServiceOrThrow();
      await service.applyNodeAction({
        type: 'merge',
        sourceNodeId: params.nodeId,
        targetNodeId,
        actorId: admin.profileId
      });

      return { success: true, action: 'mergeNode' };
    } catch (caught) {
      return fail(400, { error: caught instanceof Error ? caught.message : 'Merge failed.' });
    }
  },

  reparentNode: async ({ request, params }: { request: Request; params: { nodeId: string } }) => {
    const admin = await requireAdminSession(request);
    try {
      const form = await request.formData();
      const parentNodeId = String(form.get('parentNodeId') ?? '').trim() || null;
      const service = createServiceOrThrow();

      await service.applyNodeAction({
        type: 'reparent',
        nodeId: params.nodeId,
        parentId: parentNodeId,
        actorId: admin.profileId
      });

      return { success: true, action: 'reparentNode' };
    } catch (caught) {
      return fail(400, { error: caught instanceof Error ? caught.message : 'Reparent failed.' });
    }
  },

  setStatus: async ({ request, params }: { request: Request; params: { nodeId: string } }) => {
    const admin = await requireAdminSession(request);
    try {
      const form = await request.formData();
      const status = String(form.get('status') ?? '').trim();
      const reason = String(form.get('reason') ?? '').trim() || null;

      if (!['canonical', 'provisional', 'review_needed', 'archived', 'rejected'].includes(status)) {
        return fail(400, { error: 'Choose a valid lifecycle state.' });
      }

      const service = createServiceOrThrow();
      await service.applyNodeAction({
        type: 'set-status',
        nodeId: params.nodeId,
        status: status as 'canonical' | 'provisional' | 'review_needed' | 'archived' | 'rejected',
        actorId: admin.profileId,
        reason
      });

      return { success: true, action: 'setStatus' };
    } catch (caught) {
      return fail(400, { error: caught instanceof Error ? caught.message : 'Status update failed.' });
    }
  },

  restoreNode: async ({ request, params }: { request: Request; params: { nodeId: string } }) => {
    const admin = await requireAdminSession(request);
    try {
      const form = await request.formData();
      const nextStatus = String(form.get('nextStatus') ?? 'provisional').trim() as
        | 'canonical'
        | 'provisional'
        | 'review_needed';
      const service = createServiceOrThrow();

      await service.applyNodeAction({
        type: 'restore',
        nodeId: params.nodeId,
        nextStatus,
        actorId: admin.profileId
      });

      return { success: true, action: 'restoreNode' };
    } catch (caught) {
      return fail(400, { error: caught instanceof Error ? caught.message : 'Restore failed.' });
    }
  },

  lessonArtifactAction: async ({ request }: { request: Request }) => {
    const admin = await requireAdminSession(request);
    try {
      const form = await request.formData();
      const artifactId = String(form.get('artifactId') ?? '').trim();
      const action = String(form.get('artifactAction') ?? '').trim();
      const reason = String(form.get('reason') ?? '').trim() || null;

      if (!artifactId || !['prefer', 'stale', 'reject', 'force_regenerate'].includes(action)) {
        return fail(400, { error: 'Choose a valid artifact action.' });
      }

      const service = createServiceOrThrow();
      await service.applyNodeAction({
        type: 'lesson-artifact',
        artifactId,
        action: action as 'prefer' | 'stale' | 'reject' | 'force_regenerate',
        actorId: admin.profileId,
        reason
      });

      return { success: true, action: 'lessonArtifactAction' };
    } catch (caught) {
      return fail(400, { error: caught instanceof Error ? caught.message : 'Artifact action failed.' });
    }
  }
};
