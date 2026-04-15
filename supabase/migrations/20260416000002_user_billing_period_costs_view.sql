create or replace view user_billing_period_costs as
select
  profile_id as user_id,
  to_char(created_at, 'YYYY-MM') as billing_period,
  sum(cost_usd) as total_cost_usd,
  sum(input_tokens) as total_input_tokens,
  sum(output_tokens) as total_output_tokens,
  count(*) as interaction_count
from ai_interactions
where cost_usd is not null
group by profile_id, to_char(created_at, 'YYYY-MM');
