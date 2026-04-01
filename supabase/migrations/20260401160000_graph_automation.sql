alter table if exists curriculum_graph_events
  drop constraint if exists curriculum_graph_events_event_type_check;

alter table if exists curriculum_graph_events
  add constraint curriculum_graph_events_event_type_check
  check (event_type in (
    'node_created',
    'alias_added',
    'node_reused',
    'trust_increased',
    'trust_decreased',
    'node_promoted',
    'node_flagged_for_review',
    'node_demoted',
    'node_merged',
    'node_archived',
    'node_rejected',
    'duplicate_candidate_created',
    'admin_edit_applied'
  ));

create table if not exists curriculum_graph_evidence (
  node_id text primary key references curriculum_graph_nodes(id) on delete cascade,
  successful_resolution_count integer not null default 0,
  repeat_use_count integer not null default 0,
  artifact_rating_total numeric(8,3) not null default 0,
  artifact_rating_count integer not null default 0,
  average_artifact_rating numeric(4,3),
  completion_count integer not null default 0,
  completion_sample_count integer not null default 0,
  completion_rate numeric(4,3),
  contradiction_count integer not null default 0,
  contradiction_rate numeric(4,3) not null default 0,
  duplicate_pressure numeric(4,3) not null default 0,
  admin_intervention_count integer not null default 0,
  last_evaluated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists curriculum_graph_evidence_duplicate_pressure_idx
  on curriculum_graph_evidence (duplicate_pressure desc, contradiction_rate desc);

create table if not exists curriculum_graph_duplicate_candidates (
  id text primary key,
  left_node_id text not null references curriculum_graph_nodes(id) on delete cascade,
  right_node_id text not null references curriculum_graph_nodes(id) on delete cascade,
  reason text not null check (reason in ('exact_normalized', 'alias_overlap', 'near_duplicate')),
  confidence numeric(4,3) not null check (confidence >= 0 and confidence <= 1),
  status text not null default 'open' check (status in ('open', 'confirmed', 'dismissed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (left_node_id, right_node_id, reason)
);

create index if not exists curriculum_graph_duplicate_candidates_left_idx
  on curriculum_graph_duplicate_candidates (left_node_id, status, confidence desc);

create index if not exists curriculum_graph_duplicate_candidates_right_idx
  on curriculum_graph_duplicate_candidates (right_node_id, status, confidence desc);
