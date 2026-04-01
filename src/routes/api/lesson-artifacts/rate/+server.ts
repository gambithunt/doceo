import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { createServerSupabaseFromRequest } from '$lib/server/supabase';
import { createServerLessonArtifactRepository } from '$lib/server/lesson-artifact-repository';
import { createServerGraphRepository } from '$lib/server/graph-repository';

const LessonArtifactRatingSchema = z.object({
  lessonSessionId: z.string().min(1),
  lessonArtifactId: z.string().min(1),
  nodeId: z.string().min(1),
  usefulness: z.number().int().min(1).max(5),
  clarity: z.number().int().min(1).max(5),
  confidenceGain: z.number().int().min(1).max(5),
  note: z.string().max(2000).optional().default(''),
  completed: z.boolean().default(true),
  reteachCount: z.number().int().min(0).default(0)
});

export async function POST({ request }) {
  const raw = await request.json().catch(() => null);
  const parsed = LessonArtifactRatingSchema.safeParse(raw);

  if (!parsed.success) {
    return json({ saved: false, error: 'Invalid rating payload.' }, { status: 400 });
  }

  const userClient = createServerSupabaseFromRequest(request);
  const artifactRepository = createServerLessonArtifactRepository();
  const graphRepository = createServerGraphRepository();

  if (!userClient || !artifactRepository) {
    return json({ saved: false, error: 'Backend not configured.' }, { status: 503 });
  }

  const {
    data: { user }
  } = await userClient.auth.getUser();

  if (!user?.id) {
    return json({ saved: false, error: 'Authentication required.' }, { status: 401 });
  }

  const updated = await artifactRepository.recordLessonFeedback({
    artifactId: parsed.data.lessonArtifactId,
    nodeId: parsed.data.nodeId,
    profileId: user.id,
    lessonSessionId: parsed.data.lessonSessionId,
    usefulness: parsed.data.usefulness,
    clarity: parsed.data.clarity,
    confidenceGain: parsed.data.confidenceGain,
    note: parsed.data.note.trim() || null,
    completed: parsed.data.completed,
    reteachCount: parsed.data.reteachCount
  });

  if (!updated) {
    return json({ saved: false, error: 'Artifact not found.' }, { status: 404 });
  }

  if (graphRepository) {
    await graphRepository.recordNodeObservation({
      nodeId: parsed.data.nodeId,
      source: 'lesson_feedback',
      artifactRating: (parsed.data.usefulness + parsed.data.clarity + parsed.data.confidenceGain) / 3,
      completed: parsed.data.completed,
      contradiction:
        parsed.data.reteachCount >= 2 ||
        parsed.data.usefulness <= 2 ||
        parsed.data.confidenceGain <= 2,
      metadata: {
        lessonSessionId: parsed.data.lessonSessionId,
        reteachCount: parsed.data.reteachCount
      }
    });
  }

  return json({
    saved: true,
    artifactId: updated.id,
    qualityScore: updated.ratingSummary.qualityScore
  });
}
