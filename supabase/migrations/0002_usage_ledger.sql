-- Usage ledger — one row per model call, written by the Cloudflare Worker proxy
-- (service role) after each request completes. Read by users to see their own
-- usage; summed by deka_entitlement() (see 0003) for quota enforcement.

create table if not exists public.usage_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  ts timestamptz not null default now(),
  provider text not null default 'anthropic',
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cache_read_tokens integer not null default 0,
  cache_write_tokens integer not null default 0,
  est_cost_usd numeric(12,6) not null default 0,
  request_id text
);

-- Hot path is "sum this user's usage since period_start" — index for it.
create index if not exists usage_ledger_user_ts_idx
  on public.usage_ledger (user_id, ts desc);

alter table public.usage_ledger enable row level security;

-- Users may read their own usage rows. There is intentionally NO insert/update
-- policy: writes happen only via the service role (the proxy), which bypasses RLS.
drop policy if exists "Users can read their own usage" on public.usage_ledger;
create policy "Users can read their own usage"
on public.usage_ledger
for select
using (auth.uid() = user_id);
