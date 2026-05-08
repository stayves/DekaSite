import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { getProCheckoutUrl, isPolarConfigured } from '../lib/polar.js'
import './Account.css'

export default function Account() {
  const { user, loading, signOut, configured } = useAuth()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)

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
              <dd>Free <span className="account-hint">— upgrade for unlimited actions</span></dd>
            </div>
          </dl>

          <div className="account-actions">
            {isPolarConfigured && proUrl ? (
              <a href={proUrl} className="btn btn-primary">Upgrade to Pro — $20/mo</a>
            ) : (
              <Link to="/pricing" className="btn btn-primary">See plans</Link>
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
