const PRO_CHECKOUT_URL = import.meta.env.VITE_POLAR_PRO_CHECKOUT_URL
const TEAM_CONTACT_URL = import.meta.env.VITE_POLAR_TEAM_CONTACT_URL

// Flip to `true` once Polar is wired up and you're ready to take payments.
export const isProLaunched = false

export const isPolarConfigured = Boolean(
  PRO_CHECKOUT_URL && !PRO_CHECKOUT_URL.includes('REPLACE_ME')
)

export function getProCheckoutUrl(user) {
  if (!isPolarConfigured) return null
  const u = new URL(PRO_CHECKOUT_URL)
  if (user?.email) u.searchParams.set('customer_email', user.email)
  if (user?.id) u.searchParams.set('metadata[user_id]', user.id)
  if (typeof window !== 'undefined') {
    u.searchParams.set('success_url', `${window.location.origin}/success`)
  }
  return u.toString()
}

export function getTeamContactUrl() {
  return TEAM_CONTACT_URL || 'mailto:hello@deka.app?subject=Deka%20Team%20plan'
}
