import type { Env } from './types'
import { verifySupabaseJwt, AuthError } from './auth'
import { getEntitlement } from './entitlement'
import { overHardCap, PLAN_LIMITS } from './plans'
import { handleAnthropic } from './anthropic'
import { handleGemini } from './gemini'
import { handleKimi } from './kimi'

function bearer(req: Request): string | null {
  const h = req.headers.get('authorization') || ''
  const m = h.match(/^Bearer\s+(.+)$/i)
  return m ? m[1] : null
}

function err(status: number, code: string, extra?: Record<string, unknown>) {
  return new Response(JSON.stringify({ type: 'error', error: { type: code, message: code, ...extra } }), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/**
 * CORS for browser callers (the DekaSite Account page reads /v1/usage). The
 * desktop app calls from Electron's main process and needs none of this. We
 * reflect the request Origin — every endpoint is gated by the caller's own JWT,
 * so reflecting origin on a read-only usage view is low-risk.
 */
function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin')
  if (!origin) return {}
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'authorization, content-type, anthropic-version, anthropic-beta, x-deka-no-downgrade',
    'access-control-max-age': '86400',
    vary: 'Origin',
  }
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url)

    if (req.method === 'GET' && url.pathname === '/healthz') return new Response('ok')

    // CORS preflight — must answer before the bearer check (preflight carries no
    // Authorization header).
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(req) })

    const token = bearer(req)
    if (!token) return err(401, 'missing_token')

    let caller
    try {
      caller = await verifySupabaseJwt(token, env)
    } catch (e) {
      if (e instanceof AuthError && e.reason === 'expired') return err(401, 'token_expired')
      return err(401, 'auth_failed')
    }

    let ent
    try {
      ent = await getEntitlement(env, caller.userId)
    } catch (e) {
      console.error('[proxy] entitlement lookup failed:', (e as Error).message)
      return err(503, 'entitlement_unavailable')
    }

    // Usage meter + credit balance for the desktop SettingsPanel. The "balance"
    // is the reset-model credit: this period's allowance (maxCostUsd) minus what
    // usage has metered down. costUsd is the canonical unit; tokens is advisory.
    if (req.method === 'GET' && url.pathname === '/v1/usage') {
      const limits = PLAN_LIMITS[ent.plan]
      const remaining = {
        costUsd: Math.max(0, limits.maxCostUsd - ent.estCostUsd),
        tokens: Math.max(0, limits.maxTokens - (ent.inputTokens + ent.outputTokens)),
      }
      return Response.json({ plan: ent.plan, usage: ent, limits, remaining, poolProvider: 'kimi' }, { headers: corsHeaders(req) })
    }

    if (overHardCap(ent.plan, ent)) {
      return err(429, 'quota_exceeded', { plan: ent.plan, period_start: ent.periodStart })
    }

    if (req.method === 'POST' && url.pathname === '/v1/messages') {
      return handleAnthropic(req, env, ctx, caller, ent)
    }
    // Pooled Kimi (OpenAI-compatible) — the desktop adapter posts here with the
    // user's JWT; the pooled Kimi key is injected in handleKimi.
    if (req.method === 'POST' && url.pathname === '/kimi/chat/completions') {
      return handleKimi(req, env, ctx, caller, ent)
    }
    if (req.method === 'POST' && url.pathname.startsWith('/v1/gemini/')) {
      const modelAndMethod = decodeURIComponent(url.pathname.slice('/v1/gemini/'.length))
      return handleGemini(req, env, ctx, caller, ent, modelAndMethod)
    }

    return err(404, 'not_found')
  },
}
