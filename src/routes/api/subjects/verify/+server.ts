import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { getAuthenticatedEdgeContext, invokeAuthenticatedAiEdge } from '$lib/server/ai-edge';
import { createServerSupabaseAdmin, isSupabaseConfigured } from '$lib/server/supabase';
import {
  buildSubjectId,
  buildProvisionalResult,
  gradeIdsForBand,
  type SubjectVerifyRequest,
  type SubjectVerifyResponse
} from '$lib/ai/subject-verify';

const VerifyBodySchema = z.object({
  name: z.string().min(1).max(120),
  curriculumId: z.string().min(1),
  curriculum: z.string().min(1),
  gradeId: z.string().min(1),
  grade: z.string().min(1),
  country: z.string().min(1)
});

export async function POST({ request, fetch }) {
  const edgeContext = await getAuthenticatedEdgeContext(request);
  if (!edgeContext) {
    return json({ error: 'Authentication required.' }, { status: 401 });
  }

  const raw = await request.json();
  const parsed = VerifyBodySchema.safeParse(raw);
  if (!parsed.success) {
    return json({ error: parsed.error.message }, { status: 400 });
  }

  const body = parsed.data;
  const subjectId = buildSubjectId(body.curriculumId, body.gradeId, body.name);

  // Check if the subject already exists in the DB for this grade
  const supabase = createServerSupabaseAdmin();
  if (supabase && isSupabaseConfigured()) {
    const { data: existing } = await supabase
      .from('curriculum_subjects')
      .select('id, name, category')
      .eq('id', subjectId)
      .maybeSingle<{ id: string; name: string; category: 'core' | 'language' | 'elective' }>();

    if (existing) {
      return json({
        result: {
          valid: true,
          normalizedName: existing.name,
          category: existing.category,
          gradeBand: null,
          reason: null,
          suggestion: null
        },
        subjectId: existing.id,
        provider: 'db-cache',
        provisional: false
      } satisfies SubjectVerifyResponse & { subjectId: string });
    }
  }

  // Call LLM to verify
  const verifyRequest: SubjectVerifyRequest = {
    name: body.name,
    curriculumId: body.curriculumId,
    curriculum: body.curriculum,
    gradeId: body.gradeId,
    grade: body.grade,
    country: body.country
  };

  const edge = await invokeAuthenticatedAiEdge<SubjectVerifyResponse>(
    request,
    fetch,
    'subject-verify',
    verifyRequest
  );

  if (!edge.ok || !edge.payload) {
    // LLM unavailable — return provisional so the caller can store it locally
    return json({
      result: buildProvisionalResult(body.name),
      subjectId,
      provider: 'local-fallback',
      provisional: true
    } satisfies SubjectVerifyResponse & { subjectId: string });
  }

  const { result } = edge.payload;

  // Insert into curriculum_subjects for every grade in the band (if valid)
  if (result.valid && result.normalizedName && result.gradeBand && supabase && isSupabaseConfigured()) {
    const gradeIds = gradeIdsForBand(body.curriculumId, result.gradeBand);
    const rows = gradeIds.map((gId) => ({
      id: buildSubjectId(body.curriculumId, gId, result.normalizedName!),
      curriculum_id: body.curriculumId,
      grade_id: gId,
      name: result.normalizedName!,
      category: result.category ?? 'elective',
      source: 'user_contributed'
    }));

    await supabase.from('curriculum_subjects').upsert(rows, { onConflict: 'id', ignoreDuplicates: true });
  }

  const resolvedSubjectId = result.valid && result.normalizedName
    ? buildSubjectId(body.curriculumId, body.gradeId, result.normalizedName)
    : subjectId;

  return json({
    result,
    subjectId: resolvedSubjectId,
    provider: edge.payload.provider,
    provisional: false
  } satisfies SubjectVerifyResponse & { subjectId: string });
}
