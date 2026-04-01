import { json } from '@sveltejs/kit';
import { requireAdminSession } from '$lib/server/admin/admin-guard';
import { createServerDynamicOperationsService } from '$lib/server/dynamic-operations';
import { createServerGraphRepository } from '$lib/server/graph-repository';

function toCsvRow(values: Array<string | number | null | undefined>): string {
  return values
    .map((value) => {
      const normalized = value == null ? '' : String(value);
      return `"${normalized.replaceAll('"', '""')}"`;
    })
    .join(',');
}

export async function GET({ request, url }) {
  await requireAdminSession(request);

  const currentUrl = url ?? new URL(request.url);
  const stream = currentUrl.searchParams.get('stream') ?? 'governance';
  const format = currentUrl.searchParams.get('format') ?? 'json';
  const days = Number(currentUrl.searchParams.get('days') ?? '30');

  if (stream === 'governance') {
    const operations = createServerDynamicOperationsService();
    const records = (await operations?.listGovernanceActions(200)) ?? [];

    if (format === 'csv') {
      const header = toCsvRow([
        'id',
        'actionType',
        'actorId',
        'nodeId',
        'artifactId',
        'promptVersion',
        'provider',
        'model',
        'reason',
        'createdAt'
      ]);
      const body = records.map((record) =>
        toCsvRow([
          record.id,
          record.actionType,
          record.actorId,
          record.nodeId,
          record.artifactId,
          record.promptVersion,
          record.provider,
          record.model,
          record.reason,
          record.createdAt
        ])
      );

      return new Response([header, ...body].join('\n'), {
        headers: {
          'content-type': 'text/csv; charset=utf-8'
        }
      });
    }

    return json({ stream, records });
  }

  if (stream === 'graph-admin') {
    const graphRepository = createServerGraphRepository();
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const records =
      (await graphRepository?.listEvents({
        actorTypes: ['admin'],
        since,
        limit: 300
      })) ?? [];

    if (format === 'csv') {
      const header = toCsvRow([
        'id',
        'nodeId',
        'eventType',
        'actorType',
        'actorId',
        'reason',
        'occurredAt'
      ]);
      const body = records.map((record) =>
        toCsvRow([
          record.id,
          record.nodeId,
          record.eventType,
          record.actorType,
          record.actorId,
          typeof record.payload.reason === 'string' ? record.payload.reason : '',
          record.occurredAt
        ])
      );

      return new Response([header, ...body].join('\n'), {
        headers: {
          'content-type': 'text/csv; charset=utf-8'
        }
      });
    }

    return json({ stream, records });
  }

  return json({ error: 'Unsupported audit stream.' }, { status: 400 });
}
