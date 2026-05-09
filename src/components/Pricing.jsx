import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import {
  getProCheckoutUrl,
  getCustomerPortalUrl,
  getTeamContactUrl,
  isPolarConfigured,
  isProLaunched,
} from '../lib/polar.js'
import { useSubscription, isEntitled } from '../lib/subscription.js'
import './Pricing.css'

const tiers = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    cadence: 'forever',
    tagline: 'For trying Deka on a personal machine.',
    features: [
      'Local-first agent on one device',
      'Up to 50 actions per day',
      '7-day workflow memory',
      'Community support',
    ],
    ctaLabel: 'Get started',
    highlighted: false,
  },
  {
    id: 'pro',
    name: 'Pro',
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
    ctaLabel: 'Start Pro',
    highlighted: true,
    badge: 'Most popular',
  },
  {
    id: 'team',
    name: 'Team',
    price: 'Custom',
    cadence: 'billed annually',
    tagline: 'Shared agents and admin controls for whole teams.',
    features: [
      'Everything in Pro for every seat',
      'Shared workflow library',
      'SSO / SCIM provisioning',
      'Audit logs & admin dashboard',
      'Dedicated onboarding & SLA',
    ],
    ctaLabel: 'Contact sales',
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

    if (tier.id === 'team') {
      window.location.href = getTeamContactUrl()
      return
    }

    if (tier.id === 'pro' && !isProLaunched) {
      setNotice("Pro is launching within the next 24 hours. Sign up free in the meantime — we'll email you the moment checkout is live.")
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

    if (tier.id === 'free') {
      navigate('/account')
      return
    }

    if (tier.id === 'pro') {
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

      const url = getProCheckoutUrl(user)
      if (!url) {
        alert(
          'Polar checkout link not set. Add VITE_POLAR_PRO_CHECKOUT_URL to .env.local — see .env.example.'
        )
        return
      }
      setWorking(tier.id)
      window.location.href = url
    }
  }

  const proButtonLabel = (tier) => {
    if (working === tier.id) return 'Opening checkout…'
    if (tier.id === 'pro') {
      if (entitled) return 'Manage subscription'
      if (!isProLaunched) return 'Available within 24h'
    }
    return tier.ctaLabel
  }

  return (
    <section className="pricing">
      <div className="container">
        <div className="section-head reveal in">
          <span className="eyebrow"><span className="dot" />Pricing</span>
          <h1>Simple pricing. Real automation.</h1>
          <p className="pricing-sub">
            Start free, upgrade when Deka starts running your day. Cancel anytime — your local
            workflow memory stays on your machine either way.
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
                {tier.features.map((f) => (
                  <li key={f}>
                    <CheckIcon /> {f}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => onSelect(tier)}
                className={`btn ${tier.highlighted ? 'btn-primary' : 'btn-secondary'} pricing-cta`}
                disabled={working === tier.id}
              >
                {proButtonLabel(tier)}
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
