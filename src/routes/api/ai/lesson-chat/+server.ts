import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { dev } from '$app/environment';
import { buildDynamicLessonFromTopic } from '$lib/lesson-system';
import { buildFallbackLessonChatResponse } from '$lib/ai/lesson-chat';
import { logAiInteraction, logLessonSignal } from '$lib/server/state-repository';
import { invokeAuthenticatedAiEdge } from '$lib/server/ai-edge';
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
  const edge = await invokeAuthenticatedAiEdge<LessonChatResponse>(
    request,
    fetch,
    'lesson-chat',
    requestPayload
  );

  if (!edge.ok || !edge.payload) {
    if (dev) console.warn('[lesson-chat] Edge function unavailable, using local fallback.', edge);
    return json(buildFallbackLessonChatResponse(requestPayload, lesson));
  }

  const functionPayload = edge.payload;

  if (functionPayload.provider !== 'github-models' || !functionPayload.displayContent || !functionPayload.metadata) {
    if (dev) console.warn('[lesson-chat] Edge function returned invalid payload, using local fallback.', functionPayload);
    return json(buildFallbackLessonChatResponse(requestPayload, lesson));
  }

  await Promise.all([
    logAiInteraction(
      payload.student.id,
      JSON.stringify(requestPayload),
      JSON.stringify(functionPayload),
      functionPayload.provider,
      {
        mode: 'lesson-chat',
        modelTier: functionPayload.modelTier,
        model: functionPayload.model
      }
    ),
    logLessonSignal(payload.student.id, payload.lessonSession, functionPayload.metadata)
  ]);
  return json(functionPayload);
}
