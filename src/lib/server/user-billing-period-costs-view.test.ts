import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('user_billing_period_costs view migrations', () => {
  it('maps ai_interactions through profiles.auth_user_id for quota and subscription joins', async () => {
    const migration = await readFile(
      path.join(
        process.cwd(),
        'supabase/migrations/20260416000003_fix_user_billing_period_costs_view_auth_user_id.sql'
      ),
      'utf8'
    );

    expect(migration).toContain('create or replace view user_billing_period_costs as');
    expect(migration).toContain('profiles.auth_user_id as user_id');
    expect(migration).toContain('join profiles on profiles.id = ai_interactions.profile_id');
  });
});
