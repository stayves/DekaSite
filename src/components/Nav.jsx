import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import './Nav.css'

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const { pathname } = useLocation()
  const { user, loading, configured } = useAuth()
  const onLanding = pathname === '/'

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`nav ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="container nav-inner">
        <Link to="/" className="brand" aria-label="Deka home">
          <img src="/deka_logo_512.png" alt="" className="brand-logo" width="32" height="32" />
          <span>Deka</span>
        </Link>
        <nav className="nav-links" aria-label="Primary">
          <a href={onLanding ? '#features' : '/#features'}>Features</a>
          <a href={onLanding ? '#demos' : '/#demos'}>Demos</a>
          <a href={onLanding ? '#showcase' : '/#showcase'}>Showcase</a>
          <a href={onLanding ? '#how' : '/#how'}>How it works</a>
          <Link to="/pricing">Pricing</Link>
          <a href={onLanding ? '#download' : '/#download'}>Download</a>
        </nav>
        <div className="nav-cta">
          {configured && !loading && user ? (
            <Link to="/account" className="btn btn-secondary nav-download">Account</Link>
          ) : configured ? (
            <Link to="/login" className="btn btn-secondary nav-download">Sign in</Link>
          ) : (
            <a href={onLanding ? '#download' : '/#download'} className="btn btn-secondary nav-download">
              Download
            </a>
          )}
        </div>
      </div>
    </header>
  )
}
