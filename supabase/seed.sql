-- Seed file: creates a test user for local development.
-- This runs after every `supabase db reset`.
-- Password: testpass123
--
-- NOTE: auth schema is owned by supabase_auth_admin, not postgres, so this
-- seed file cannot create triggers in auth. After db reset, run:
--   npm run db:reset   (which chains supabase db reset + the auth fix)

insert into auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  role,
  aud
) values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'test@doceo.local',
  crypt('testpass123', gen_salt('bf')),
  now(),
  '',
  '',
  '',
  '',
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Test Student"}',
  now(),
  now(),
  'authenticated',
  'authenticated'
) on conflict (id) do nothing;

insert into auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'test@doceo.local',
  jsonb_build_object('sub', '00000000-0000-0000-0000-000000000001', 'email', 'test@doceo.local'),
  'email',
  now(),
  now(),
  now()
) on conflict (id) do nothing;
