import { useState } from 'react'
import { detectPlatform } from '../lib/release.js'
import './MacInstallHelp.css'

const TERMINAL_CMD = 'xattr -cr /Applications/Deka.app'

// First-launch instructions for macOS users. Deka isn't yet signed with an
// Apple Developer cert, so Gatekeeper blocks the first open with
// "Deka cannot be opened because the developer cannot be verified."
// Mac users see a collapsed disclosure under their download button; Windows
// users (and unknown platforms) see nothing.
//
// Pass `alwaysShow` to render it regardless of platform (e.g. on a dedicated
// help page where Windows users might be helping a Mac friend).
export default function MacInstallHelp({ alwaysShow = false }) {
  const platform = detectPlatform()
  const [copied, setCopied] = useState(false)

  if (!alwaysShow && platform !== 'mac') return null

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(TERMINAL_CMD)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked — user can copy manually */
    }
  }

  return (
    <details className="mac-install-help">
      <summary>
        <span className="mac-install-help-icon" aria-hidden="true">ⓘ</span>
        First time opening Deka on macOS? Read this
      </summary>
      <div className="mac-install-help-body">
        <p>
          Deka isn't yet signed with an Apple Developer certificate, so the first
          launch shows <em>"Deka cannot be opened because the developer cannot be
          verified."</em> One-time fix — pick whichever path you prefer:
        </p>

        <p className="mac-install-help-step"><strong>Fastest — one Terminal command:</strong></p>
        <div className="mac-install-help-code">
          <code>{TERMINAL_CMD}</code>
          <button
            type="button"
            className="mac-install-help-copy"
            onClick={onCopy}
            aria-label="Copy command"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <p className="mac-install-help-foot">
          Open Terminal (⌘ + Space → "Terminal" → Enter), paste, hit Return.
          Then double-click Deka.
        </p>

        <p className="mac-install-help-step"><strong>No Terminal — System Settings:</strong></p>
        <ol>
          <li>Double-click <code>Deka.app</code> → click <strong>Done</strong> on the warning.</li>
          <li>Open <strong>System Settings → Privacy &amp; Security</strong>.</li>
          <li>Scroll down to <em>"Deka was blocked from use…"</em> → click <strong>Open Anyway</strong>.</li>
          <li>Enter your Mac password.</li>
        </ol>
        <p className="mac-install-help-foot">
          On macOS Sequoia (15+), the <em>Open Anyway</em> button only appears for
          a few minutes after a fresh block — if it's gone, double-click Deka
          again to bring it back.
        </p>
      </div>
    </details>
  )
}
