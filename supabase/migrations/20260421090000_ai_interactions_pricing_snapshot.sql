ALTER TABLE ai_interactions
  ADD COLUMN IF NOT EXISTS input_cost_usd numeric(12, 8),
  ADD COLUMN IF NOT EXISTS output_cost_usd numeric(12, 8),
  ADD COLUMN IF NOT EXISTS pricing_input_per_1m_usd numeric(12, 6),
  ADD COLUMN IF NOT EXISTS pricing_output_per_1m_usd numeric(12, 6),
  ADD COLUMN IF NOT EXISTS pricing_source text;
