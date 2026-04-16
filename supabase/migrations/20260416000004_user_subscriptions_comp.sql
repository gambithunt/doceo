alter table user_subscriptions
  add column if not exists is_comped boolean not null default false,
  add column if not exists comp_expires_at date,
  add column if not exists comp_budget_usd numeric(10, 4);
