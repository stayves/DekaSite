import type { Entitlement, Env, UsageDelta } from './types'
import type { Caller } from './auth'
import { enforceModel } from './plans'
import { writeLedger } from './ledger'

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'

function err(status: number, code: string, extra?: Record<string, unknown>) {
  return new Response(JSON.stringify({ type: 'error', error: { type: code, message: code, ...extra } }), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/**
 * Anthropic Messages passthrough. Mirrors the client's stream flag:
 *  - non-stream (what DekaApp sends today): read JSON, bill exact response.usage
 *  - stream: tee the SSE — one branch to the client, one to a usage parser
 * The pooled key is injected here and never leaves the Worker.
 */
export async function handleAnthropic(
  req: Request,
  env: Env,
  ctx: ExecutionContext,
  caller: Caller,
  ent: Entitlement,
): Promise<Response> {
  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return err(400, 'invalid_json')
  }
  const requested = String(body.model ?? '')
  const allowDowngrade = req.headers.get('x-deka-no-downgrade') !== '1'
  const decision = enforceModel(ent.plan, requested, allowDowngrade)
  if (decision.action === 'reject') return err(403, 'model_not_allowed', { model: requested, plan: ent.plan })
  body.model = decision.model

  const extraHeaders: Record<string, string> = {}
  if (decision.action === 'downgrade') extraHeaders['x-deka-model-downgraded'] = `${decision.from}->${decision.model}`

  const upstream = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    signal: req.signal, // propagate client abort (user pressed Stop)
    headers: {
      'content-type': 'application/json',
      'x-api-key': env.ANTHROPIC_POOL_KEY,
      'anthropic-version': req.headers.get('anthropic-version') || '2023-06-01',
      // Forward the beta header or prompt-caching silently degrades.
      ...(req.headers.get('anthropic-beta') ? { 'anthropic-beta': req.headers.get('anthropic-beta') as string } : {}),
    },
    body: JSON.stringify(body),
  })

  if (!upstream.ok || !upstream.body) {
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: { 'content-type': 'application/json', ...extraHeaders },
    })
  }

  const model = decision.model
  const clientWantsStream = body.stream === true

  if (!clientWantsStream) {
    const data = (await upstream.json()) as { usage?: Record<string, number> }
    const u = data.usage ?? {}
    const usage: UsageDelta = {
      input: u.input_tokens ?? 0,
      output: u.output_tokens ?? 0,
      cacheRead: u.cache_read_input_tokens ?? 0,
      cacheWrite: u.cache_creation_input_tokens ?? 0,
    }
    ctx.waitUntil(writeLedger(env, { userId: caller.userId, provider: 'anthropic', model, usage }))
    return new Response(JSON.stringify(data), { status: 200, headers: { 'content-type': 'application/json', ...extraHeaders } })
  }

  const [toClient, toMeter] = upstream.body.tee()
  ctx.waitUntil(
    parseAnthropicUsage(toMeter).then((usage) =>
      writeLedger(env, { userId: caller.userId, provider: 'anthropic', model, usage }),
    ),
  )
  return new Response(toClient, {
    status: 200,
    headers: { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache', ...extraHeaders },
  })
}

/** input/cache tokens come from message_start; final output from message_delta. */
async function parseAnthropicUsage(stream: ReadableStream<Uint8Array>): Promise<UsageDelta> {
  const usage: UsageDelta = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }
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
          const evt = JSON.parse(json) as {
            type?: string
            message?: { usage?: Record<string, number> }
            usage?: Record<string, number>
          }
          if (evt.type === 'message_start' && evt.message?.usage) {
            const m = evt.message.usage
            usage.input = m.input_tokens ?? usage.input
            usage.cacheRead = m.cache_read_input_tokens ?? usage.cacheRead
            usage.cacheWrite = m.cache_creation_input_tokens ?? usage.cacheWrite
            usage.output = m.output_tokens ?? usage.output
          } else if (evt.type === 'message_delta' && evt.usage) {
            usage.output = evt.usage.output_tokens ?? usage.output
          }
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
