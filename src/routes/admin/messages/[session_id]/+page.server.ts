import { error } from '@sveltejs/kit';
import { requireAdminSession } from '$lib/server/admin/admin-guard';
import { getSessionMessages } from '$lib/server/admin/admin-queries';
import { createServerSupabaseAdmin } from '$lib/server/supabase';

export async function load({ params, request }: { params: { session_id: string }; request: Request }) {
  await requireAdminSession(request);
  const sessionId = params.session_id;
  const messages = await getSessionMessages(sessionId);

  if (messages.length === 0) {
    // Check if session exists at all
    const supabase = createServerSupabaseAdmin();
    if (supabase) {
      const { data } = await supabase
        .from('lesson_sessions')
        .select('id, profile_id, session_json, status, started_at, completed_at')
        .eq('id', sessionId)
        .maybeSingle<{
          id: string;
          profile_id: string;
          session_json: Record<string, unknown>;
          status: string;
          started_at: string;
          completed_at: string | null;
        }>();

      if (!data) throw error(404, 'Session not found');

      return {
        sessionId,
        messages: [],
        session: {
          id: data.id,
          profileId: data.profile_id,
          subject: (data.session_json?.subject as string) ?? null,
          topicTitle: (data.session_json?.topicTitle as string) ?? null,
          lessonId: (data.session_json?.lessonId as string) ?? null,
          status: data.status,
          startedAt: data.started_at,
          completedAt: data.completed_at
        },
        userName: null
      };
    }
    throw error(404, 'Session not found');
  }

  const firstMsg = messages[0];
  const supabase = createServerSupabaseAdmin();
  let session: {
    id: string; profileId: string; subject: string | null; topicTitle: string | null;
    lessonId: string | null; status: string; startedAt: string; completedAt: string | null;
  } | null = null;

  if (supabase) {
    const { data } = await supabase
      .from('lesson_sessions')
      .select('id, profile_id, session_json, status, started_at, completed_at')
      .eq('id', sessionId)
      .maybeSingle<{
        id: string;
        profile_id: string;
        session_json: Record<string, unknown>;
        status: string;
        started_at: string;
        completed_at: string | null;
      }>();

    if (data) {
      session = {
        id: data.id,
        profileId: data.profile_id,
        subject: (data.session_json?.subject as string) ?? null,
        topicTitle: (data.session_json?.topicTitle as string) ?? null,
        lessonId: (data.session_json?.lessonId as string) ?? null,
        status: data.status,
        startedAt: data.started_at,
        completedAt: data.completed_at
      };
    }
  }

  return {
    sessionId,
    messages,
    session,
    userName: firstMsg.userName
  };
}
