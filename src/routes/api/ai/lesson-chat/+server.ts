import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { dev } from '$app/environment';
import { buildDynamicLessonFromTopic, parseDoceoMeta, stripDoceoMeta } from '$lib/lesson-system';
import { buildSystemPrompt, buildFallbackLessonChatResponse } from '$lib/ai/lesson-chat';
import { logAiInteraction, logLessonSignal } from '$lib/server/state-repository';
import { invokeAuthenticatedAiEdge } from '$lib/server/ai-edge';
import { getAiConfig, resolveAiRoute } from '$lib/server/ai-config';
import { getProviderAdapter } from '$lib/server/ai-providers';
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

  const aiConfig = await getAiConfig();
  const { provider, model } = resolveAiRoute(aiConfig, 'lesson-chat');

  // GitHub Models: use existing edge function path (handles prompt building + auth)
  if (provider === 'github-models') {
    const edge = await invokeAuthenticatedAiEdge<LessonChatResponse>(
      request, fetch, 'lesson-chat', requestPayload
    );

    if (!edge.ok || !edge.payload) {
      if (dev) console.warn('[lesson-chat] Edge function unavailable, using local fallback.', edge);
      return json(buildFallbackLessonChatResponse(requestPayload, lesson));
    }

    const functionPayload = edge.payload;
    if (!functionPayload.displayContent || !functionPayload.metadata) {
      if (dev) console.warn('[lesson-chat] Edge function returned invalid payload, using local fallback.');
      return json(buildFallbackLessonChatResponse(requestPayload, lesson));
    }

    await Promise.all([
      logAiInteraction(payload.student.id, JSON.stringify(requestPayload), JSON.stringify(functionPayload), provider, {
        mode: 'lesson-chat',
        modelTier: (functionPayload as { modelTier?: string }).modelTier,
        model: (functionPayload as { model?: string }).model
      }),
      logLessonSignal(payload.student.id, payload.lessonSession, functionPayload.metadata)
    ]);
    return json(functionPayload);
  }

  // Direct provider path (OpenAI, Anthropic, Kimi)
  const adapter = getProviderAdapter(provider);
  const systemPrompt = buildSystemPrompt(requestPayload);

  const MAX_HISTORY = 20;
  const history = requestPayload.lessonSession.messages
    .filter((m) => m.role === 'assistant' || m.role === 'user')
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  const userMessage = `[STAGE: ${requestPayload.lessonSession.currentStage}, TYPE: ${requestPayload.messageType}]\n\n${requestPayload.message}`;

  let completionResult;
  try {
    completionResult = await adapter.complete({
      model,
      systemPrompt,
      messages: [...history, { role: 'user', content: userMessage }],
      temperature: 0.4
    });
  } catch (err) {
    if (dev) console.warn('[lesson-chat] Direct provider call failed, using local fallback.', err);
    return json(buildFallbackLessonChatResponse(requestPayload, lesson));
  }

  const { content, tokensUsed } = completionResult;
  const displayContent = stripDoceoMeta(content);
  const metadata = parseDoceoMeta(content);

  if (!displayContent || !metadata) {
    return json(buildFallbackLessonChatResponse(requestPayload, lesson));
  }

  const responsePayload: LessonChatResponse = { displayContent, metadata, provider };

  await Promise.all([
    logAiInteraction(payload.student.id, JSON.stringify(requestPayload), JSON.stringify({ content, tokensUsed }), provider, {
      mode: 'lesson-chat',
      model
    }),
    logLessonSignal(payload.student.id, payload.lessonSession, metadata)
  ]);

  return json(responsePayload);
}
