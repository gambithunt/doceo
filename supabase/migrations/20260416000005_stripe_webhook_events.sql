create table if not exists stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  processing_status text not null default 'received'
    check (processing_status in ('received', 'processed', 'failed', 'ignored_duplicate', 'ignored_stale')),
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_created_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  failed_at timestamptz
);

create index if not exists stripe_webhook_events_subscription_idx
  on stripe_webhook_events (stripe_subscription_id, stripe_created_at desc);

create index if not exists stripe_webhook_events_customer_idx
  on stripe_webhook_events (stripe_customer_id, stripe_created_at desc);
