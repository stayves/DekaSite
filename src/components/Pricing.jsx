import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import {
  getProCheckoutUrl,
  getTeamCheckoutUrl,
  getCustomerPortalUrl,
  getTeamContactUrl,
  isProLaunched,
} from '../lib/polar.js'
import { useSubscription, isEntitled } from '../lib/subscription.js'
import './Pricing.css'

const tiers = [
  {
    id: 'pro',
    name: 'Personal',
    price: '$20',
    cadence: '/ month',
    tagline: 'For professionals who live across many apps.',
    features: [
      'Unlimited actions across every app',
      'Long-term workflow memory',
      'Native integrations (Slack, Notion, Linear, GitHub)',
      'Priority email support',
      'Early access to new agents',
    ],
    ctaLabel: 'Start Personal',
    highlighted: true,
    badge: 'Most popular',
  },
  {
    id: 'team',
    name: 'Team',
    price: '$60',
    cadence: '/ month',
    tagline: 'Everything in Personal, plus shared automation for your whole team.',
    features: [
      'Everything in Personal for every seat',
      { text: 'Connect workflows & data across your team', comingSoon: true },
      'Shared workflow library',
      'Admin dashboard & audit logs',
      'Dedicated onboarding & SLA',
    ],
    ctaLabel: 'Start Team',
    highlighted: false,
  },
]

export default function Pricing() {
  const { user, loading, configured } = useAuth()
  const navigate = useNavigate()
  const [working, setWorking] = useState(null)
  const [notice, setNotice] = useState(null)
  const { subscription } = useSubscription(user)
  const entitled = isEntitled(subscription)

  const onSelect = (tier) => {
    setNotice(null)

    if (!isProLaunched) {
      setNotice("Checkout is launching within the next 24 hours — we'll email you the moment it's live.")
      return
    }

    if (!configured) {
      alert('Auth is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.')
      return
    }

    if (loading) return

    if (!user) {
      navigate(`/login?next=/pricing&plan=${tier.id}`)
      return
    }

    // Already subscribed → send to customer portal instead of checkout
    if (entitled) {
      const portal = getCustomerPortalUrl(user)
      if (portal) {
        window.open(portal, '_blank', 'noopener,noreferrer')
      } else {
        navigate('/account')
      }
      return
    }

    const url = tier.id === 'team' ? getTeamCheckoutUrl(user) : getProCheckoutUrl(user)
    if (!url) {
      const envVar = tier.id === 'team' ? 'VITE_POLAR_TEAM_CHECKOUT_URL' : 'VITE_POLAR_PRO_CHECKOUT_URL'
      alert(`Polar checkout link not set. Add ${envVar} to .env.local — see .env.example.`)
      return
    }
    setWorking(tier.id)
    window.location.href = url
  }

  const buttonLabel = (tier) => {
    if (working === tier.id) return 'Opening checkout…'
    if (!isProLaunched) return 'Available within 24h'
    if (entitled) return 'Manage subscription'
    return tier.ctaLabel
  }

  return (
    <section className="pricing">
      <div className="container">
        <div className="section-head reveal in">
          <span className="eyebrow"><span className="dot" />Pricing</span>
          <h1>Simple pricing. Real automation.</h1>
          <p className="pricing-sub">
            Start with a free trial, upgrade when Deka starts running your day. Cancel anytime —
            your local workflow memory stays on your machine either way.
          </p>
        </div>

        <div className="pricing-grid">
          {tiers.map((tier) => (
            <article
              key={tier.id}
              className={`pricing-card reveal in ${tier.highlighted ? 'is-featured' : ''}`}
            >
              {tier.badge && <span className="pricing-badge">{tier.badge}</span>}
              <header className="pricing-head">
                <h3>{tier.name}</h3>
                <div className="pricing-price">
                  <span className="amount">{tier.price}</span>
                  <span className="cadence">{tier.cadence}</span>
                </div>
                <p className="pricing-tagline">{tier.tagline}</p>
              </header>

              <ul className="pricing-features">
                {tier.features.map((f) => {
                  const text = typeof f === 'string' ? f : f.text
                  const comingSoon = typeof f === 'object' && f.comingSoon
                  return (
                    <li key={text}>
                      <CheckIcon /> {text}
                      {comingSoon && <span className="pricing-soon">Coming soon</span>}
                    </li>
                  )
                })}
              </ul>

              <button
                type="button"
                onClick={() => onSelect(tier)}
                className={`btn ${tier.highlighted ? 'btn-primary' : 'btn-secondary'} pricing-cta`}
                disabled={working === tier.id}
              >
                {buttonLabel(tier)}
              </button>
            </article>
          ))}
        </div>

        <p className="pricing-foot">
          Already have an account? <Link to="/account">Manage your subscription</Link>.
          Questions?{' '}
          <a href={getTeamContactUrl()}>Talk to us</a>.
        </p>

        {notice && (
          <p className="pricing-notice" role="status">{notice}</p>
        )}
      </div>
    </section>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M2 7.5l3 3 7-7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
