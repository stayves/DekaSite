-- Surface the Team plan to the proxy's entitlement lookup.
--
-- 0003 hardcoded an active/trialing subscription to plan 'pro'. Now that the
-- Polar webhook tags Team subscriptions with tier='team' (see api/polar-webhook),
-- read the tier column instead so Team subscribers get plan='team' (and the
-- Team caps in proxy/src/plans.ts). Personal subscriptions still resolve to
-- 'pro' (tier default), and no/lapsed subscription still resolves to 'free'.
--
-- SECURITY DEFINER + revoked from anon/authenticated => callable only by the
-- service role used by the Worker proxy. Never expose to the client.

create or replace function public.deka_entitlement(p_user uuid)
returns table (
  plan text,
  period_start timestamptz,
  input_tokens bigint,
  output_tokens bigint,
  est_cost_usd numeric
)
language sql
security definer
set search_path = public
as $$
  with sub as (
    select
      case
        when status in ('active', 'trialing') then coalesce(tier, 'pro')
        else 'free'
      end as plan,
      current_period_start as ps
    from public.subscriptions
    where user_id = p_user
  ),
  resolved as (
    -- No row, or a lapsed/canceled sub => 'free' on a calendar-month window.
    select
      coalesce((select plan from sub), 'free') as plan,
      coalesce((select ps from sub), date_trunc('month', now())) as period_start
  )
  select
    r.plan,
    r.period_start,
    coalesce(sum(u.input_tokens), 0)::bigint,
    coalesce(sum(u.output_tokens), 0)::bigint,
    coalesce(sum(u.est_cost_usd), 0)::numeric
  from resolved r
  left join public.usage_ledger u
    on u.user_id = p_user and u.ts >= r.period_start
  group by r.plan, r.period_start;
$$;

revoke all on function public.deka_entitlement(uuid) from anon, authenticated;
