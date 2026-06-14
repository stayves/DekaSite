import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import {
  getProCheckoutUrl,
  getCustomerPortalUrl,
  isPolarConfigured,
  isProLaunched,
} from '../lib/polar.js'
import { useSubscription, isEntitled } from '../lib/subscription.js'
import { useUsage, usedFraction, isUsageConfigured } from '../lib/usage.js'
import './Account.css'

const STATUS_LABEL = {
  active: 'Active',
  trialing: 'Trial',
  past_due: 'Past due',
  canceled: 'Canceled',
  incomplete: 'Incomplete',
  incomplete_expired: 'Expired',
  unpaid: 'Unpaid',
}

function formatDate(iso) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return null
  }
}

export default function Account() {
  const { user, loading, signOut, configured } = useAuth()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)
  const { subscription, loading: subLoading } = useSubscription(user)
  const { usage, loading: usageLoading } = useUsage(user)

  useEffect(() => {
    if (!loading && !user && configured) {
      navigate('/login?next=/account', { replace: true })
    }
  }, [loading, user, configured, navigate])

  const onSignOut = async () => {
    setSigningOut(true)
    await signOut()
    navigate('/', { replace: true })
  }

  if (!configured) {
    return (
      <section className="account">
        <div className="container account-inner">
          <div className="account-card reveal in">
            <h1>Account</h1>
            <p className="account-sub">
              Auth isn't configured yet. Add <code>VITE_SUPABASE_URL</code> and{' '}
              <code>VITE_SUPABASE_ANON_KEY</code> to <code>.env.local</code> and restart the dev
              server.
            </p>
            <Link to="/" className="btn btn-secondary">Back to home</Link>
          </div>
        </div>
      </section>
    )
  }

  if (loading || !user) {
    return (
      <section className="account">
        <div className="container account-inner">
          <div className="account-card reveal in">
            <p className="account-sub">Loading…</p>
          </div>
        </div>
      </section>
    )
  }

  const entitled = isEntitled(subscription)
  const isTeam = subscription?.tier === 'team'
  const planLabel = entitled ? (isTeam ? 'Team' : 'Personal') : 'Free trial'
  const statusLabel = subscription ? STATUS_LABEL[subscription.status] || subscription.status : null
  const renewsOn = subscription?.current_period_end ? formatDate(subscription.current_period_end) : null
  const portalUrl = getCustomerPortalUrl(user)
  const proUrl = getProCheckoutUrl(user)

  return (
    <section className="account">
      <div className="container account-inner">
        <div className="account-card reveal in">
          <span className="eyebrow"><span className="dot" />Signed in</span>
          <h1>Welcome back</h1>
          <p className="account-sub">{user.email}</p>

          <dl className="account-list">
            <div>
              <dt>User ID</dt>
              <dd><code>{user.id}</code></dd>
            </div>
            <div>
              <dt>Provider</dt>
              <dd>{user.app_metadata?.provider || 'email'}</dd>
            </div>
            <div>
              <dt>Plan</dt>
              <dd>
                {subLoading ? (
                  <span className="account-hint">Loading…</span>
                ) : entitled ? (
                  <>
                    {planLabel}
                    {statusLabel && statusLabel !== 'Active' && (
                      <span className="account-hint"> — {statusLabel}</span>
                    )}
                    {subscription?.cancel_at_period_end && renewsOn && (
                      <span className="account-hint"> — ends {renewsOn}</span>
                    )}
                    {!subscription?.cancel_at_period_end && renewsOn && (
                      <span className="account-hint"> — renews {renewsOn}</span>
                    )}
                  </>
                ) : (
                  <>
                    {planLabel}
                    <span className="account-hint">
                      {isProLaunched ? ' — upgrade for unlimited actions' : ' — upgrade launches within 24h'}
                    </span>
                  </>
                )}
              </dd>
            </div>

            {isUsageConfigured && (
              <div>
                <dt>Usage this period</dt>
                <dd>
                  {usageLoading ? (
                    <span className="account-hint">Loading…</span>
                  ) : usage ? (
                    <>
                      <div
                        style={{
                          height: 8,
                          borderRadius: 999,
                          background: 'rgba(127,127,127,0.18)',
                          overflow: 'hidden',
                          margin: '4px 0 6px',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.round(usedFraction(usage) * 100)}%`,
                            background: 'linear-gradient(90deg,#7c5cff,#41d1a7)',
                            borderRadius: 999,
                            transition: 'width .3s',
                          }}
                        />
                      </div>
                      <span className="account-hint">
                        {Math.round(usedFraction(usage) * 100)}% used
                        {renewsOn ? ` — resets ${renewsOn}` : ' — resets monthly'}
                      </span>
                    </>
                  ) : (
                    <span className="account-hint">Unavailable</span>
                  )}
                </dd>
              </div>
            )}
          </dl>

          <div className="account-actions">
            {entitled && portalUrl ? (
              <a href={portalUrl} className="btn btn-primary" target="_blank" rel="noopener noreferrer">
                Manage subscription
              </a>
            ) : isProLaunched && isPolarConfigured && proUrl ? (
              <a href={proUrl} className="btn btn-primary">Upgrade to Personal — $20/mo</a>
            ) : (
              <Link to="/pricing" className="btn btn-primary">
                {isProLaunched ? 'See plans' : 'Plans launch within 24h'}
              </Link>
            )}
            <button type="button" className="btn btn-secondary" onClick={onSignOut} disabled={signingOut}>
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
