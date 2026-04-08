alter table student_onboarding
  add column if not exists education_type text not null default 'School',
  add column if not exists provider text not null default '',
  add column if not exists programme text not null default '',
  add column if not exists level text not null default '';
