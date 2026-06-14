import { useEffect, useState } from 'react'
import {
  getLatestWindowsInstallerUrl,
  getLatestMacInstallerUrl,
  detectMacArch,
  RELEASES_PAGE_URL,
} from '../lib/release.js'
import MacInstallHelp from './MacInstallHelp.jsx'
import './CTA.css'

export default function CTA() {
  const [winDownload, setWinDownload] = useState(RELEASES_PAGE_URL)
  const [macDownload, setMacDownload] = useState(RELEASES_PAGE_URL)
  const [macIntelDownload, setMacIntelDownload] = useState(RELEASES_PAGE_URL)

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
    getLatestMacInstallerUrl('x64')
      .then((url) => { if (!cancelled) setMacIntelDownload(url) })
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
          <p>Start with a free trial. Download the installer, sign in once, and Deka starts mapping the apps you already use.</p>

          <div className="cta-actions">
            <a href={winDownload} className="btn btn-primary" download>
              Download for Windows
            </a>
            <a href={macDownload} className="btn btn-secondary" download>
              Download for macOS
            </a>
            <a
              href={macIntelDownload}
              className="btn btn-ghost btn-intel"
              download
              title="For Intel-based Macs (pre-2020)"
            >
              Intel Mac
            </a>
          </div>

          <p className="cta-fine">Windows 10/11 · macOS 12+ · Apple Silicon &amp; Intel · 64-bit</p>

          <MacInstallHelp />
        </div>
      </div>
    </section>
  )
}
