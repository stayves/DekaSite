import { useEffect, useState } from 'react'
import {
  getLatestWindowsInstallerUrl,
  getLatestMacInstallerUrl,
  RELEASES_PAGE_URL,
} from '../lib/release.js'
import MacInstallHelp from './MacInstallHelp.jsx'
import './Hero.css'

export default function Hero() {
  const [winDownload, setWinDownload] = useState(RELEASES_PAGE_URL)
  const [macDownload, setMacDownload] = useState(RELEASES_PAGE_URL)

  useEffect(() => {
    let cancelled = false
    getLatestWindowsInstallerUrl()
      .then((url) => { if (!cancelled) setWinDownload(url) })
      .catch(() => {})
    getLatestMacInstallerUrl()
      .then((url) => { if (!cancelled) setMacDownload(url) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  return (
    <section id="top" className="hero">
      <div className="container hero-inner">
        <img src="/deka_logo_512.png" alt="Deka" className="hero-logo reveal" width="96" height="96" />
        <span className="eyebrow reveal"><span className="dot" />Now in early access</span>
        <h1 className="reveal">
          Your personal <span className="text-gradient">AI coworker</span>, on your desktop.
        </h1>
        <p className="hero-sub reveal">
          Deka connects your context across every app you open, learns the files you work with, and
          speaks a shared language with the AI agent inside each one. Less switching. Less copy-paste.
          More work that just gets done.
        </p>

        <div className="hero-actions reveal">
          <a href={winDownload} className="btn btn-primary" download>
            <WindowsIcon /> Download for Windows
          </a>
          <a href={macDownload} className="btn btn-secondary" download>
            <AppleIcon /> Download for macOS
          </a>
          <a
            href="https://calendly.com/atogambayev/deka-onboarding"
            className="btn btn-ghost"
            target="_blank"
            rel="noopener noreferrer"
          >
            <CalendarIcon /> Talk to a founder
          </a>
        </div>

        <div className="hero-meta reveal">
          <span><CheckIcon /> Runs locally on your machine</span>
          <span><CheckIcon /> Free during early access</span>
          <span><CheckIcon /> Windows 10/11 &amp; macOS</span>
        </div>

        <MacInstallHelp />


        <div className="hero-visual reveal" aria-hidden="true">
          <Terminal />
        </div>
      </div>
    </section>
  )
}

function WindowsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M0 2.2L6.5 1.3v6.2H0V2.2zm0 11.6V8.5h6.5v6.2L0 13.8zM7.5 1.2L16 0v7.5H7.5V1.2zM7.5 8.5H16V16l-8.5-1.2V8.5z" />
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M11.6 8.45c-.02-2.05 1.67-3.04 1.75-3.09-.96-1.4-2.45-1.6-2.97-1.62-1.27-.13-2.47.74-3.11.74-.66 0-1.64-.72-2.7-.7C3.2 3.8 1.92 4.6 1.21 5.85c-1.43 2.48-.36 6.15 1.03 8.16.69.99 1.5 2.1 2.57 2.06 1.04-.04 1.43-.66 2.69-.66 1.25 0 1.6.66 2.7.64 1.12-.02 1.82-1 2.5-2 .79-1.16 1.11-2.28 1.13-2.34-.03-.01-2.16-.83-2.18-3.27zM9.7 2.4c.57-.7.96-1.66.85-2.6-.83.04-1.83.55-2.42 1.24-.53.62-1 1.61-.87 2.55.92.07 1.86-.47 2.44-1.19z" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2 7.5l3 3 7-7" stroke="#9c83a6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="3.5" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 7h12M5.5 1.5v3M10.5 1.5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function Terminal() {
  return (
    <div className="terminal">
      <div className="terminal-bar">
        <span className="dot red" />
        <span className="dot yellow" />
        <span className="dot green" />
        <span className="terminal-title">deka — local agent</span>
      </div>
      <div className="terminal-body">
        <div className="line">
          <span className="prompt">you</span>
          <span className="text">Pull yesterday's screenshots from Slack and rename them by sender.</span>
        </div>
        <div className="line">
          <span className="prompt deka">deka</span>
          <span className="text">
            Found 14 images in #design. Renamed to <code>2026-05-06_arman_*.png</code> →
            <span className="cursor" />
          </span>
        </div>
        <div className="line subtle">
          <span className="badge-mini">tool</span> <code>observe_page → click → save_learned_command</code>
        </div>
      </div>
    </div>
  )
}
