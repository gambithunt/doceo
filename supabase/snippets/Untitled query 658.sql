insert into profiles (id, auth_user_id, full_name, email, role, grade, country, curriculum)
  select
    u.id::text,
    u.id,
    coalesce(u.raw_user_meta_data->>'full_name', ''),
    coalesce(u.email, ''),
    'student',
    '',
    '',
    ''
  from auth.users u
  where not exists (
    select 1 from profiles p where p.id = u.id::text
  );