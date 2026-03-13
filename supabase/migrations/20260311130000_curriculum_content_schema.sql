create table if not exists curriculum_topics (
  id text primary key,
  subject_id text not null references curriculum_subjects(id) on delete cascade,
  name text not null,
  topic_order integer not null default 1
);

create table if not exists curriculum_subtopics (
  id text primary key,
  topic_id text not null references curriculum_topics(id) on delete cascade,
  name text not null,
  subtopic_order integer not null default 1
);

create table if not exists curriculum_lessons (
  id text primary key,
  subject_id text not null references curriculum_subjects(id) on delete cascade,
  topic_id text not null references curriculum_topics(id) on delete cascade,
  subtopic_id text not null references curriculum_subtopics(id) on delete cascade,
  title text not null,
  grade_label text not null,
  overview_title text not null,
  overview_body text not null,
  deeper_explanation_title text not null,
  deeper_explanation_body text not null,
  example_title text not null,
  example_body text not null,
  lesson_order integer not null default 1
);

create table if not exists curriculum_questions (
  id text primary key,
  lesson_id text not null references curriculum_lessons(id) on delete cascade,
  topic_id text not null references curriculum_topics(id) on delete cascade,
  subtopic_id text not null references curriculum_subtopics(id) on delete cascade,
  question_type text not null,
  prompt text not null,
  expected_answer text not null,
  accepted_answers text[] not null default '{}',
  rubric text not null,
  explanation text not null,
  hint_levels text[] not null default '{}',
  misconception_tags text[] not null default '{}',
  difficulty text not null,
  option_json jsonb,
  question_order integer not null default 1
);

create temporary table subject_family_seed on commit drop as
select
  subject.id as subject_id,
  subject.name as subject_name,
  grade.label as grade_label,
  case
    when subject.name in ('Mathematics', 'Mathematical Literacy') then 'math'
    when subject.name like '%Language%' then 'language'
    when subject.name in ('Natural Sciences and Technology', 'Natural Sciences', 'Physical Sciences', 'Life Sciences') then 'science'
    when subject.name in ('Social Sciences', 'Geography', 'History', 'Life Orientation') then 'humanities'
    when subject.name in ('Economic and Management Sciences', 'Accounting', 'Business Studies', 'Economics') then 'commerce'
    when subject.name in ('Technology', 'Computer Applications Technology', 'Information Technology') then 'technology'
    when subject.name in ('Creative Arts', 'Visual Arts') then 'arts'
    else 'general'
  end as family
from curriculum_subjects subject
join curriculum_grades grade on grade.id = subject.grade_id;

create temporary table topic_seed_data on commit drop as
select
  subject_id,
  format('%s-topic-1', subject_id) as topic_id,
  case family
    when 'math' then 'Core problem solving'
    when 'language' then 'Reading and writing foundations'
    when 'science' then 'Investigation and scientific thinking'
    when 'humanities' then 'Evidence and explanation'
    when 'commerce' then 'Choices, money, and planning'
    when 'technology' then 'Systems and problem solving'
    when 'arts' then 'Creative choices and response'
    else 'Foundations'
  end as topic_name
from subject_family_seed;

create temporary table subtopic_seed_data on commit drop as
select
  family.subject_id,
  topic.topic_id,
  format('%s-subtopic-1', topic.topic_id) as subtopic_id,
  case family.family
    when 'math' then 'Applying a clear method'
    when 'language' then 'Understanding and expressing ideas'
    when 'science' then 'Using fair tests and clear observations'
    when 'humanities' then 'Using sources and cause-effect reasoning'
    when 'commerce' then 'Making sensible decisions with limited resources'
    when 'technology' then 'Inputs, outputs, and ordered steps'
    when 'arts' then 'Using elements to create meaning'
    else 'Naming, explaining, and applying concepts'
  end as subtopic_name
from subject_family_seed family
join topic_seed_data topic using (subject_id);

create temporary table lesson_seed_data on commit drop as
select
  family.subject_id,
  topic.topic_id,
  subtopic.subtopic_id,
  format('%s-lesson-1', family.subject_id) as lesson_id,
  case family.family
    when 'math' then format('%s: Core problem solving', family.subject_name)
    when 'language' then format('%s: Main idea and clear sentences', family.subject_name)
    when 'science' then format('%s: Investigations and matter', family.subject_name)
    when 'humanities' then format('%s: Evidence, maps, and cause-effect', family.subject_name)
    when 'commerce' then format('%s: Needs, wants, and budgeting', family.subject_name)
    when 'technology' then format('%s: Systems and algorithms', family.subject_name)
    when 'arts' then format('%s: Elements of design and response', family.subject_name)
    else format('%s: Core ideas and application', family.subject_name)
  end as title,
  family.grade_label,
  'Overview' as overview_title,
  case family.family
    when 'math' then 'Start by identifying the rule, method, or quantity that stays consistent. Good mathematical progress comes from one justified step at a time.'
    when 'language' then 'Strong language work begins with understanding the main idea and then expressing a complete thought clearly.'
    when 'science' then 'Scientific learning starts with careful observation, fair testing, and using evidence to explain what happened.'
    when 'humanities' then 'These subjects rely on trustworthy sources, clear reasoning, and explaining why events or patterns matter.'
    when 'commerce' then 'Commerce-related subjects focus on choices, priorities, and the relationship between resources, plans, and outcomes.'
    when 'technology' then 'Technology learning starts by understanding a system, the order of steps, and how information moves through the process.'
    when 'arts' then 'Creative subjects begin with the elements that shape meaning, mood, and emphasis in an artwork or design.'
    else 'Every subject starts with naming the idea clearly, explaining it, and then applying it to a simple example.'
  end as overview_body,
  'Deeper Explanation' as deeper_explanation_title,
  case family.family
    when 'math' then 'Learners make stronger progress when they can explain why a method works rather than only stating the final answer.'
    when 'language' then 'Reading and writing improve when learners connect details to the central message and use complete, well-formed sentences.'
    when 'science' then 'A fair test changes one variable at a time, while observations and conclusions need to stay linked to the evidence.'
    when 'humanities' then 'A strong response uses evidence from a source and connects it to a clear explanation of cause, effect, place, or significance.'
    when 'commerce' then 'Decision-making improves when learners separate needs from wants and compare income, costs, and trade-offs.'
    when 'technology' then 'Ordered instructions matter because many systems only work when each step depends correctly on the one before it.'
    when 'arts' then 'Visual and creative choices influence how an audience feels and what they notice first, so learners should describe the choice and its effect.'
    else 'Mastery grows when a learner can state the concept, justify a step, and adapt it in a slightly different context.'
  end as deeper_body,
  'Worked Example' as example_title,
  case family.family
    when 'math' then 'If a sequence grows by 4 each time, keep the same rule for the next term. If an equation says x + 6 = 14, subtract 6 from both sides to keep it balanced.'
    when 'language' then 'If a paragraph gives several examples about saving water, the main idea is saving water. A complete sentence like "The learner writes neatly." includes both subject and verb.'
    when 'science' then 'If you test plant growth using different amounts of light, the light is the independent variable. Ice melting into water is a change of state from solid to liquid.'
    when 'humanities' then 'A map helps locate places. In "Heavy rain caused flooding", the rain is the cause and the flooding is the effect.'
    when 'commerce' then 'Food is a need, while a game is usually a want. If income is 120 and expenses are 75, then 45 remains.'
    when 'technology' then 'A keyboard is an input device, the computer processes the information, and the screen shows the output. An algorithm is a clear sequence of steps.'
    when 'arts' then 'Bright colours can create energy, while strong lines can create movement. A good response explains both what you see and the effect it creates.'
    else 'A strong worked example names the concept, applies one clear step, and then explains why that step makes sense.'
  end as example_body
from subject_family_seed family
join topic_seed_data topic using (subject_id)
join subtopic_seed_data subtopic using (subject_id, topic_id);

insert into curriculum_topics (id, subject_id, name, topic_order)
select topic_id, subject_id, topic_name, 1
from topic_seed_data
on conflict (id) do update set
  subject_id = excluded.subject_id,
  name = excluded.name,
  topic_order = excluded.topic_order;

insert into curriculum_subtopics (id, topic_id, name, subtopic_order)
select subtopic_id, topic_id, subtopic_name, 1
from subtopic_seed_data
on conflict (id) do update set
  topic_id = excluded.topic_id,
  name = excluded.name,
  subtopic_order = excluded.subtopic_order;

insert into curriculum_lessons (
  id,
  subject_id,
  topic_id,
  subtopic_id,
  title,
  grade_label,
  overview_title,
  overview_body,
  deeper_explanation_title,
  deeper_explanation_body,
  example_title,
  example_body,
  lesson_order
)
select
  lesson_id,
  subject_id,
  topic_id,
  subtopic_id,
  title,
  grade_label,
  overview_title,
  overview_body,
  deeper_explanation_title,
  deeper_body,
  example_title,
  example_body,
  1
from lesson_seed_data
on conflict (id) do update set
  subject_id = excluded.subject_id,
  topic_id = excluded.topic_id,
  subtopic_id = excluded.subtopic_id,
  title = excluded.title,
  grade_label = excluded.grade_label,
  overview_title = excluded.overview_title,
  overview_body = excluded.overview_body,
  deeper_explanation_title = excluded.deeper_explanation_title,
  deeper_explanation_body = excluded.deeper_explanation_body,
  example_title = excluded.example_title,
  example_body = excluded.example_body,
  lesson_order = excluded.lesson_order;

create temporary table question_seed_data on commit drop as
select
  family.family,
  format('%s-lesson-1-q-1', family.subject_id) as question_id,
  format('%s-lesson-1', family.subject_id) as lesson_id,
  format('%s-topic-1', family.subject_id) as topic_id,
  format('%s-topic-1-subtopic-1', family.subject_id) as subtopic_id,
  case family.family
    when 'math' then 'What is the next number in 5, 10, 15, 20?'
    when 'language' then 'Which option best describes the main idea of a paragraph?'
    when 'science' then 'In an experiment, what is the variable you change called?'
    when 'humanities' then 'What do we call information used to support a claim?'
    when 'commerce' then 'Which of these is usually a need?'
    when 'technology' then 'Is a keyboard an input or an output device?'
    when 'arts' then 'Name one element of design.'
    else format('What is the first step when learning a new idea in %s?', family.subject_name)
  end as prompt_1,
  case family.family
    when 'math' then '25'
    when 'language' then 'the central message'
    when 'science' then 'independent variable'
    when 'humanities' then 'evidence'
    when 'commerce' then 'food'
    when 'technology' then 'input'
    when 'arts' then 'colour'
    else 'identify the idea'
  end as answer_1,
  case family.family
    when 'math' then array[]::text[]
    when 'language' then array[]::text[]
    when 'science' then array[]::text[]
    when 'humanities' then array['supporting evidence']::text[]
    when 'commerce' then array[]::text[]
    when 'technology' then array[]::text[]
    when 'arts' then array['line', 'shape', 'texture', 'space']::text[]
    else array['identify the concept', 'name the idea']::text[]
  end as accepted_1,
  case family.family
    when 'math' then 'The pattern increases by 5 each time.'
    when 'language' then 'The main idea is the central message, not a single detail.'
    when 'science' then 'The independent variable is the one the investigator changes.'
    when 'humanities' then 'Evidence supports a claim or conclusion.'
    when 'commerce' then 'Food is essential for living.'
    when 'technology' then 'The keyboard sends information into the computer.'
    when 'arts' then 'Colour is one valid element of design.'
    else 'A learner should start by identifying the concept clearly.'
  end as explanation_1,
  case family.family
    when 'math' then array['Look at the difference between each pair.', 'Add 5 to 20.']::text[]
    when 'language' then array['Think about what the whole paragraph is mostly about.', 'Ignore one small example.']::text[]
    when 'science' then array['It is not the measured result.', 'It is the independent variable.']::text[]
    when 'humanities' then array['It helps prove a point.', 'The word is evidence.']::text[]
    when 'commerce' then array['Choose the essential item.', 'The answer is food.']::text[]
    when 'technology' then array['Does it send data in or out?', 'The answer is input.']::text[]
    when 'arts' then array['Think of line, shape, colour, texture, or space.', 'A simple correct answer is colour.']::text[]
    else array['Before applying, name it.', 'Identify the idea first.']::text[]
  end as hints_1,
  case family.family
    when 'language' then jsonb_build_array(
      jsonb_build_object('id', 'a', 'label', 'A', 'text', 'the central message'),
      jsonb_build_object('id', 'b', 'label', 'B', 'text', 'one supporting detail'),
      jsonb_build_object('id', 'c', 'label', 'C', 'text', 'the title only')
    )
    when 'commerce' then jsonb_build_array(
      jsonb_build_object('id', 'a', 'label', 'A', 'text', 'food'),
      jsonb_build_object('id', 'b', 'label', 'B', 'text', 'designer shoes'),
      jsonb_build_object('id', 'c', 'label', 'C', 'text', 'a video game')
    )
    else null
  end as options_1,
  case family.family
    when 'language' then 'multiple-choice'
    when 'commerce' then 'multiple-choice'
    else 'short-answer'
  end as type_1,
  format('%s-lesson-1-q-2', family.subject_id) as question_id_2,
  case family.family
    when 'math' then 'State the rule for 3, 6, 9, 12.'
    when 'language' then 'What two parts does every complete sentence need?'
    when 'science' then 'Name the three common states of matter.'
    when 'humanities' then 'In the statement "Heavy rain caused flooding", what is the effect?'
    when 'commerce' then 'What is money coming in called?'
    when 'technology' then 'What do we call a set of ordered steps for solving a problem?'
    when 'arts' then 'What should you do after describing what you see in artwork?'
    else format('After naming the idea in %s, what should you do next?', family.subject_name)
  end as prompt_2,
  case family.family
    when 'math' then 'add 3'
    when 'language' then 'subject and verb'
    when 'science' then 'solid liquid gas'
    when 'humanities' then 'flooding'
    when 'commerce' then 'income'
    when 'technology' then 'algorithm'
    when 'arts' then 'explain the effect'
    else 'explain it'
  end as answer_2,
  case family.family
    when 'math' then array['add three', '+3', 'increases by 3']::text[]
    when 'language' then array['a subject and a verb', 'subject verb']::text[]
    when 'science' then array['solid, liquid, gas', 'solid, liquid and gas', 'solid liquid and gas']::text[]
    when 'humanities' then array[]::text[]
    when 'commerce' then array[]::text[]
    when 'technology' then array[]::text[]
    when 'arts' then array['describe the effect', 'explain its effect', 'explain the meaning']::text[]
    else array['explain the idea', 'describe it']::text[]
  end as accepted_2,
  case family.family
    when 'math' then 'Each term is 3 more than the previous one.'
    when 'language' then 'A subject tells who or what, and a verb tells the action or state.'
    when 'science' then 'The three common states are solid, liquid, and gas.'
    when 'humanities' then 'Flooding happened because of the heavy rain.'
    when 'commerce' then 'Income is the money received.'
    when 'technology' then 'An algorithm is an ordered procedure.'
    when 'arts' then 'A strong response explains the effect or meaning of the choices.'
    else 'Explaining the idea builds understanding before harder work.'
  end as explanation_2,
  case family.family
    when 'math' then array['Compare one term to the next.', 'What is 6 minus 3?']::text[]
    when 'language' then array['Think “who” and “doing what”.', 'The two parts are subject and verb.']::text[]
    when 'science' then array['Think of ice, water, and steam.', 'solid, liquid, gas']::text[]
    when 'humanities' then array['The effect is what happened.', 'The answer is flooding.']::text[]
    when 'commerce' then array['It is the opposite of expenses.', 'The answer is income.']::text[]
    when 'technology' then array['It starts with “a”.', 'The answer is algorithm.']::text[]
    when 'arts' then array['Move from description to interpretation.', 'Explain the effect.']::text[]
    else array['Do not jump straight to advanced work.', 'Explain it next.']::text[]
  end as hints_2
from subject_family_seed family;
insert into curriculum_questions (
  id,
  lesson_id,
  topic_id,
  subtopic_id,
  question_type,
  prompt,
  expected_answer,
  accepted_answers,
  rubric,
  explanation,
  hint_levels,
  misconception_tags,
  difficulty,
  option_json,
  question_order
)
select
  question_id,
  lesson_id,
  topic_id,
  subtopic_id,
  type_1,
  prompt_1,
  answer_1,
  accepted_1,
  explanation_1,
  explanation_1,
  hints_1,
  array[lower(replace(family, ' ', '-'))],
  'foundation',
  options_1,
  1
from question_seed_data
on conflict (id) do update set
  lesson_id = excluded.lesson_id,
  topic_id = excluded.topic_id,
  subtopic_id = excluded.subtopic_id,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  expected_answer = excluded.expected_answer,
  accepted_answers = excluded.accepted_answers,
  rubric = excluded.rubric,
  explanation = excluded.explanation,
  hint_levels = excluded.hint_levels,
  misconception_tags = excluded.misconception_tags,
  difficulty = excluded.difficulty,
  option_json = excluded.option_json,
  question_order = excluded.question_order;

insert into curriculum_questions (
  id,
  lesson_id,
  topic_id,
  subtopic_id,
  question_type,
  prompt,
  expected_answer,
  accepted_answers,
  rubric,
  explanation,
  hint_levels,
  misconception_tags,
  difficulty,
  option_json,
  question_order
)
select
  question_id_2,
  lesson_id,
  topic_id,
  subtopic_id,
  'short-answer',
  prompt_2,
  answer_2,
  accepted_2,
  explanation_2,
  explanation_2,
  hints_2,
  array[lower(replace(family, ' ', '-'))],
  'core',
  null,
  2
from question_seed_data
on conflict (id) do update set
  lesson_id = excluded.lesson_id,
  topic_id = excluded.topic_id,
  subtopic_id = excluded.subtopic_id,
  question_type = excluded.question_type,
  prompt = excluded.prompt,
  expected_answer = excluded.expected_answer,
  accepted_answers = excluded.accepted_answers,
  rubric = excluded.rubric,
  explanation = excluded.explanation,
  hint_levels = excluded.hint_levels,
  misconception_tags = excluded.misconception_tags,
  difficulty = excluded.difficulty,
  option_json = excluded.option_json,
  question_order = excluded.question_order;
