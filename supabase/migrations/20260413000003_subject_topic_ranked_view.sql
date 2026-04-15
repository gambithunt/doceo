-- Migration D: Create subject_topic_ranked view
-- Left-joins subject_topics catalog to topic_discovery_scores
-- Exposes a rank_score expression for ordering

create or replace view subject_topic_ranked as
select
  t.*,
  coalesce(s.impression_count, 0) as impression_count,
  coalesce(s.click_count, 0) as click_count,
  coalesce(s.thumbs_up_count, 0) as thumbs_up_count,
  coalesce(s.thumbs_down_count, 0) as thumbs_down_count,
  s.completion_rate,
  (
    (coalesce(s.thumbs_up_count, 0) - coalesce(s.thumbs_down_count, 0)) * 2
    + coalesce(s.click_count, 0) * 1.5
    + coalesce(s.completion_rate, 0) * 10
    + t.admin_weight
  ) as rank_score
from subject_topics t
left join topic_discovery_scores s on s.topic_signature = t.topic_signature;