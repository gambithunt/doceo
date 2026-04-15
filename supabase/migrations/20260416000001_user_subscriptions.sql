create table if not exists user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tier text not null check (tier in ('trial', 'basic', 'standard', 'premium'))
    default 'trial',
  status text not null check (status in ('active', 'cancelled', 'past_due', 'trial'))
    default 'trial',
  monthly_ai_budget_usd numeric(10, 4) not null default 0.20,
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_start date,
  current_period_end date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_subscriptions_user_id_key unique (user_id)
);

alter table user_subscriptions enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_subscriptions'
      and policyname = 'users read own subscription'
  ) then
    create policy "users read own subscription"
      on user_subscriptions for select
      using (auth.uid() = user_id);
  end if;
end
$$;
