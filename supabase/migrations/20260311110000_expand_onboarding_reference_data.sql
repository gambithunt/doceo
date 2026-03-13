with grade_rows as (
  select 'caps'::text as curriculum_id, grade_number, format('grade-%s', grade_number) as grade_id
  from generate_series(5, 12) as grade_number
  union all
  select 'ieb'::text as curriculum_id, grade_number, format('ieb-grade-%s', grade_number) as grade_id
  from generate_series(5, 12) as grade_number
)
insert into curriculum_grades (id, curriculum_id, label, grade_order)
select grade_id, curriculum_id, format('Grade %s', grade_number), grade_number
from grade_rows
on conflict (id) do update set
  curriculum_id = excluded.curriculum_id,
  label = excluded.label,
  grade_order = excluded.grade_order;

with subject_templates as (
  select 'caps'::text as curriculum_id, grade_number, unnest(array[
    'Mathematics',
    'English Home Language',
    'Afrikaans First Additional Language',
    'Natural Sciences and Technology',
    'Social Sciences',
    'Life Skills'
  ]::text[]) as subject_name
  from generate_series(5, 6) as grade_number
  union all
  select 'caps'::text as curriculum_id, grade_number, unnest(array[
    'Mathematics',
    'English Home Language',
    'Afrikaans First Additional Language',
    'Natural Sciences',
    'Social Sciences',
    'Technology',
    'Economic and Management Sciences',
    'Life Orientation',
    'Creative Arts'
  ]::text[]) as subject_name
  from generate_series(7, 9) as grade_number
  union all
  select 'caps'::text as curriculum_id, grade_number, unnest(array[
    'Mathematics',
    'Mathematical Literacy',
    'English Home Language',
    'Afrikaans First Additional Language',
    'Life Orientation',
    'Physical Sciences',
    'Life Sciences',
    'Geography',
    'History',
    'Accounting',
    'Business Studies',
    'Economics',
    'Computer Applications Technology',
    'Information Technology'
  ]::text[]) as subject_name
  from generate_series(10, 12) as grade_number
  union all
  select 'ieb'::text as curriculum_id, grade_number, unnest(array[
    'Mathematics',
    'English Home Language',
    'Afrikaans Additional Language',
    'Natural Sciences and Technology',
    'Social Sciences',
    'Life Skills'
  ]::text[]) as subject_name
  from generate_series(5, 6) as grade_number
  union all
  select 'ieb'::text as curriculum_id, grade_number, unnest(array[
    'Mathematics',
    'English Home Language',
    'Afrikaans Additional Language',
    'Natural Sciences',
    'Social Sciences',
    'Technology',
    'Economic and Management Sciences',
    'Life Orientation',
    'Creative Arts'
  ]::text[]) as subject_name
  from generate_series(7, 9) as grade_number
  union all
  select 'ieb'::text as curriculum_id, grade_number, unnest(array[
    'Mathematics',
    'Mathematical Literacy',
    'English Home Language',
    'Afrikaans Additional Language',
    'Life Orientation',
    'Physical Sciences',
    'Life Sciences',
    'Geography',
    'History',
    'Accounting',
    'Business Studies',
    'Economics',
    'Computer Applications Technology',
    'Information Technology',
    'Visual Arts'
  ]::text[]) as subject_name
  from generate_series(10, 12) as grade_number
)
insert into curriculum_subjects (id, curriculum_id, grade_id, name, category)
select
  format(
    '%s-%s-%s',
    curriculum_id,
    case
      when curriculum_id = 'caps' then format('grade-%s', grade_number)
      else format('ieb-grade-%s', grade_number)
    end,
    regexp_replace(lower(subject_name), '[^a-z0-9]+', '-', 'g')
  ) as id,
  curriculum_id,
  case
    when curriculum_id = 'caps' then format('grade-%s', grade_number)
    else format('ieb-grade-%s', grade_number)
  end as grade_id,
  subject_name,
  case
    when subject_name like '%Language%' then 'language'
    when subject_name in ('Mathematics', 'Mathematical Literacy') then 'core'
    else 'elective'
  end as category
from subject_templates
on conflict (id) do update set
  curriculum_id = excluded.curriculum_id,
  grade_id = excluded.grade_id,
  name = excluded.name,
  category = excluded.category;
