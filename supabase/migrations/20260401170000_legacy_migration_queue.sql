alter table lesson_sessions
  add column if not exists migration_status text not null default 'not_started'
    check (migration_status in ('not_started', 'mapped', 'unresolved'));

alter table revision_topics
  add column if not exists migration_status text not null default 'not_started'
    check (migration_status in ('not_started', 'mapped', 'unresolved'));

create table if not exists legacy_migration_queue (
  id text primary key,
  record_type text not null
    check (record_type in ('lesson_session', 'revision_topic', 'revision_plan_topic')),
  source_id text not null,
  profile_id text not null references profiles(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'resolved')),
  reason text not null
    check (reason in ('ambiguous', 'not_found')),
  subject_id text,
  subject_label text,
  topic_label text not null,
  candidate_node_ids jsonb not null default '[]'::jsonb,
  resolved_node_id text,
  resolution_method text
    check (resolution_method in ('auto_mapped', 'manual')),
  original_payload jsonb not null default '{}'::jsonb,
  resolved_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create unique index if not exists legacy_migration_queue_source_idx
  on legacy_migration_queue(record_type, source_id);

create index if not exists legacy_migration_queue_status_idx
  on legacy_migration_queue(status, record_type, updated_at desc);

create table if not exists legacy_migration_events (
  id text primary key,
  queue_id text not null references legacy_migration_queue(id) on delete cascade,
  record_type text not null
    check (record_type in ('lesson_session', 'revision_topic', 'revision_plan_topic')),
  source_id text not null,
  actor_type text not null
    check (actor_type in ('system', 'admin', 'migration')),
  actor_id text,
  event_type text not null
    check (event_type in ('queued', 'auto_mapped', 'compatibility_artifact_created', 'manual_resolved')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists legacy_migration_events_queue_idx
  on legacy_migration_events(queue_id, created_at desc);
