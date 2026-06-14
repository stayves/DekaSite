import type { Env, UsageDelta } from './types'
import { estimateCost } from './plans'

/**
 * Append one usage row (service role bypasses RLS). Failures are logged, not
 * thrown — a metering miss must never break the user's model call. Call inside
 * ctx.waitUntil so it runs after the response is returned.
 */
export async function writeLedger(
  env: Env,
  row: { userId: string; provider: string; model: string; usage: UsageDelta; requestId?: string },
): Promise<void> {
  // Skip empty deltas (e.g. provider error before any tokens).
  const { input, output, cacheRead, cacheWrite } = row.usage
  if (input + output + cacheRead + cacheWrite === 0) return

  const body = [
    {
      user_id: row.userId,
      provider: row.provider,
      model: row.model,
      input_tokens: input,
      output_tokens: output,
      cache_read_tokens: cacheRead,
      cache_write_tokens: cacheWrite,
      est_cost_usd: estimateCost(row.model, row.usage),
      request_id: row.requestId ?? null,
    },
  ]
  try {
    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/usage_ledger`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        prefer: 'return=minimal',
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) console.error('[proxy] ledger write failed:', res.status, await res.text())
  } catch (e) {
    console.error('[proxy] ledger write threw:', (e as Error).message)
  }
}
