import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase.js'
import { useAuth } from '../lib/auth.jsx'
import './Account.css'

// Hand the current Supabase session off to the Deka desktop app via a
// `deka://auth` deep link. Tokens go in the URL fragment so they don't
// hit any HTTP log along the way.
//
// Flow:
//   Desktop app → opens browser → /handoff?state=<nonce>
//   not signed in → /login?next=/handoff?state=<nonce>
//   signed in    → deka://auth#access_token=…&refresh_token=…&state=<nonce>
//
// The desktop app generated `state` before launching the browser and will
// reject the handoff if the value doesn't match what it remembered.

const RETURN_PROTOCOL = 'deka://auth'

export default function Handoff() {
  const { user, loading, configured } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const state = params.get('state') || ''
  const [error, setError] = useState(null)
  const [phase, setPhase] = useState('preparing') // preparing | redirecting | done | error

  useEffect(() => {
    if (loading) return

    if (!configured) {
      setError('Site auth is not configured. Add Supabase env vars and redeploy.')
      setPhase('error')
      return
    }

    if (!state) {
      setError('Missing handoff token. Re-launch the sign-in flow from the Deka desktop app.')
      setPhase('error')
      return
    }

    if (!user) {
      const next = `/handoff?state=${encodeURIComponent(state)}`
      navigate(`/login?next=${encodeURIComponent(next)}`, { replace: true })
      return
    }

    let cancelled = false
    setPhase('redirecting')
    supabase.auth.getSession().then(({ data, error: sessErr }) => {
      if (cancelled) return
      if (sessErr || !data.session) {
        setError(sessErr?.message || 'No active Supabase session to hand off.')
        setPhase('error')
        return
      }
      const { access_token, refresh_token } = data.session
      const fragment = new URLSearchParams({
        access_token,
        refresh_token,
        state,
      }).toString()
      const target = `${RETURN_PROTOCOL}#${fragment}`
      // Replace so the browser back-button doesn't return to a page that
      // immediately re-fires the protocol handler.
      window.location.replace(target)
      setPhase('done')
    })

    return () => { cancelled = true }
  }, [loading, configured, user, state, navigate])

  return (
    <section className="account">
      <div className="container account-inner">
        <div className="account-card reveal in">
          <span className="eyebrow"><span className="dot" />Connecting Deka</span>
          {phase === 'error' ? (
            <>
              <h1>Couldn't sign you in</h1>
              <p className="account-sub">{error}</p>
              <div className="account-actions">
                <Link to="/" className="btn btn-secondary">Back to home</Link>
              </div>
            </>
          ) : (
            <>
              <h1>Returning to Deka…</h1>
              <p className="account-sub">
                {phase === 'redirecting'
                  ? 'Opening the desktop app. If nothing happens, make sure Deka is installed.'
                  : 'One moment.'}
              </p>
              <div className="account-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => window.location.reload()}
                >
                  Try again
                </button>
                <Link to="/account" className="btn btn-secondary">Go to account</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
