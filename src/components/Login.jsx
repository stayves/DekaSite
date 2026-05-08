import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase.js'
import { useAuth } from '../lib/auth.jsx'
import './Login.css'

const MODES = {
  password: 'Email & password',
  magic: 'Magic link',
}

export default function Login() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next') || '/account'

  const [mode, setMode] = useState('password')
  const [variant, setVariant] = useState('signin') // signin | signup (password mode only)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)

  useEffect(() => {
    if (!loading && user) navigate(next, { replace: true })
  }, [loading, user, next, navigate])

  const onPasswordSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    if (!supabase) return setError('Supabase is not configured. Add env vars and restart dev server.')
    setBusy(true)
    try {
      const fn = variant === 'signin' ? supabase.auth.signInWithPassword : supabase.auth.signUp
      const { error: err } = await fn.call(supabase.auth, {
        email,
        password,
        options:
          variant === 'signup'
            ? { emailRedirectTo: `${window.location.origin}${next}` }
            : undefined,
      })
      if (err) throw err
      if (variant === 'signup') {
        setInfo('Check your email to confirm your account.')
      }
      // signin success is handled by the auth listener → useEffect above redirects
    } catch (err) {
      setError(err.message || 'Could not sign in.')
    } finally {
      setBusy(false)
    }
  }

  const onMagicSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    if (!supabase) return setError('Supabase is not configured. Add env vars and restart dev server.')
    setBusy(true)
    try {
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}${next}` },
      })
      if (err) throw err
      setInfo(`Magic link sent to ${email}. Open it on this device to sign in.`)
    } catch (err) {
      setError(err.message || 'Could not send magic link.')
    } finally {
      setBusy(false)
    }
  }

  const onOAuth = async (provider) => {
    setError(null)
    if (!supabase) return setError('Supabase is not configured. Add env vars and restart dev server.')
    setBusy(true)
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}${next}` },
      })
      if (err) throw err
    } catch (err) {
      setError(err.message || `Could not start ${provider} sign-in.`)
      setBusy(false)
    }
  }

  return (
    <section className="auth">
      <div className="container auth-inner">
        <Link to="/" className="auth-brand">
          <img src="/deka_logo_512.png" alt="" width="40" height="40" />
          <span>Deka</span>
        </Link>

        <div className="auth-card reveal in">
          <h1>Sign in to Deka</h1>
          <p className="auth-sub">Pick whichever way is easiest for you.</p>

          {!isSupabaseConfigured && (
            <div className="auth-banner warn">
              Supabase env vars are missing. Copy <code>.env.example</code> to <code>.env.local</code>{' '}
              and fill in your Supabase URL + anon key.
            </div>
          )}

          <div className="auth-oauth">
            <button
              type="button"
              className="btn btn-secondary auth-oauth-btn"
              onClick={() => onOAuth('google')}
              disabled={busy || !isSupabaseConfigured}
            >
              <GoogleIcon /> Continue with Google
            </button>
            <button
              type="button"
              className="btn btn-secondary auth-oauth-btn"
              onClick={() => onOAuth('github')}
              disabled={busy || !isSupabaseConfigured}
            >
              <GithubIcon /> Continue with GitHub
            </button>
          </div>

          <div className="auth-divider"><span>or</span></div>

          <div className="auth-tabs" role="tablist">
            {Object.entries(MODES).map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={mode === id}
                className={`auth-tab ${mode === id ? 'is-active' : ''}`}
                onClick={() => {
                  setMode(id)
                  setError(null)
                  setInfo(null)
                }}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>

          {mode === 'password' ? (
            <form className="auth-form" onSubmit={onPasswordSubmit}>
              <label className="auth-field">
                <span>Email</span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                />
              </label>
              <label className="auth-field">
                <span>Password</span>
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete={variant === 'signin' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                />
              </label>
              <button
                type="submit"
                className="btn btn-primary auth-submit"
                disabled={busy || !isSupabaseConfigured}
              >
                {busy ? 'Working…' : variant === 'signin' ? 'Sign in' : 'Create account'}
              </button>
              <p className="auth-toggle">
                {variant === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
                <button
                  type="button"
                  className="auth-link"
                  onClick={() => {
                    setVariant(variant === 'signin' ? 'signup' : 'signin')
                    setError(null)
                    setInfo(null)
                  }}
                >
                  {variant === 'signin' ? 'Create one' : 'Sign in'}
                </button>
              </p>
            </form>
          ) : (
            <form className="auth-form" onSubmit={onMagicSubmit}>
              <label className="auth-field">
                <span>Email</span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                />
              </label>
              <button
                type="submit"
                className="btn btn-primary auth-submit"
                disabled={busy || !isSupabaseConfigured}
              >
                {busy ? 'Sending…' : 'Send magic link'}
              </button>
              <p className="auth-toggle">
                We'll email you a one-time link. No password needed.
              </p>
            </form>
          )}

          {error && <div className="auth-banner error">{error}</div>}
          {info && <div className="auth-banner info">{info}</div>}
        </div>

        <p className="auth-foot">
          By signing in you agree to Deka's{' '}
          <a href="#terms">Terms</a> and <a href="#privacy">Privacy Policy</a>.
        </p>
      </div>
    </section>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#EA4335" d="M9 3.48c1.69 0 2.83.73 3.48 1.34l2.54-2.48C13.46 1 11.43 0 9 0 5.48 0 2.44 2.02.96 4.96l2.91 2.26C4.6 5.05 6.62 3.48 9 3.48z"/>
      <path fill="#34A853" d="M17.64 9.2c0-.74-.06-1.28-.19-1.84H9v3.34h4.96c-.1.83-.64 2.08-1.84 2.92l2.84 2.2c1.7-1.57 2.68-3.88 2.68-6.62z"/>
      <path fill="#4A90E2" d="M3.88 10.78A5.54 5.54 0 0 1 3.58 9c0-.62.11-1.22.29-1.78L.96 4.96A8.99 8.99 0 0 0 0 9c0 1.45.35 2.82.96 4.04l2.92-2.26z"/>
      <path fill="#FBBC05" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.84-2.2c-.76.53-1.78.9-3.12.9-2.38 0-4.4-1.57-5.12-3.74L.97 13.04C2.45 15.98 5.48 18 9 18z"/>
    </svg>
  )
}

function GithubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38v-1.34c-2.22.48-2.69-1.07-2.69-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.05-.49.05-.49.81.06 1.23.83 1.23.83.72 1.23 1.88.87 2.34.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.94.29.25.54.74.54 1.49v2.21c0 .21.15.46.55.38A8 8 0 0 0 8 0z"/>
    </svg>
  )
}
