-- Migration B: Relax topic_discovery_events to accept unstructured (university) learners
-- Add nullable subject_key column and make FK columns nullable
-- Add CHECK constraint to ensure either graph FKs OR subject_key is provided

-- Add nullable subject_key column
alter table topic_discovery_events
add column if not exists subject_key text;

-- Make existing FK columns nullable (they were previously not null)
alter table topic_discovery_events
alter column subject_id drop not null;

alter table topic_discovery_events
alter column curriculum_id drop not null;

alter table topic_discovery_events
alter column grade_id drop not null;

-- Add CHECK constraint: either graph FKs are all present OR subject_key is present
alter table topic_discovery_events
add constraint topic_discovery_events_subject_check
check (
  (subject_id is not null and curriculum_id is not null and grade_id is not null)
  or subject_key is not null
);

-- Add index for efficient querying by subject_key
create index if not exists topic_discovery_events_subject_key_idx
  on topic_discovery_events (subject_key, topic_signature, created_at desc);

-- Add index for subject_key alone (for rolling up scores)
create index if not exists topic_discovery_events_subject_key_recent_idx
  on topic_discovery_events (subject_key, created_at desc)
  where subject_key is not null;