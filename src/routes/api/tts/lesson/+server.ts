import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { createLessonTtsService, LessonTtsServiceError } from '$lib/server/lesson-tts-service';
import { createServerSupabaseFromRequest } from '$lib/server/supabase';

const LessonTtsBodySchema = z.object({
  lessonSessionId: z.string().min(1),
  lessonMessageId: z.string().min(1),
  content: z.string().min(1)
});

export async function POST({ request }: { request: Request }) {
  const supabase = createServerSupabaseFromRequest(request);
  if (!supabase) {
    return json({ error: 'Authentication is required.' }, { status: 401 });
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return json({ error: 'Authentication is required.' }, { status: 401 });
  }

  const raw = await request.json().catch(() => null);
  const parsed = LessonTtsBodySchema.safeParse(raw);
  if (!parsed.success) {
    return json({ error: 'Invalid lesson TTS request.' }, { status: 400 });
  }

  try {
    const result = await createLessonTtsService().synthesizeLessonTts({
      userId: user.id,
      profileId: null,
      lessonSessionId: parsed.data.lessonSessionId,
      lessonMessageId: parsed.data.lessonMessageId,
      content: parsed.data.content
    });

    return json({
      ok: true,
      ...result
    });
  } catch (error) {
    if (error instanceof LessonTtsServiceError) {
      console.error('[lesson-tts] request failed', {
        code: error.code,
        message: error.message,
        reasonCategory:
          error.fallbackError?.category ?? error.primaryError?.category ?? error.normalizedError?.category ?? null,
        provider:
          error.fallbackError?.provider ?? error.primaryError?.provider ?? error.normalizedError?.provider ?? null,
        lessonSessionId: parsed.data.lessonSessionId,
        lessonMessageId: parsed.data.lessonMessageId
      });

      const status =
        error.code === 'bad_request'
          ? 400
          : error.code === 'entitlement_denied'
            ? 402
            : error.code === 'tts_unavailable'
              ? 503
              : 502;
      return json(
        error.code === 'entitlement_denied'
          ? {
              error: error.message,
              code: 'entitlement_denied',
              requiredPlan: 'standard_or_premium',
              upgradeTier: 'standard'
            }
          : error.code === 'tts_unavailable'
            ? {
                error: error.message,
                code: 'tts_unavailable'
              }
            : {
                error: error.message
              },
        { status }
      );
    }

    console.error('[lesson-tts] unexpected request failure', {
      message: error instanceof Error ? error.message : String(error),
      lessonSessionId: parsed.data.lessonSessionId,
      lessonMessageId: parsed.data.lessonMessageId
    });

    return json({ error: 'Lesson TTS unavailable.' }, { status: 502 });
  }
}
