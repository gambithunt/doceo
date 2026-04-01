import { createServerSupabaseAdmin, isSupabaseConfigured } from '$lib/server/supabase';
import { createServerDynamicOperationsService } from '$lib/server/dynamic-operations';

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  detail: string;
}

async function loadServiceStatus(): Promise<ServiceStatus[]> {
  const services: ServiceStatus[] = [];

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

  return services;
}

export async function load() {
  const [services, dashboard] = await Promise.all([
    loadServiceStatus(),
    createServerDynamicOperationsService()?.getSystemDashboard() ?? Promise.resolve(null)
  ]);

  return {
    services,
    dashboard: dashboard ?? {
      metrics: {
        lessonGeneration: { successCount24h: 0, failureCount24h: 0, successRate24h: 0 },
        revisionGeneration: { successCount24h: 0, failureCount24h: 0, successRate24h: 0 },
        graph: { nodesCreated7d: 0, promotions7d: 0, reviewFlags7d: 0, duplicateCandidates24h: 0, openDuplicateCandidates: 0 },
        migration: { unresolvedPending: 0, unresolvedCreated7d: 0 },
        artifacts: { lowQualityArtifacts7d: 0, regenerationRequests7d: 0 }
      },
      routeHealth: [],
      graphGrowth: [],
      artifactQuality: [],
      recentIncidents: [],
      alerts: [],
      governanceAudit: [],
      policy: {
        thresholds: {},
        reviewCadence: {},
        rollback: {}
      }
    }
  };
}
