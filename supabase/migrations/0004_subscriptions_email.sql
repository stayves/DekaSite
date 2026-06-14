-- Robust identity linking for subscriptions + live desktop updates.
--
--  * store customer email + Polar external_customer_id so the webhook can
--    resolve a Supabase user even when checkout metadata is missing/lost
--  * deka_user_id_by_email(): indexed auth.users lookup for the webhook
--  * pending_subscriptions: holding pen for events we cannot link yet, so they
--    are reconciled later instead of being silently dropped
--  * publish subscriptions to Realtime so the desktop app reflects a purchase
--    without an app restart

alter table public.subscriptions
  add column if not exists email text,
  add column if not exists external_customer_id text;

create index if not exists subscriptions_email_idx
  on public.subscriptions (lower(email));

-- Service-role-only helper: resolve a user id from an email. SECURITY DEFINER
-- so it can read auth.users; revoked from client roles.
create or replace function public.deka_user_id_by_email(p_email text)
returns uuid
language sql
security definer
set search_path = auth, public
as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1;
$$;

revoke all on function public.deka_user_id_by_email(text) from anon, authenticated;

-- Unlinked subscription events land here (never dropped). Reconciled when the
-- user signs in / a later event carries the linkage.
create table if not exists public.pending_subscriptions (
  id bigint generated always as identity primary key,
  polar_subscription_id text unique,
  polar_customer_id text,
  email text,
  status text,
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- service role only (the webhook). RLS enabled with no policies => no client access.
alter table public.pending_subscriptions enable row level security;

-- Live updates: desktop app subscribes to its own subscriptions row (see useAuth).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'subscriptions'
  ) then
    alter publication supabase_realtime add table public.subscriptions;
  end if;
end $$;
