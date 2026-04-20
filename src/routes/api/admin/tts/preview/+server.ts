import { createLessonTtsService, LessonTtsServiceError } from '$lib/server/lesson-tts-service';
import { requireAdminSession } from '$lib/server/admin/admin-guard';
import { getTtsConfig } from '$lib/server/tts-config';

export async function POST({ request }: { request: Request }) {
  const adminSession = await requireAdminSession(request);
  const raw = await request.json().catch(() => null);
  const content = typeof raw?.content === 'string' ? raw.content.trim() : '';
  const config = await getTtsConfig();

  if (!content) {
    return Response.json({ error: 'Preview content must not be empty.' }, { status: 400 });
  }

  if (content.length > config.previewMaxChars) {
    return Response.json(
      { error: `Preview text exceeds the maximum length of ${config.previewMaxChars} characters.` },
      { status: 400 }
    );
  }

  try {
    const result = await createLessonTtsService().previewAdminTts({
      content,
      profileId: adminSession.profileId
    });

    return new Response(result.audio, {
      status: 200,
      headers: {
        'content-type': result.mimeType,
        'cache-control': 'no-store'
      }
    });
  } catch (error) {
    if (error instanceof LessonTtsServiceError) {
      const status =
        error.code === 'bad_request'
          ? 400
          : error.code === 'tts_unavailable'
            ? 503
            : 502;

      return Response.json({ error: error.message }, { status });
    }

    return Response.json({ error: 'Admin TTS preview unavailable.' }, { status: 502 });
  }
}
