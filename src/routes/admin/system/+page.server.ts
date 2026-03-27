import { createServerSupabaseAdmin, isSupabaseConfigured } from '$lib/server/supabase';

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  detail: string;
}

export async function load() {
  const services: ServiceStatus[] = [];

  // Supabase check
  if (!isSupabaseConfigured()) {
    services.push({ name: 'Supabase', status: 'down', detail: 'Not configured' });
  } else {
    const supabase = createServerSupabaseAdmin();
    if (!supabase) {
      services.push({ name: 'Supabase', status: 'down', detail: 'Client unavailable' });
    } else {
      try {
        const start = Date.now();
        await supabase.from('profiles').select('id', { count: 'exact', head: true });
        const latency = Date.now() - start;
        services.push({
          name: 'Supabase',
          status: latency < 500 ? 'healthy' : 'degraded',
          detail: `${latency}ms response`
        });
      } catch {
        services.push({ name: 'Supabase', status: 'down', detail: 'Query failed' });
      }
    }
  }

  services.push({
    name: 'SvelteKit App',
    status: 'healthy',
    detail: 'Serving requests'
  });

  // Route health summary
  const routeHealth = [
    { route: 'POST /api/ai/lesson-chat', status: 'unknown' },
    { route: 'POST /api/ai/topic-shortlist', status: 'unknown' },
    { route: 'GET /api/state/bootstrap', status: 'unknown' },
    { route: 'POST /api/state/sync', status: 'unknown' }
  ];

  return { services, routeHealth };
}
