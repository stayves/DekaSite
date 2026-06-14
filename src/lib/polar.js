const PRO_CHECKOUT_URL = import.meta.env.VITE_POLAR_PRO_CHECKOUT_URL
const TEAM_CHECKOUT_URL = import.meta.env.VITE_POLAR_TEAM_CHECKOUT_URL
const TEAM_CONTACT_URL = import.meta.env.VITE_POLAR_TEAM_CONTACT_URL
const CUSTOMER_PORTAL_URL = import.meta.env.VITE_POLAR_CUSTOMER_PORTAL_URL

// Flip to `true` once Polar is wired up and you're ready to take payments.
export const isProLaunched = true

const isCheckoutUrl = (url) => Boolean(url && !url.includes('REPLACE_ME'))

export const isPolarConfigured = isCheckoutUrl(PRO_CHECKOUT_URL)
export const isTeamConfigured = isCheckoutUrl(TEAM_CHECKOUT_URL)

export function getCustomerPortalUrl(user) {
  if (!CUSTOMER_PORTAL_URL) return null
  const u = new URL(CUSTOMER_PORTAL_URL)
  if (user?.email) u.searchParams.set('customer_email', user.email)
  return u.toString()
}

// Build a Polar checkout URL prefilled with the signed-in user's identity, so
// the webhook can link the resulting subscription back to this Supabase user.
function buildCheckoutUrl(baseUrl, user) {
  const u = new URL(baseUrl)
  if (user?.email) u.searchParams.set('customer_email', user.email)
  if (user?.id) {
    u.searchParams.set('metadata[user_id]', user.id)
    // Also carry the Supabase user id as Polar's external customer id. The
    // webhook resolves user_id by metadata -> external_id -> email, so this is
    // a durable second link if metadata is ever missing from the event.
    u.searchParams.set('customer_external_id', user.id)
  }
  if (typeof window !== 'undefined') {
    u.searchParams.set('success_url', `${window.location.origin}/success`)
  }
  return u.toString()
}

export function getProCheckoutUrl(user) {
  if (!isPolarConfigured) return null
  return buildCheckoutUrl(PRO_CHECKOUT_URL, user)
}

export function getTeamCheckoutUrl(user) {
  if (!isTeamConfigured) return null
  return buildCheckoutUrl(TEAM_CHECKOUT_URL, user)
}

export function getTeamContactUrl() {
  return TEAM_CONTACT_URL || 'mailto:hello@deka.app?subject=Deka%20Team%20plan'
}
