INSERT INTO profiles (id, email, role)
  SELECT id, email, 'admin'
  FROM auth.users
  WHERE email = 'delonmisic@gmail.com'
  ON CONFLICT (id) DO UPDATE SET role = 'admin';