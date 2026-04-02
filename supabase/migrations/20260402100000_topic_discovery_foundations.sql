create table if not exists topic_discovery_events (
  id text primary key,
  profile_id text references profiles(id) on delete set null,
  subject_id text not null references curriculum_graph_nodes(id) on delete cascade,
  curriculum_id text not null references curriculums(id) on delete cascade,
  grade_id text not null references curriculum_grades(id) on delete cascade,
  node_id text references curriculum_graph_nodes(id) on delete set null,
  topic_signature text not null,
  topic_label text not null,
  source text not null check (source in ('graph_existing', 'model_candidate')),
  event_type text not null check (event_type in (
    'suggestion_impression',
    'suggestion_clicked',
    'suggestion_refreshed',
    'thumbs_up',
    'thumbs_down',
    'lesson_started',
    'lesson_completed',
    'lesson_abandoned'
  )),
  event_value numeric not null default 1,
  session_id text,
  lesson_session_id text references lesson_sessions(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists topic_discovery_events_scope_recent_idx
  on topic_discovery_events (subject_id, curriculum_id, grade_id, created_at desc);

create index if not exists topic_discovery_events_signature_recent_idx
  on topic_discovery_events (subject_id, curriculum_id, grade_id, topic_signature, created_at desc);

create index if not exists topic_discovery_events_scope_event_recent_idx
  on topic_discovery_events (subject_id, curriculum_id, grade_id, event_type, created_at desc);

create index if not exists topic_discovery_events_node_recent_idx
  on topic_discovery_events (node_id, created_at desc)
  where node_id is not null;

create index if not exists topic_discovery_events_profile_scope_idx
  on topic_discovery_events (profile_id, subject_id, curriculum_id, grade_id, created_at desc)
  where profile_id is not null;

drop view if exists topic_discovery_scores;

create view topic_discovery_scores as
with grouped as (
  select
    subject_id,
    curriculum_id,
    grade_id,
    topic_signature,
    (array_remove(array_agg(node_id order by created_at desc), null))[1] as node_id,
    (array_agg(topic_label order by created_at desc))[1] as topic_label,
    case
      when count(*) filter (where source = 'graph_existing') > 0 or count(node_id) > 0 then 'graph_existing'
      else 'model_candidate'
    end as source,
    count(*) filter (where event_type = 'suggestion_impression')::integer as impression_count,
    count(*) filter (where event_type = 'suggestion_refreshed')::integer as refresh_count,
    count(*) filter (where event_type = 'suggestion_clicked')::integer as click_count,
    count(distinct coalesce(profile_id, session_id, lesson_session_id, id))
      filter (where event_type = 'suggestion_clicked')::integer as unique_click_count,
    count(*) filter (where event_type = 'thumbs_up')::integer as thumbs_up_count,
    count(*) filter (where event_type = 'thumbs_down')::integer as thumbs_down_count,
    count(*) filter (where event_type = 'lesson_started')::integer as lesson_start_count,
    count(*) filter (where event_type = 'lesson_completed')::integer as lesson_complete_count,
    count(*) filter (where event_type = 'lesson_abandoned')::integer as lesson_abandoned_count,
    count(*) filter (
      where event_type = 'suggestion_clicked'
        and created_at >= now() - interval '30 days'
    )::integer as recent_click_count,
    count(*) filter (
      where event_type = 'thumbs_up'
        and created_at >= now() - interval '30 days'
    )::integer as recent_thumbs_up_count,
    count(*) filter (
      where event_type = 'thumbs_down'
        and created_at >= now() - interval '30 days'
    )::integer as recent_thumbs_down_count,
    count(*) filter (
      where event_type = 'lesson_started'
        and created_at >= now() - interval '30 days'
    )::integer as recent_lesson_start_count,
    count(*) filter (
      where event_type = 'lesson_completed'
        and created_at >= now() - interval '30 days'
    )::integer as recent_lesson_complete_count,
    count(*) filter (
      where event_type = 'lesson_abandoned'
        and created_at >= now() - interval '30 days'
    )::integer as recent_lesson_abandoned_count,
    count(distinct coalesce(profile_id, session_id, lesson_session_id, id))::integer as sample_size,
    max(created_at) as last_seen_at,
    max(created_at) filter (
      where event_type in ('suggestion_clicked', 'lesson_started', 'lesson_completed')
    ) as last_selected_at
  from topic_discovery_events
  group by subject_id, curriculum_id, grade_id, topic_signature
)
select
  subject_id,
  curriculum_id,
  grade_id,
  node_id,
  topic_signature,
  topic_label,
  source,
  impression_count,
  refresh_count,
  click_count,
  unique_click_count,
  thumbs_up_count,
  thumbs_down_count,
  lesson_start_count,
  lesson_complete_count,
  lesson_abandoned_count,
  recent_click_count,
  recent_thumbs_up_count,
  recent_thumbs_down_count,
  recent_lesson_start_count,
  recent_lesson_complete_count,
  recent_lesson_abandoned_count,
  sample_size,
  case
    when lesson_start_count > 0 then round(lesson_complete_count::numeric / lesson_start_count::numeric, 4)
    else null
  end as completion_rate,
  last_seen_at,
  last_selected_at
from grouped;
