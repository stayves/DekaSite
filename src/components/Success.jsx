import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getLatestWindowsInstallerUrl,
  getLatestMacInstallerUrl,
  detectMacArch,
  RELEASES_PAGE_URL,
  detectPlatform,
} from '../lib/release.js'
import MacInstallHelp from './MacInstallHelp.jsx'
import './Success.css'

const DEKA_PROTOCOL = 'deka://open'

export default function Success() {
  const [winDownload, setWinDownload] = useState(RELEASES_PAGE_URL)
  const [macDownload, setMacDownload] = useState(RELEASES_PAGE_URL)
  const platform = detectPlatform()

  useEffect(() => {
    let cancelled = false
    getLatestWindowsInstallerUrl()
      .then((url) => { if (!cancelled) setWinDownload(url) })
      .catch(() => {})
    detectMacArch().then((arch) => {
      getLatestMacInstallerUrl(arch)
        .then((url) => { if (!cancelled) setMacDownload(url) })
        .catch(() => {})
    })
    return () => { cancelled = true }
  }, [])

  const onOpenDeka = () => {
    window.location.href = DEKA_PROTOCOL
  }

  return (
    <section className="success">
      <div className="container success-inner">
        <div className="success-card reveal in">
          <div className="success-check" aria-hidden="true">
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
              <circle cx="22" cy="22" r="20" stroke="currentColor" strokeWidth="2" opacity="0.35" />
              <path d="M14 22.5l5.5 5.5L31 16" stroke="currentColor" strokeWidth="2.6"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <span className="eyebrow"><span className="dot" />Subscription active</span>
          <h1>Successful — welcome to Pro.</h1>
          <p className="success-sub">
            Your payment went through and your account is now on the Pro plan. Open Deka on your
            desktop to start using unlimited actions, long-term memory and every native integration.
          </p>

          <div className="success-actions">
            <button type="button" className="btn btn-primary" onClick={onOpenDeka}>
              Open Deka
            </button>
            <Link to="/account" className="btn btn-secondary">Go to account</Link>
          </div>

          <p className="success-fine">
            Don't have Deka installed yet?{' '}
            {platform === 'mac' ? (
              <>
                <a href={macDownload} download>Download for macOS</a>
                {' · '}
                <a href={winDownload} download>Windows</a>
              </>
            ) : (
              <>
                <a href={winDownload} download>Download for Windows</a>
                {' · '}
                <a href={macDownload} download>macOS</a>
              </>
            )}.
          </p>

          <MacInstallHelp />
        </div>
      </div>
    </section>
  )
}
