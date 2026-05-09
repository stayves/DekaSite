-- Subscriptions table — populated by the Polar webhook (api/polar-webhook),
-- read by the client to gate Pro features.

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  polar_customer_id text,
  polar_subscription_id text unique,
  polar_product_id text,
  status text not null check (status in (
    'active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid'
  )),
  tier text not null default 'pro',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_polar_customer_id_idx
  on public.subscriptions (polar_customer_id);

create index if not exists subscriptions_status_idx
  on public.subscriptions (status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

-- RLS: signed-in users can read their own subscription row only.
-- All writes go through the service role (used by the webhook handler).
alter table public.subscriptions enable row level security;

drop policy if exists "Users can read their own subscription" on public.subscriptions;
create policy "Users can read their own subscription"
on public.subscriptions
for select
using (auth.uid() = user_id);
