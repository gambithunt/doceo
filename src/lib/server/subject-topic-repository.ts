import { createHash } from 'crypto';
import { createServerSupabaseAdmin, isSupabaseConfigured } from '$lib/server/supabase';

export interface SubjectTopicRow {
  id: string;
  subject_key: string;
  subject_display: string;
  level: string;
  year: string;
  topic_label: string;
  topic_signature: string;
  textbook_ref: string | null;
  blurb: string | null;
  source: 'manual' | 'ai_generated' | 'admin_edited';
  status: 'active' | 'candidate' | 'hidden';
  admin_weight: number;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubjectTopicRankedRow extends SubjectTopicRow {
  impression_count: number;
  click_count: number;
  thumbs_up_count: number;
  thumbs_down_count: number;
  completion_rate: number | null;
  rank_score: number;
}

export interface ListRankedSubjectTopicsOptions {
  subjectKey: string;
  level: string;
  year: string;
  limit?: number;
}

export interface InsertCandidateTopicOptions {
  subjectKey: string;
  subjectDisplay: string;
  level: string;
  year: string;
  topicLabel: string;
  textbookRef?: string;
  blurb?: string;
}

function computeTopicSignature(subjectKey: string, level: string, year: string, topicLabel: string): string {
  const input = `${subjectKey}:${level}:${year}:${topicLabel.toLowerCase()}`;
  return createHash('sha256').update(input).digest('hex');
}

export async function listRankedSubjectTopics(
  options: ListRankedSubjectTopicsOptions
): Promise<SubjectTopicRankedRow[]> {
  const supabase = createServerSupabaseAdmin();

  if (!supabase || !isSupabaseConfigured()) {
    return [];
  }

  const { subjectKey, level, year, limit = 20 } = options;

  const { data, error } = await supabase
    .from('subject_topic_ranked')
    .select('*')
    .eq('status', 'active')
    .eq('subject_key', subjectKey)
    .eq('level', level)
    .eq('year', year)
    .order('rank_score', { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data as SubjectTopicRankedRow[];
}

export async function insertCandidateTopic(
  options: InsertCandidateTopicOptions
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = createServerSupabaseAdmin();

  if (!supabase || !isSupabaseConfigured()) {
    return { ok: false, error: 'Database unavailable' };
  }

  const { subjectKey, subjectDisplay, level, year, topicLabel, textbookRef, blurb } = options;

  const topicSignature = computeTopicSignature(subjectKey, level, year, topicLabel);

  const { data, error } = await supabase.from('subject_topics').upsert(
    {
      subject_key: subjectKey,
      subject_display: subjectDisplay,
      level,
      year,
      topic_label: topicLabel,
      topic_signature: topicSignature,
      textbook_ref: textbookRef ?? null,
      blurb: blurb ?? null,
      source: 'ai_generated',
      status: 'candidate'
    },
    { onConflict: 'topic_signature', ignoreDuplicates: true }
  );

  if (error || !data) {
    return { ok: false, error: error?.message ?? 'Insert failed' };
  }

  return { ok: true, id: (data as { id: string }[])[0]?.id };
}