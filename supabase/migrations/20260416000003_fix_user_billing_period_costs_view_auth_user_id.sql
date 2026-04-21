drop view if exists user_billing_period_costs;

create or replace view user_billing_period_costs as
select
  profiles.auth_user_id as user_id,
  to_char(ai_interactions.created_at, 'YYYY-MM') as billing_period,
  sum(ai_interactions.cost_usd) as total_cost_usd,
  sum(ai_interactions.input_tokens) as total_input_tokens,
  sum(ai_interactions.output_tokens) as total_output_tokens,
  count(*) as interaction_count
from ai_interactions
join profiles on profiles.id = ai_interactions.profile_id
where ai_interactions.cost_usd is not null
  and profiles.auth_user_id is not null
group by profiles.auth_user_id, to_char(ai_interactions.created_at, 'YYYY-MM');
