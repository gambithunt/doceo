import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface SubjectTopicsRequest {
  subjectId: string;
  curriculumId: string;
  gradeId: string;
}

interface TopicRow {
  id: string;
  label: string;
}

interface SubtopicRow {
  id: string;
  label: string;
  parent_id: string;
}

const ACTIVE_STATUSES = ['canonical', 'provisional'];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  if (!request.headers.get('Authorization')) {
    return jsonResponse({ error: 'Authorization required.' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ error: 'Supabase is not configured.' }, 500);
  }

  let body: SubjectTopicsRequest;
  try {
    body = (await request.json()) as SubjectTopicsRequest;
  } catch {
    return jsonResponse({ error: 'Invalid JSON body.' }, 400);
  }

  const { subjectId, curriculumId, gradeId } = body;
  if (!subjectId || !curriculumId || !gradeId) {
    return jsonResponse({ error: 'subjectId, curriculumId, and gradeId are required.' }, 400);
  }

  const client = createClient(supabaseUrl, serviceKey);

  const { data: topics, error: topicsError } = await client
    .from('curriculum_graph_nodes')
    .select('id, label')
    .eq('type', 'topic')
    .eq('parent_id', subjectId)
    .eq('scope_curriculum', curriculumId)
    .eq('scope_grade', gradeId)
    .in('status', ACTIVE_STATUSES)
    .order('label');

  if (topicsError) {
    console.error(JSON.stringify({ event: 'subject_topics_error', error: topicsError.message }));
    return jsonResponse({ error: 'Failed to load topics.' }, 500);
  }

  const topicRows = (topics ?? []) as TopicRow[];

  if (topicRows.length === 0) {
    return jsonResponse({ topics: [] });
  }

  const topicIds = topicRows.map((t) => t.id);

  const { data: subtopics, error: subtopicsError } = await client
    .from('curriculum_graph_nodes')
    .select('id, label, parent_id')
    .eq('type', 'subtopic')
    .in('parent_id', topicIds)
    .eq('scope_curriculum', curriculumId)
    .eq('scope_grade', gradeId)
    .in('status', ACTIVE_STATUSES)
    .order('label');

  if (subtopicsError) {
    console.error(JSON.stringify({ event: 'subject_subtopics_error', error: subtopicsError.message }));
  }

  const subtopicsByTopic = new Map<string, { id: string; name: string }[]>();
  for (const row of (subtopics ?? []) as SubtopicRow[]) {
    const existing = subtopicsByTopic.get(row.parent_id) ?? [];
    subtopicsByTopic.set(row.parent_id, [...existing, { id: row.id, name: row.label }]);
  }

  const result = topicRows.map((topic) => ({
    id: topic.id,
    name: topic.label,
    subtopics: subtopicsByTopic.get(topic.id) ?? []
  }));

  console.info(JSON.stringify({ event: 'subject_topics_success', topicCount: result.length }));

  return jsonResponse({ topics: result });
});
