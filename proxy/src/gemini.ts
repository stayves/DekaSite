import type { Entitlement, Env, UsageDelta } from './types'
import type { Caller } from './auth'
import { enforceModel } from './plans'
import { writeLedger } from './ledger'

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

/**
 * Gemini generateContent / streamGenerateContent passthrough.
 * Path: /v1/gemini/<model>:<method>  (e.g. gemini-2.5-flash-lite:generateContent)
 */
export async function handleGemini(
  req: Request,
  env: Env,
  ctx: ExecutionContext,
  caller: Caller,
  ent: Entitlement,
  modelAndMethod: string,
): Promise<Response> {
  const colon = modelAndMethod.lastIndexOf(':')
  const requested = colon === -1 ? modelAndMethod : modelAndMethod.slice(0, colon)
  const method = colon === -1 ? 'generateContent' : modelAndMethod.slice(colon + 1)

  const allowDowngrade = req.headers.get('x-deka-no-downgrade') !== '1'
  const decision = enforceModel(ent.plan, requested, allowDowngrade)
  if (decision.action === 'reject') {
    return new Response(JSON.stringify({ error: { code: 403, status: 'model_not_allowed', model: requested } }), {
      status: 403,
      headers: { 'content-type': 'application/json' },
    })
  }
  const model = decision.model
  const streaming = method.startsWith('streamGenerateContent')
  const url = `${GEMINI_BASE}/${model}:${method}?key=${env.GEMINI_POOL_KEY}${streaming ? '&alt=sse' : ''}`

  const upstream = await fetch(url, {
    method: 'POST',
    signal: req.signal,
    headers: { 'content-type': 'application/json' },
    body: await req.text(),
  })
  if (!upstream.ok || !upstream.body) {
    return new Response(await upstream.text(), { status: upstream.status, headers: { 'content-type': 'application/json' } })
  }

  if (!streaming) {
    const data = (await upstream.json()) as { usageMetadata?: Record<string, number> }
    const m = data.usageMetadata ?? {}
    const usage: UsageDelta = {
      input: m.promptTokenCount ?? 0,
      output: m.candidatesTokenCount ?? 0,
      cacheRead: m.cachedContentTokenCount ?? 0,
      cacheWrite: 0,
    }
    ctx.waitUntil(writeLedger(env, { userId: caller.userId, provider: 'gemini', model, usage }))
    return new Response(JSON.stringify(data), { status: 200, headers: { 'content-type': 'application/json' } })
  }

  const [toClient, toMeter] = upstream.body.tee()
  ctx.waitUntil(
    parseGeminiUsage(toMeter).then((usage) => writeLedger(env, { userId: caller.userId, provider: 'gemini', model, usage })),
  )
  return new Response(toClient, {
    status: 200,
    headers: { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache' },
  })
}

async function parseGeminiUsage(stream: ReadableStream<Uint8Array>): Promise<UsageDelta> {
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
        if (!json) continue
        try {
          const evt = JSON.parse(json) as { usageMetadata?: Record<string, number> }
          if (evt.usageMetadata) {
            usage.input = evt.usageMetadata.promptTokenCount ?? usage.input
            usage.output = evt.usageMetadata.candidatesTokenCount ?? usage.output
            usage.cacheRead = evt.usageMetadata.cachedContentTokenCount ?? usage.cacheRead
          }
        } catch {
          /* partial line */
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
  return usage
}
