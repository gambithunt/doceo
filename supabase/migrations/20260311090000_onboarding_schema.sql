create table if not exists countries (
  id text primary key,
  name text not null
);

create table if not exists curriculums (
  id text primary key,
  country_id text not null references countries(id) on delete cascade,
  name text not null,
  description text not null
);

create table if not exists curriculum_grades (
  id text primary key,
  curriculum_id text not null references curriculums(id) on delete cascade,
  label text not null,
  grade_order integer not null
);

create table if not exists curriculum_subjects (
  id text primary key,
  curriculum_id text not null references curriculums(id) on delete cascade,
  grade_id text not null references curriculum_grades(id) on delete cascade,
  name text not null,
  category text not null
);

create table if not exists student_onboarding (
  profile_id text primary key references profiles(id) on delete cascade,
  country_id text not null,
  curriculum_id text,
  grade_id text not null,
  school_year text not null,
  term text not null,
  selection_mode text not null,
  recommended_start_subject_id text,
  recommended_start_subject_name text,
  onboarding_completed boolean not null default false,
  onboarding_completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists student_selected_subjects (
  id text primary key,
  profile_id text not null references profiles(id) on delete cascade,
  subject_id text references curriculum_subjects(id) on delete cascade,
  subject_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists student_custom_subjects (
  id text primary key,
  profile_id text not null references profiles(id) on delete cascade,
  subject_name text not null,
  created_at timestamptz not null default now()
);

insert into countries (id, name)
values ('za', 'South Africa')
on conflict (id) do update set name = excluded.name;

insert into curriculums (id, country_id, name, description)
values
  ('caps', 'za', 'CAPS', 'Curriculum and Assessment Policy Statement'),
  ('ieb', 'za', 'IEB', 'Independent Examinations Board')
on conflict (id) do update set
  country_id = excluded.country_id,
  name = excluded.name,
  description = excluded.description;

insert into curriculum_grades (id, curriculum_id, label, grade_order)
values
  ('grade-6', 'caps', 'Grade 6', 6),
  ('grade-7', 'caps', 'Grade 7', 7),
  ('ieb-grade-7', 'ieb', 'Grade 7', 7)
on conflict (id) do update set
  curriculum_id = excluded.curriculum_id,
  label = excluded.label,
  grade_order = excluded.grade_order;

insert into curriculum_subjects (id, curriculum_id, grade_id, name, category)
values
  ('caps-grade-6-mathematics', 'caps', 'grade-6', 'Mathematics', 'core'),
  ('caps-grade-6-english-home-language', 'caps', 'grade-6', 'English Home Language', 'language'),
  ('caps-grade-6-afrikaans-first-additional-language', 'caps', 'grade-6', 'Afrikaans First Additional Language', 'language'),
  ('caps-grade-6-natural-sciences-and-technology', 'caps', 'grade-6', 'Natural Sciences and Technology', 'elective'),
  ('caps-grade-6-social-sciences', 'caps', 'grade-6', 'Social Sciences', 'elective'),
  ('caps-grade-6-life-skills', 'caps', 'grade-6', 'Life Skills', 'elective'),
  ('caps-grade-7-mathematics', 'caps', 'grade-7', 'Mathematics', 'core'),
  ('caps-grade-7-english-home-language', 'caps', 'grade-7', 'English Home Language', 'language'),
  ('caps-grade-7-afrikaans-first-additional-language', 'caps', 'grade-7', 'Afrikaans First Additional Language', 'language'),
  ('caps-grade-7-natural-sciences', 'caps', 'grade-7', 'Natural Sciences', 'elective'),
  ('caps-grade-7-social-sciences', 'caps', 'grade-7', 'Social Sciences', 'elective'),
  ('caps-grade-7-technology', 'caps', 'grade-7', 'Technology', 'elective'),
  ('caps-grade-7-economic-and-management-sciences', 'caps', 'grade-7', 'Economic and Management Sciences', 'elective'),
  ('caps-grade-7-life-orientation', 'caps', 'grade-7', 'Life Orientation', 'elective'),
  ('caps-grade-7-creative-arts', 'caps', 'grade-7', 'Creative Arts', 'elective'),
  ('ieb-grade-7-mathematics', 'ieb', 'ieb-grade-7', 'Mathematics', 'core'),
  ('ieb-grade-7-english-home-language', 'ieb', 'ieb-grade-7', 'English Home Language', 'language'),
  ('ieb-grade-7-afrikaans-additional-language', 'ieb', 'ieb-grade-7', 'Afrikaans Additional Language', 'language'),
  ('ieb-grade-7-natural-sciences', 'ieb', 'ieb-grade-7', 'Natural Sciences', 'elective'),
  ('ieb-grade-7-social-sciences', 'ieb', 'ieb-grade-7', 'Social Sciences', 'elective'),
  ('ieb-grade-7-technology', 'ieb', 'ieb-grade-7', 'Technology', 'elective'),
  ('ieb-grade-7-economic-and-management-sciences', 'ieb', 'ieb-grade-7', 'Economic and Management Sciences', 'elective'),
  ('ieb-grade-7-life-orientation', 'ieb', 'ieb-grade-7', 'Life Orientation', 'elective'),
  ('ieb-grade-7-creative-arts', 'ieb', 'ieb-grade-7', 'Creative Arts', 'elective')
on conflict (id) do update set
  curriculum_id = excluded.curriculum_id,
  grade_id = excluded.grade_id,
  name = excluded.name,
  category = excluded.category;
