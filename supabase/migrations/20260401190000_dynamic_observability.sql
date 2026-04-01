create table if not exists dynamic_operation_events (
  id text primary key,
  route text not null,
  status text not null,
  source text not null,
  profile_id text null,
  node_id text null,
  artifact_id text null,
  secondary_artifact_id text null,
  prompt_version text null,
  pedagogy_version text null,
  provider text null,
  model text null,
  model_tier text null,
  latency_ms integer null,
  estimated_cost_usd numeric(12, 6) null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists dynamic_operation_events_route_created_idx
  on dynamic_operation_events (route, created_at desc);

create index if not exists dynamic_operation_events_status_created_idx
  on dynamic_operation_events (status, created_at desc);

create index if not exists dynamic_operation_events_node_created_idx
  on dynamic_operation_events (node_id, created_at desc);

create table if not exists dynamic_governance_actions (
  id text primary key,
  action_type text not null,
  actor_id text null,
  node_id text null,
  artifact_id text null,
  prompt_version text null,
  provider text null,
  model text null,
  reason text null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists dynamic_governance_actions_action_created_idx
  on dynamic_governance_actions (action_type, created_at desc);

create index if not exists dynamic_governance_actions_node_created_idx
  on dynamic_governance_actions (node_id, created_at desc);
