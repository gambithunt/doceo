import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { requireAdminSession } from '$lib/server/admin/admin-guard';
import { createServerLessonArtifactRepository } from '$lib/server/lesson-artifact-repository';
import { createServerGraphRepository } from '$lib/server/graph-repository';

const AdminArtifactActionSchema = z.object({
  artifactId: z.string().min(1),
  action: z.enum(['prefer', 'stale', 'reject', 'force_regenerate']),
  reason: z.string().max(2000).optional()
});

export async function POST({ request }) {
  const adminSession = await requireAdminSession(request);

  const raw = await request.json().catch(() => null);
  const parsed = AdminArtifactActionSchema.safeParse(raw);

  if (!parsed.success) {
    return json({ saved: false, error: 'Invalid admin artifact action.' }, { status: 400 });
  }

  const artifactRepository = createServerLessonArtifactRepository();
  const graphRepository = createServerGraphRepository();

  if (!artifactRepository) {
    return json({ saved: false, error: 'Backend not configured.' }, { status: 503 });
  }

  const updated = await artifactRepository.setAdminArtifactPreference({
    artifactId: parsed.data.artifactId,
    action: parsed.data.action,
    actorId: adminSession.profileId,
    reason: parsed.data.reason ?? null
  });

  if (!updated) {
    return json({ saved: false, error: 'Artifact not found.' }, { status: 404 });
  }

  if (graphRepository) {
    await graphRepository.recordNodeObservation({
      nodeId: updated.nodeId,
      source: 'admin',
      adminIntervention: true,
      metadata: {
        action: parsed.data.action,
        artifactId: updated.id
      }
    });
  }

  return json({
    saved: true,
    artifactId: updated.id,
    status: updated.status,
    adminPreference: updated.adminPreference,
    regenerationReason: updated.regenerationReason
  });
}
