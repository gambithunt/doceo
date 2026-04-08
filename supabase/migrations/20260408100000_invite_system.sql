CREATE TABLE IF NOT EXISTS registration_settings (
  key         text PRIMARY KEY,
  mode        text NOT NULL CHECK (mode IN ('open', 'invite_only', 'closed')),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invited_users (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_email    text NOT NULL,
  status              text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
  invited_by          text,
  invited_at          timestamptz NOT NULL DEFAULT now(),
  accepted_at         timestamptz
);

CREATE UNIQUE INDEX idx_invited_users_normalized_email ON invited_users (normalized_email) WHERE status = 'pending';

INSERT INTO registration_settings (key, mode) VALUES (
  'registration_mode',
  'open'
) ON CONFLICT (key) DO NOTHING;