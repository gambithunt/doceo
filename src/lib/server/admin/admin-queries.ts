import { createServerSupabaseAdmin } from '$lib/server/supabase';

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  grade: string;
  curriculum: string;
  role: string;
  createdAt: string | null;
  lastActiveAt: string | null;
  lessonCount: number;
  completedCount: number;
  plan: 'free' | 'pro';
  status: 'active' | 'suspended';
}

export interface AdminKpi {
  activeUsersToday: number;
  lessonsStartedToday: number;
  completionRate: number;
  aiSpendToday: number;
  aiErrorsLastHour: number;
  revenueMtd: number;
  totalUsers: number;
  totalLessons: number;
}

export interface AdminKpiDeltas {
  activeUsersDelta: number | null;
  lessonsStartedDelta: number | null;
  completionRateDelta: number | null;
  aiSpendDelta: number | null;
}

export interface ActivityEvent {
  id: string;
  userId: string;
  userName: string;
  eventType: string;
  detail: string;
  createdAt: string;
  category: 'complete' | 'start' | 'reteach' | 'error' | 'signup';
}

export interface LessonSessionRow {
  id: string;
  profileId: string;
  lessonId: string;
  status: string;
  currentStage: string;
  confidenceScore: number | null;
  startedAt: string;
  lastActiveAt: string | null;
  completedAt: string | null;
  subject: string | null;
  topicTitle: string | null;
}

export interface MessageRow {
  id: string;
  sessionId: string;
  profileId: string;
  role: string;
  content: string;
  stage: string | null;
  timestamp: string;
  metadataJson: Record<string, unknown> | null;
  userName: string | null;
  subject: string | null;
  topicTitle: string | null;
  lessonId: string | null;
}

export interface AiInteractionRow {
  id: string;
  profileId: string;
  provider: string;
  mode: string | null;
  modelTier: string | null;
  model: string | null;
  tokensUsed: number | null;
  costUsd: number | null;
  latencyMs: number | null;
  createdAt: string;
}

export interface SubjectStats {
  subject: string;
  totalSessions: number;
  completedSessions: number;
  completionRate: number;
  reteachCount: number;
  reteachRate: number;
}

export interface StageDropoff {
  stage: string;
  entered: number;
  dropoffRate: number;
}

function startOfDay(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfMonth(date: Date): string {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

export async function getAdminKpis(): Promise<AdminKpi> {
  const supabase = createServerSupabaseAdmin();
  if (!supabase) {
    return {
      activeUsersToday: 0, lessonsStartedToday: 0, completionRate: 0,
      aiSpendToday: 0, aiErrorsLastHour: 0, revenueMtd: 0,
      totalUsers: 0, totalLessons: 0
    };
  }

  const todayStart = startOfDay(new Date());
  const monthStart = startOfMonth(new Date());

  const [
    totalUsersResult,
    activeUsersResult,
    lessonsStartedResult,
    completedResult,
    totalSessionsResult,
    aiInteractionsResult
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase
      .from('analytics_events')
      .select('profile_id', { count: 'exact', head: true })
      .gte('created_at', todayStart),
    supabase
      .from('lesson_sessions')
      .select('id', { count: 'exact', head: true })
      .gte('started_at', todayStart),
    supabase
      .from('lesson_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'complete'),
    supabase
      .from('lesson_sessions')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('ai_interactions')
      .select('cost_usd')
      .gte('created_at', todayStart)
  ]);

  const totalSessions = totalSessionsResult.count ?? 0;
  const completedSessions = completedResult.count ?? 0;
  const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

  const aiSpendToday = (aiInteractionsResult.data ?? []).reduce(
    (sum, row) => sum + (typeof row.cost_usd === 'number' ? row.cost_usd : 0),
    0
  );

  return {
    activeUsersToday: activeUsersResult.count ?? 0,
    lessonsStartedToday: lessonsStartedResult.count ?? 0,
    completionRate,
    aiSpendToday: Math.round(aiSpendToday * 10000) / 10000,
    aiErrorsLastHour: 0, // Requires dedicated error log table
    revenueMtd: 0, // Requires billing table
    totalUsers: totalUsersResult.count ?? 0,
    totalLessons: totalSessions
  };
}

export async function getRecentActivity(limit = 20): Promise<ActivityEvent[]> {
  const supabase = createServerSupabaseAdmin();
  if (!supabase) return [];

  const { data: events } = await supabase
    .from('analytics_events')
    .select('id, profile_id, event_type, detail, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', (events ?? []).map((e) => e.profile_id));

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  return (events ?? []).map((e) => ({
    id: e.id,
    userId: e.profile_id,
    userName: profileMap.get(e.profile_id) ?? 'Unknown User',
    eventType: e.event_type,
    detail: typeof e.detail === 'string' ? e.detail : JSON.stringify(e.detail ?? ''),
    createdAt: e.created_at,
    category: categorizeEvent(e.event_type)
  }));
}

function categorizeEvent(eventType: string): ActivityEvent['category'] {
  if (eventType.includes('complete')) return 'complete';
  if (eventType.includes('signup') || eventType.includes('onboard')) return 'signup';
  if (eventType.includes('reteach')) return 'reteach';
  if (eventType.includes('error')) return 'error';
  return 'start';
}

export interface UserListOptions {
  search?: string;
  grade?: string;
  curriculum?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export async function getAdminUsers(opts: UserListOptions = {}): Promise<{ users: AdminUser[]; total: number }> {
  const supabase = createServerSupabaseAdmin();
  if (!supabase) return { users: [], total: 0 };

  const { page = 0, pageSize = 50, search = '', grade, curriculum } = opts;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('profiles')
    .select('id, full_name, email, grade, curriculum, role, created_at', { count: 'exact' })
    .range(from, to)
    .order('created_at', { ascending: false });

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  }
  if (grade) query = query.eq('grade', grade);
  if (curriculum) query = query.eq('curriculum', curriculum);

  const { data, count } = await query;

  if (!data) return { users: [], total: 0 };

  const userIds = data.map((p) => p.id);
  const { data: sessionCounts } = await supabase
    .from('lesson_sessions')
    .select('profile_id, status')
    .in('profile_id', userIds);

  const { data: lastActive } = await supabase
    .from('lesson_sessions')
    .select('profile_id, last_active_at')
    .in('profile_id', userIds)
    .order('last_active_at', { ascending: false });

  const sessionsByUser = new Map<string, typeof sessionCounts>();
  (sessionCounts ?? []).forEach((s) => {
    const arr = sessionsByUser.get(s.profile_id) ?? [];
    arr.push(s);
    sessionsByUser.set(s.profile_id, arr);
  });

  const lastActiveByUser = new Map<string, string>();
  (lastActive ?? []).forEach((s) => {
    if (!lastActiveByUser.has(s.profile_id) && s.last_active_at) {
      lastActiveByUser.set(s.profile_id, s.last_active_at);
    }
  });

  const users: AdminUser[] = data.map((p) => {
    const sessions = sessionsByUser.get(p.id) ?? [];
    const completed = sessions.filter((s) => s.status === 'complete').length;
    return {
      id: p.id,
      fullName: p.full_name ?? '',
      email: p.email ?? '',
      grade: p.grade ?? '',
      curriculum: p.curriculum ?? '',
      role: p.role ?? 'student',
      createdAt: p.created_at ?? null,
      lastActiveAt: lastActiveByUser.get(p.id) ?? null,
      lessonCount: sessions.length,
      completedCount: completed,
      plan: 'free',
      status: 'active'
    };
  });

  return { users, total: count ?? 0 };
}

export interface AdminUserDetail {
  id: string;
  fullName: string;
  email: string;
  grade: string;
  gradeId: string;
  curriculum: string;
  curriculumId: string;
  country: string;
  role: string;
  createdAt: string | null;
  schoolYear: string;
  term: string;
  recommendedStartSubjectName: string | null;
}

export async function getAdminUserDetail(profileId: string): Promise<AdminUserDetail | null> {
  const supabase = createServerSupabaseAdmin();
  if (!supabase) return null;

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .maybeSingle<{
      id: string; full_name: string; email: string; grade: string; grade_id: string;
      curriculum: string; curriculum_id: string; country: string; role: string;
      created_at: string; school_year: string; term: string;
      recommended_start_subject_name: string | null;
    }>();

  if (!data) return null;

  return {
    id: data.id,
    fullName: data.full_name ?? '',
    email: data.email ?? '',
    grade: data.grade ?? '',
    gradeId: data.grade_id ?? '',
    curriculum: data.curriculum ?? '',
    curriculumId: data.curriculum_id ?? '',
    country: data.country ?? '',
    role: data.role ?? 'student',
    createdAt: data.created_at ?? null,
    schoolYear: data.school_year ?? '',
    term: data.term ?? '',
    recommendedStartSubjectName: data.recommended_start_subject_name ?? null
  };
}

export async function getUserLessonSessions(profileId: string): Promise<LessonSessionRow[]> {
  const supabase = createServerSupabaseAdmin();
  if (!supabase) return [];

  const { data } = await supabase
    .from('lesson_sessions')
    .select('id, profile_id, lesson_id, status, current_stage, confidence_score, started_at, last_active_at, completed_at, session_json')
    .eq('profile_id', profileId)
    .order('started_at', { ascending: false })
    .limit(100);

  return (data ?? []).map((row) => {
    const json = row.session_json as Record<string, unknown> | null;
    return {
      id: row.id,
      profileId: row.profile_id,
      lessonId: row.lesson_id,
      status: row.status,
      currentStage: row.current_stage,
      confidenceScore: row.confidence_score,
      startedAt: row.started_at,
      lastActiveAt: row.last_active_at,
      completedAt: row.completed_at,
      subject: (json?.subject as string) ?? null,
      topicTitle: (json?.topicTitle as string) ?? null
    };
  });
}

export async function getUserMessages(profileId: string, limit = 100): Promise<MessageRow[]> {
  const supabase = createServerSupabaseAdmin();
  if (!supabase) return [];

  const { data: messages } = await supabase
    .from('lesson_messages')
    .select('id, session_id, profile_id, role, content, stage, timestamp, metadata_json')
    .eq('profile_id', profileId)
    .eq('role', 'user')
    .order('timestamp', { ascending: false })
    .limit(limit);

  const sessionIds = [...new Set((messages ?? []).map((m) => m.session_id))];
  const { data: sessions } = await supabase
    .from('lesson_sessions')
    .select('id, session_json')
    .in('id', sessionIds);

  const sessionMap = new Map((sessions ?? []).map((s) => [s.id, s.session_json as Record<string, unknown>]));

  return (messages ?? []).map((m) => {
    const session = sessionMap.get(m.session_id);
    return {
      id: m.id,
      sessionId: m.session_id,
      profileId: m.profile_id,
      role: m.role,
      content: m.content,
      stage: m.stage,
      timestamp: m.timestamp,
      metadataJson: m.metadata_json as Record<string, unknown> | null,
      userName: null,
      subject: (session?.subject as string) ?? null,
      topicTitle: (session?.topicTitle as string) ?? null,
      lessonId: (session?.lessonId as string) ?? null
    };
  });
}

export async function searchMessages(query: string, opts: {
  subject?: string;
  stage?: string;
  limit?: number;
} = {}): Promise<MessageRow[]> {
  const supabase = createServerSupabaseAdmin();
  if (!supabase) return [];

  const { limit = 50 } = opts;

  let msgQuery = supabase
    .from('lesson_messages')
    .select('id, session_id, profile_id, role, content, stage, timestamp, metadata_json')
    .eq('role', 'user')
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (query) {
    msgQuery = msgQuery.ilike('content', `%${query}%`);
  }
  if (opts.stage) {
    msgQuery = msgQuery.eq('stage', opts.stage);
  }

  const { data: messages } = await msgQuery;

  const profileIds = [...new Set((messages ?? []).map((m) => m.profile_id))];
  const sessionIds = [...new Set((messages ?? []).map((m) => m.session_id))];

  const [profilesResult, sessionsResult] = await Promise.all([
    supabase.from('profiles').select('id, full_name').in('id', profileIds),
    supabase.from('lesson_sessions').select('id, session_json').in('id', sessionIds)
  ]);

  const profileMap = new Map((profilesResult.data ?? []).map((p) => [p.id, p.full_name]));
  const sessionMap = new Map((sessionsResult.data ?? []).map((s) => [s.id, s.session_json as Record<string, unknown>]));

  return (messages ?? []).map((m) => {
    const session = sessionMap.get(m.session_id);
    return {
      id: m.id,
      sessionId: m.session_id,
      profileId: m.profile_id,
      role: m.role,
      content: m.content,
      stage: m.stage,
      timestamp: m.timestamp,
      metadataJson: m.metadata_json as Record<string, unknown> | null,
      userName: profileMap.get(m.profile_id) ?? null,
      subject: (session?.subject as string) ?? null,
      topicTitle: (session?.topicTitle as string) ?? null,
      lessonId: (session?.lessonId as string) ?? null
    };
  });
}

export async function getSessionMessages(sessionId: string): Promise<MessageRow[]> {
  const supabase = createServerSupabaseAdmin();
  if (!supabase) return [];

  const [messagesResult, sessionResult] = await Promise.all([
    supabase
      .from('lesson_messages')
      .select('id, session_id, profile_id, role, content, stage, timestamp, metadata_json')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: true }),
    supabase
      .from('lesson_sessions')
      .select('id, profile_id, session_json')
      .eq('id', sessionId)
      .maybeSingle<{ id: string; profile_id: string; session_json: Record<string, unknown> }>()
  ]);

  const session = sessionResult.data;
  const profileId = session?.profile_id;
  let userName: string | null = null;

  if (profileId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', profileId)
      .maybeSingle<{ full_name: string }>();
    userName = profile?.full_name ?? null;
  }

  return (messagesResult.data ?? []).map((m) => ({
    id: m.id,
    sessionId: m.session_id,
    profileId: m.profile_id,
    role: m.role,
    content: m.content,
    stage: m.stage,
    timestamp: m.timestamp,
    metadataJson: m.metadata_json as Record<string, unknown> | null,
    userName,
    subject: (session?.session_json?.subject as string) ?? null,
    topicTitle: (session?.session_json?.topicTitle as string) ?? null,
    lessonId: (session?.session_json?.lessonId as string) ?? null
  }));
}

export async function getSubjectStats(): Promise<SubjectStats[]> {
  const supabase = createServerSupabaseAdmin();
  if (!supabase) return [];

  const { data: sessions } = await supabase
    .from('lesson_sessions')
    .select('status, session_json');

  if (!sessions) return [];

  const bySubject = new Map<string, { total: number; completed: number }>();
  for (const s of sessions) {
    const subject = (s.session_json as Record<string, unknown>)?.subject as string ?? 'Unknown';
    const entry = bySubject.get(subject) ?? { total: 0, completed: 0 };
    entry.total++;
    if (s.status === 'complete') entry.completed++;
    bySubject.set(subject, entry);
  }

  const { data: signals } = await supabase
    .from('lesson_signals')
    .select('subject, action');

  const reteachBySubject = new Map<string, number>();
  (signals ?? []).forEach((s) => {
    if (s.action === 'reteach') {
      reteachBySubject.set(s.subject, (reteachBySubject.get(s.subject) ?? 0) + 1);
    }
  });

  return Array.from(bySubject.entries()).map(([subject, stats]) => {
    const reteach = reteachBySubject.get(subject) ?? 0;
    return {
      subject,
      totalSessions: stats.total,
      completedSessions: stats.completed,
      completionRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
      reteachCount: reteach,
      reteachRate: stats.total > 0 ? Math.round((reteach / stats.total) * 100) : 0
    };
  }).sort((a, b) => b.totalSessions - a.totalSessions);
}

export interface StageStats {
  stage: string;
  entered: number;
  completionRate: number;
  reteachRate: number;
}

const STAGE_ORDER = [
  'orientation', 'mentalModel', 'concepts', 'guidedConstruction',
  'workedExample', 'practicePrompt', 'commonMistakes', 'transferChallenge', 'summary', 'complete'
];

export async function getStageDropoff(): Promise<StageStats[]> {
  const supabase = createServerSupabaseAdmin();
  if (!supabase) return [];

  const { data } = await supabase
    .from('lesson_signals')
    .select('action, confidence_assessment');

  if (!data) return [];

  const { data: sessions } = await supabase
    .from('lesson_sessions')
    .select('current_stage, status');

  const stageCounts = new Map<string, number>();
  (sessions ?? []).forEach((s) => {
    const stage = s.current_stage ?? 'orientation';
    stageCounts.set(stage, (stageCounts.get(stage) ?? 0) + 1);
    // Count all stages up to current
    const idx = STAGE_ORDER.indexOf(stage);
    STAGE_ORDER.slice(0, idx).forEach((prevStage) => {
      stageCounts.set(prevStage, (stageCounts.get(prevStage) ?? 0) + 1);
    });
  });

  const maxEntered = Math.max(...Array.from(stageCounts.values()), 1);

  return STAGE_ORDER.map((stage) => ({
    stage,
    entered: stageCounts.get(stage) ?? 0,
    completionRate: Math.round(((stageCounts.get(stage) ?? 0) / maxEntered) * 100),
    reteachRate: 0
  }));
}

export async function getAiSpendByRoute(since: Date): Promise<Array<{
  route: string;
  requests: number;
  estimatedCost: number;
}>> {
  const supabase = createServerSupabaseAdmin();
  if (!supabase) return [];

  const { data } = await supabase
    .from('ai_interactions')
    .select('mode, cost_usd, created_at')
    .gte('created_at', since.toISOString());

  if (!data) return [];

  const routeStats = new Map<string, { requests: number; cost: number }>();
  for (const row of data) {
    const route = (row.mode as string | null) ?? 'lesson-chat';
    const entry = routeStats.get(route) ?? { requests: 0, cost: 0 };
    entry.requests++;
    entry.cost += typeof row.cost_usd === 'number' ? row.cost_usd : 0;
    routeStats.set(route, entry);
  }

  return Array.from(routeStats.entries()).map(([route, { requests, cost }]) => ({
    route,
    requests,
    estimatedCost: Math.round(cost * 10000) / 10000
  })).sort((a, b) => b.requests - a.requests);
}

export async function getDailyActiveUsers(days = 30): Promise<Array<{ date: string; count: number }>> {
  const supabase = createServerSupabaseAdmin();
  if (!supabase) return [];

  const since = daysAgo(days);
  const { data } = await supabase
    .from('analytics_events')
    .select('profile_id, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: true });

  if (!data) return [];

  const byDay = new Map<string, Set<string>>();
  data.forEach((e) => {
    const day = e.created_at.slice(0, 10);
    const set = byDay.get(day) ?? new Set();
    set.add(e.profile_id);
    byDay.set(day, set);
  });

  return Array.from(byDay.entries()).map(([date, users]) => ({ date, count: users.size }));
}
