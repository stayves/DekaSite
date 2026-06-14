import type { Entitlement, Env, UsageDelta } from './types'
import type { Caller } from './auth'
import { writeLedger } from './ledger'

const DEFAULT_KIMI_BASE = 'https://api.moonshot.ai/v1'
const DEFAULT_KIMI_MODEL = 'kimi-k2.6'

function err(status: number, code: string, extra?: Record<string, unknown>) {
  return new Response(JSON.stringify({ type: 'error', error: { type: code, message: code, ...extra } }), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/**
 * Pooled Kimi (Moonshot / Gonka) passthrough — the founder's PRIMARY token
 * source. The desktop sends OpenAI Chat Completions shape (via
 * openaiCompatClient) to `${PROXY_URL}/kimi/chat/completions`, authed with the
 * user's Supabase JWT. By the time we get here the JWT is verified and the
 * credit cap (overHardCap on est_cost_usd) is already enforced in index.ts.
 *
 * We inject KIMI_POOL_KEY (never leaves the Worker), optionally PIN the model to
 * KIMI_POOL_MODEL for cost control, forward upstream, and meter the response's
 * `usage` into the same usage_ledger the cap reads from. Plan (free/pro) does
 * not change the model here — only the cost cap differs.
 */
export async function handleKimi(
  req: Request,
  env: Env,
  ctx: ExecutionContext,
  caller: Caller,
  _ent: Entitlement,
): Promise<Response> {
  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return err(400, 'invalid_json')
  }

  // Pin to the founder-configured pooled model when set; else honor what the
  // client asked for; else the default. This is the founder's cost lever.
  const model = env.KIMI_POOL_MODEL || String(body.model || DEFAULT_KIMI_MODEL)
  body.model = model

  const clientWantsStream = body.stream === true
  if (clientWantsStream) {
    // OpenAI only emits a usage block on the final SSE chunk when asked.
    body.stream_options = { include_usage: true }
  }

  const base = (env.KIMI_BASE_URL || DEFAULT_KIMI_BASE).replace(/\/+$/, '')
  const upstream = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    signal: req.signal, // propagate client abort (user pressed Stop)
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${env.KIMI_POOL_KEY}`,
    },
    body: JSON.stringify(body),
  })

  if (!upstream.ok || !upstream.body) {
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: { 'content-type': 'application/json' },
    })
  }

  if (!clientWantsStream) {
    const data = (await upstream.json()) as { usage?: Record<string, unknown> }
    ctx.waitUntil(
      writeLedger(env, { userId: caller.userId, provider: 'kimi', model, usage: usageFrom(data.usage) }),
    )
    return new Response(JSON.stringify(data), { status: 200, headers: { 'content-type': 'application/json' } })
  }

  const [toClient, toMeter] = upstream.body.tee()
  ctx.waitUntil(
    parseKimiUsage(toMeter).then((usage) =>
      writeLedger(env, { userId: caller.userId, provider: 'kimi', model, usage }),
    ),
  )
  return new Response(toClient, {
    status: 200,
    headers: { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache' },
  })
}

/** OpenAI `usage` block → normalized UsageDelta (cached prompt tokens → cacheRead). */
function usageFrom(u: Record<string, unknown> | undefined): UsageDelta {
  const cached = Number((u?.prompt_tokens_details as Record<string, unknown> | undefined)?.cached_tokens ?? 0)
  const prompt = Number(u?.prompt_tokens ?? 0)
  return {
    // Bill cached prompt tokens at the cheaper cacheRead rate; the rest at full input.
    input: Math.max(0, prompt - cached),
    output: Number(u?.completion_tokens ?? 0),
    cacheRead: cached,
    cacheWrite: 0,
  }
}

/** Streaming: usage rides the final chunk (we set stream_options.include_usage). */
async function parseKimiUsage(stream: ReadableStream<Uint8Array>): Promise<UsageDelta> {
  let usage: UsageDelta = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      let idx: number
      while ((idx = buf.indexOf('\n\n')) !== -1) {
        const block = buf.slice(0, idx)
        buf = buf.slice(idx + 2)
        const dataLine = block.split('\n').find((l) => l.startsWith('data:'))
        if (!dataLine) continue
        const json = dataLine.slice(5).trim()
        if (!json || json === '[DONE]') continue
        try {
          const evt = JSON.parse(json) as { usage?: Record<string, unknown> }
          if (evt.usage) usage = usageFrom(evt.usage)
        } catch {
          /* keepalive / partial line */
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
  return usage
}
