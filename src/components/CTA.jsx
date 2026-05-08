import { useEffect, useState } from 'react'
import { getLatestWindowsInstallerUrl, RELEASES_PAGE_URL } from '../lib/release.js'
import './CTA.css'

export default function CTA() {
  const [winDownload, setWinDownload] = useState(RELEASES_PAGE_URL)

  useEffect(() => {
    let cancelled = false
    getLatestWindowsInstallerUrl()
      .then((url) => { if (!cancelled) setWinDownload(url) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  return (
    <section id="download" className="cta">
      <div className="container">
        <div className="cta-card reveal">
          <div className="cta-glow" aria-hidden="true" />
          <span className="eyebrow"><span className="dot" />Get started</span>
          <h2>Bring Deka onto your desktop.</h2>
          <p>Free during early access. Download the installer, sign in once, and Deka starts mapping the apps you already use.</p>

          <div className="cta-actions">
            <a href={winDownload} className="btn btn-primary" download>
              Download for Windows
            </a>
            <button type="button" className="btn btn-secondary coming-soon" aria-disabled="true">
              macOS <span className="badge">Soon</span>
            </button>
          </div>

          <p className="cta-fine">~120 MB · Windows 10 &amp; 11 · 64-bit</p>
        </div>
      </div>
    </section>
  )
}
