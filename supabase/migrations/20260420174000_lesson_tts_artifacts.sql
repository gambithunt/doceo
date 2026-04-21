create table if not exists lesson_tts_artifacts (
  id text primary key,
  cache_key text not null unique,
  cache_version text not null,
  lesson_session_id text,
  lesson_message_id text,
  profile_id text references profiles(id) on delete set null,
  provider text not null check (provider in ('openai', 'elevenlabs')),
  fallback_from_provider text check (fallback_from_provider in ('openai', 'elevenlabs')),
  model text not null,
  voice text not null,
  language_code text not null check (language_code in ('en')),
  format text not null check (format in ('mp3', 'wav')),
  speed double precision,
  style_instruction text,
  provider_settings jsonb not null default '{}'::jsonb,
  text_hash text not null,
  storage_bucket text not null default 'lesson-tts-audio',
  storage_path text not null unique,
  byte_length integer,
  duration_ms integer,
  status text not null check (status in ('ready', 'failed')),
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lesson_tts_artifacts_provider_created_idx
  on lesson_tts_artifacts (provider, created_at desc);

create index if not exists lesson_tts_artifacts_text_hash_idx
  on lesson_tts_artifacts (text_hash);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lesson-tts-audio',
  'lesson-tts-audio',
  false,
  10485760,
  array['audio/mpeg', 'audio/wav']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
