-- Add real token and cost tracking to ai_interactions.
-- Previously, cost was estimated from interaction count in application code.
-- These columns let logAiInteraction store actual token counts and USD cost
-- from the GitHub Models API response, enabling accurate spend reporting.

ALTER TABLE ai_interactions
  ADD COLUMN IF NOT EXISTS mode        text,
  ADD COLUMN IF NOT EXISTS model_tier  text,
  ADD COLUMN IF NOT EXISTS model       text,
  ADD COLUMN IF NOT EXISTS tokens_used integer,
  ADD COLUMN IF NOT EXISTS cost_usd    numeric(12, 8),
  ADD COLUMN IF NOT EXISTS latency_ms  integer;
