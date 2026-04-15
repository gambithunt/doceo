-- Phase 8: Candidate topic promotion job
-- Function reads from subject_topic_ranked view and promotes candidates to active
-- when usage thresholds are met: impression_count >= 20 AND net feedback >= 0

create or replace function promote_candidate_subject_topics()
returns void
language plpgsql
security definer
as $$
begin
  update subject_topics as t
  set
    status = 'active',
    updated_at = now()
  from subject_topic_ranked as r
  where
    t.id = r.id
    and t.status = 'candidate'
    and r.impression_count >= 20
    and (r.thumbs_up_count - r.thumbs_down_count) >= 0;
end;
$$;

-- Schedule the promotion job every 15 minutes via pg_cron when the extension
-- is available. Local dev stacks without pg_cron skip this block; the function
-- above can still be invoked manually or via /api/admin/promote-topics.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'promote-candidate-topics-every-15-min',
      '*/15 * * * *',
      'select promote_candidate_subject_topics()'
    );
  end if;
end
$$;