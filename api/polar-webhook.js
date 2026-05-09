import { Buffer } from 'node:buffer'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

// Vercel: disable JSON body parsing so we can verify the signature against
// the raw bytes Polar sent. Standard-Webhooks signs the exact request body.
export const config = { api: { bodyParser: false } }

async function readRawBody(req) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks)
}

function verifySignature(rawBody, headers, secret) {
  const id = headers['webhook-id']
  const timestamp = headers['webhook-timestamp']
  const sigHeader = headers['webhook-signature']
  if (!id || !timestamp || !sigHeader) return false

  // Reject replays older than 5 minutes
  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false

  const cleanSecret = secret.startsWith('whsec_') ? secret.slice(6) : secret
  const secretBytes = Buffer.from(cleanSecret, 'base64')

  const signedContent = `${id}.${timestamp}.${rawBody.toString('utf-8')}`
  const expected = createHmac('sha256', secretBytes).update(signedContent).digest('base64')

  // Header may contain multiple "v1,sig" pairs separated by spaces
  const provided = sigHeader.split(' ').map((s) => s.split(',')[1]).filter(Boolean)
  return provided.some((sig) => {
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    return a.length === b.length && timingSafeEqual(a, b)
  })
}

async function handleSubscriptionEvent(supabase, event) {
  const sub = event.data
  if (!sub) return

  // user_id is attached at checkout time via metadata (see src/lib/polar.js)
  const userId = sub.metadata?.user_id
  if (!userId) {
    console.warn('[polar-webhook] subscription event missing metadata.user_id, skipping', sub.id)
    return
  }

  if (event.type === 'subscription.revoked') {
    await supabase.from('subscriptions').delete().eq('user_id', userId)
    return
  }

  const row = {
    user_id: userId,
    polar_customer_id: sub.customer_id ?? null,
    polar_subscription_id: sub.id,
    polar_product_id: sub.product_id ?? null,
    status: sub.status,
    tier: 'pro',
    current_period_start: sub.current_period_start ?? null,
    current_period_end: sub.current_period_end ?? null,
    cancel_at_period_end: Boolean(sub.cancel_at_period_end),
  }

  const { error } = await supabase
    .from('subscriptions')
    .upsert(row, { onConflict: 'user_id' })
  if (error) throw error
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method not allowed' })
  }

  const secret = process.env.POLAR_WEBHOOK_SECRET
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!secret || !supabaseUrl || !serviceKey) {
    console.error('[polar-webhook] missing env: POLAR_WEBHOOK_SECRET / VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
    return res.status(500).json({ error: 'misconfigured' })
  }

  let rawBody
  try {
    rawBody = await readRawBody(req)
  } catch {
    return res.status(400).json({ error: 'cannot read body' })
  }

  if (!verifySignature(rawBody, req.headers, secret)) {
    return res.status(401).json({ error: 'invalid signature' })
  }

  let event
  try {
    event = JSON.parse(rawBody.toString('utf-8'))
  } catch {
    return res.status(400).json({ error: 'invalid json' })
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  try {
    if (event?.type?.startsWith('subscription.')) {
      await handleSubscriptionEvent(supabase, event)
    }
  } catch (err) {
    console.error('[polar-webhook] handler error:', err)
    return res.status(500).json({ error: 'handler failed' })
  }

  return res.status(200).json({ ok: true })
}
