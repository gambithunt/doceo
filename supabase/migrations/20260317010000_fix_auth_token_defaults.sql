-- GoTrue (CLI v2.75) scans several auth.users varchar columns as non-nullable
-- Go strings. NULL values cause a 500 on sign-in ("converting NULL to string
-- is unsupported"). Backfill all affected columns.
-- Full fix requires the db:reset npm script which also patches via
-- supabase_auth_admin (postgres user cannot ALTER auth.users).

update auth.users
set
  confirmation_token     = coalesce(confirmation_token, ''),
  recovery_token         = coalesce(recovery_token, ''),
  email_change_token_new = coalesce(email_change_token_new, ''),
  email_change           = coalesce(email_change, '')
where
  confirmation_token     is null
  or recovery_token      is null
  or email_change_token_new is null
  or email_change        is null;
