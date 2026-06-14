import type { Env, Entitlement, Plan } from './types'

/**
 * One round-trip plan + current-period usage via the deka_entitlement() RPC
 * (service role). See migration 0003_entitlement_rpc.sql.
 */
export async function getEntitlement(env: Env, userId: string): Promise<Entitlement> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/deka_entitlement`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ p_user: userId }),
  })
  if (!res.ok) {
    throw new Error(`entitlement rpc ${res.status}: ${await res.text()}`)
  }
  const data = (await res.json()) as unknown
  const row = Array.isArray(data) ? data[0] : data
  if (!row) {
    return { plan: 'free', periodStart: new Date(0).toISOString(), inputTokens: 0, outputTokens: 0, estCostUsd: 0 }
  }
  const r = row as Record<string, unknown>
  return {
    plan: (r.plan as Plan) ?? 'free',
    periodStart: String(r.period_start ?? new Date(0).toISOString()),
    inputTokens: Number(r.input_tokens ?? 0),
    outputTokens: Number(r.output_tokens ?? 0),
    estCostUsd: Number(r.est_cost_usd ?? 0),
  }
}
