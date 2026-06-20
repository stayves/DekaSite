import { Buffer } from 'node:buffer'
import { createHmac, timingSafeEqual } from 'node:crypto'

// Vercel: disable JSON body parsing so we can verify the signature against
// the raw bytes Polar sent. Standard-Webhooks signs the exact request body.
// (@supabase/supabase-js is loaded lazily inside the handler — see below — so a
//  cold-start import failure surfaces as a readable 500 instead of a 502.)
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

  // Standard Webhooks secrets are base64 after a prefix. Polar presents the
  // secret as `polar_whs_…`; the original Standard-Webhooks convention is
  // `whsec_…`. Strip either so the HMAC key is the same bytes Polar signed with.
  const cleanSecret = secret.replace(/^(whsec_|polar_whs_)/, '')
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

function pickEmail(sub) {
  return sub.customer?.email || sub.customer_email || sub.metadata?.customer_email || null
}

function pickExternalId(sub) {
  // We set Polar's external customer id = Supabase user_id at checkout.
  return sub.customer?.external_id || sub.metadata?.user_id || null
}

// Resolve the Supabase user this subscription belongs to. Try, in order:
//   1) explicit metadata.user_id set at checkout
//   2) Polar's external customer id (= user_id, set at checkout)
//   3) email match against auth.users (covers metadata loss / portal edits)
async function resolveUserId(supabase, sub) {
  const email = pickEmail(sub)
  const externalId = pickExternalId(sub)
  let userId = sub.metadata?.user_id || null

  if (!userId && externalId) userId = externalId

  if (!userId && email) {
    const { data, error } = await supabase.rpc('deka_user_id_by_email', { p_email: email })
    if (error) console.warn('[polar-webhook] email lookup failed:', error.message)
    else if (data) userId = data
  }
  return { userId, email, externalId }
}

async function handleSubscriptionEvent(supabase, event) {
  const sub = event.data
  if (!sub) return

  const { userId, email, externalId } = await resolveUserId(supabase, sub)

  // Never silently drop: park unlinked events so they can be reconciled later
  // (e.g. once the user signs in, or a later event carries the linkage).
  if (!userId) {
    console.error('[polar-webhook] could not link subscription to a user — parking', {
      polar_subscription_id: sub.id,
      polar_customer_id: sub.customer_id ?? null,
      email,
      type: event.type,
    })
    await supabase.from('pending_subscriptions').upsert(
      {
        polar_subscription_id: sub.id,
        polar_customer_id: sub.customer_id ?? null,
        email,
        status: sub.status ?? null,
        raw: sub,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'polar_subscription_id' },
    )
    return
  }

  if (event.type === 'subscription.revoked') {
    await supabase.from('subscriptions').delete().eq('user_id', userId)
    return
  }

  // Distinguish the $60/mo Team product from the $20/mo Personal product by its
  // Polar product id. Defaults to 'pro' (Personal) when the env var is unset or
  // the id doesn't match, so existing Personal subscriptions are unaffected.
  const tier =
    sub.product_id && sub.product_id === process.env.POLAR_TEAM_PRODUCT_ID ? 'team' : 'pro'

  const row = {
    user_id: userId,
    polar_customer_id: sub.customer_id ?? null,
    polar_subscription_id: sub.id,
    polar_product_id: sub.product_id ?? null,
    status: sub.status,
    tier,
    email,
    external_customer_id: externalId,
    current_period_start: sub.current_period_start ?? null,
    current_period_end: sub.current_period_end ?? null,
    cancel_at_period_end: Boolean(sub.cancel_at_period_end),
  }

  const { error } = await supabase
    .from('subscriptions')
    .upsert(row, { onConflict: 'user_id' })
  if (error) throw error

  // Clear any earlier parked copy of this subscription now that it's linked.
  await supabase.from('pending_subscriptions').delete().eq('polar_subscription_id', sub.id)
}

export default async function handler(req, res) {
  // Outermost boundary: any unexpected throw becomes a readable 500 with the
  // error message instead of a silent process crash that Vercel's edge reports
  // as an opaque 502 (FUNCTION_INVOCATION_FAILED). This is what makes the real
  // failure visible in both the response body and the function logs.
  try {
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

    // Lazy-load the Supabase client. If the dependency fails to resolve in the
    // deployed bundle (a common silent-502 cause), this turns the cold-start
    // crash into a catchable, readable 500 right here.
    let createClient
    try {
      ({ createClient } = await import('@supabase/supabase-js'))
    } catch (err) {
      console.error('[polar-webhook] failed to load @supabase/supabase-js:', err)
      return res.status(500).json({ error: 'supabase client load failed', message: String(err?.message || err) })
    }

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

    if (event?.type?.startsWith('subscription.')) {
      await handleSubscriptionEvent(supabase, event)
    }

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[polar-webhook] unhandled error:', err)
    return res.status(500).json({ error: 'handler crashed', message: String(err?.message || err) })
  }
}
