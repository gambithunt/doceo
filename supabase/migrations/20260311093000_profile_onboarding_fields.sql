alter table profiles
  add column if not exists email text default '',
  add column if not exists school_year text default '',
  add column if not exists term text default 'Term 1',
  add column if not exists grade_id text default '',
  add column if not exists country_id text default '',
  add column if not exists curriculum_id text default '',
  add column if not exists recommended_start_subject_id text,
  add column if not exists recommended_start_subject_name text;
