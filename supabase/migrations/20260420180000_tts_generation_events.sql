create table if not exists tts_generation_events (
  id uuid primary key default gen_random_uuid(),
  request_id text not null,
  profile_id text references profiles(id) on delete set null,
  lesson_session_id text,
  lesson_message_id text,
  cache_hit boolean not null default false,
  provider_used text check (provider_used in ('openai', 'elevenlabs')),
  fallback_from_provider text check (fallback_from_provider in ('openai', 'elevenlabs')),
  fallback_to_provider text check (fallback_to_provider in ('openai', 'elevenlabs')),
  status text not null check (status in ('success', 'failure', 'denied')),
  reason_category text,
  text_length integer not null default 0,
  estimated_cost_usd numeric(10, 6),
  created_at timestamptz not null default now()
);

create index if not exists tts_generation_events_created_idx
  on tts_generation_events (created_at desc);

create index if not exists tts_generation_events_request_idx
  on tts_generation_events (request_id);

create index if not exists tts_generation_events_fallback_idx
  on tts_generation_events (fallback_from_provider, fallback_to_provider, created_at desc);
