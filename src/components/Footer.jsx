import { Link, useLocation } from 'react-router-dom'
import './Footer.css'

export default function Footer() {
  const { pathname } = useLocation()
  const onLanding = pathname === '/'
  const anchor = (id) => (onLanding ? `#${id}` : `/#${id}`)

  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <span className="brand-mark">Deka</span>
          <p>Desktop automation that runs where you work.</p>
        </div>

        <div className="footer-cols">
          <div>
            <h4>Product</h4>
            <a href={anchor('features')}>Features</a>
            <a href={anchor('showcase')}>Showcase</a>
            <a href={anchor('how')}>How it works</a>
            <Link to="/pricing">Pricing</Link>
            <a href={anchor('download')}>Download</a>
          </div>
          <div>
            <h4>Company</h4>
            <a href="mailto:hello@deka.app">Contact</a>
            <a href="#">Changelog</a>
            <a href="#">Privacy</a>
          </div>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} Deka. All rights reserved.</span>
        <span>Made on a desktop, for the desktop.</span>
      </div>
    </footer>
  )
}
