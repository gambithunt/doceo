import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { buildDynamicLessonFromTopic } from '$lib/lesson-system';
import { logAiInteraction, logLessonSignal } from '$lib/server/state-repository';
import { getAuthenticatedEdgeContext } from '$lib/server/ai-edge';
import type { LessonChatRequest, LessonChatResponse } from '$lib/types';

const LessonChatBodySchema = z.object({
  student: z.object({
    id: z.string(),
    fullName: z.string(),
    grade: z.string(),
    curriculum: z.string(),
    country: z.string(),
    term: z.string(),
    schoolYear: z.string()
  }).passthrough(),
  learnerProfile: z.object({ studentId: z.string() }).passthrough(),
  lesson: z.record(z.string(), z.unknown()).optional(),
  lessonSession: z.object({
    id: z.string(),
    currentStage: z.string()
  }).passthrough(),
  message: z.string().min(1),
  messageType: z.enum(['question', 'response'])
});

export async function POST({ request, fetch }) {
  const raw = await request.json();
  const parsed = LessonChatBodySchema.safeParse(raw);
  if (!parsed.success) {
    return json(
      { displayContent: 'Invalid lesson request.', metadata: null, provider: 'local-fallback', error: parsed.error.message },
      { status: 400 }
    );
  }
  const payload = parsed.data as unknown as LessonChatRequest;
  const lesson =
    payload.lesson ??
    buildDynamicLessonFromTopic({
      subjectId: payload.lessonSession.subjectId,
      subjectName: payload.lessonSession.subject,
      grade: payload.student.grade,
      topicTitle: payload.lessonSession.topicTitle,
      topicDescription: payload.lessonSession.topicDescription,
      curriculumReference: payload.lessonSession.curriculumReference
    });
  const requestPayload: LessonChatRequest = { ...payload, lesson };
  const edgeContext = await getAuthenticatedEdgeContext(request);

  if (!edgeContext) {
    return json({ error: 'Authentication required for AI lesson chat.' }, { status: 401 });
  }

  const functionResponse = await fetch(`${edgeContext.functionsUrl}/github-models-tutor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: edgeContext.authHeader
      },
      body: JSON.stringify({
        request: requestPayload,
        mode: 'lesson-chat'
      })
  });

  if (!functionResponse.ok) {
    return json({ error: `AI edge function failed with ${functionResponse.status}.` }, { status: 502 });
  }

  const functionPayload = (await functionResponse.json()) as LessonChatResponse;

  if (functionPayload.provider !== 'github-models' || !functionPayload.displayContent || !functionPayload.metadata) {
    return json({ error: 'AI edge function returned invalid lesson chat data.' }, { status: 502 });
  }

  await Promise.all([
    logAiInteraction(payload.student.id, JSON.stringify(requestPayload), JSON.stringify(functionPayload), functionPayload.provider),
    logLessonSignal(payload.student.id, payload.lessonSession, functionPayload.metadata)
  ]);
  return json(functionPayload);
}
