CREATE TABLE IF NOT EXISTS admin_settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- No RLS — accessed only via service role from admin server routes

INSERT INTO admin_settings (key, value) VALUES (
  'ai_config',
  '{"provider":"github-models","tiers":{"fast":{"model":"openai/gpt-4.1-nano"},"default":{"model":"openai/gpt-4o-mini"},"thinking":{"model":"openai/gpt-4.1-mini"}},"routeOverrides":{}}'::jsonb
) ON CONFLICT (key) DO NOTHING;
