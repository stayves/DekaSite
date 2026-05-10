const RELEASES_REPO = 'stayves/DekaReleases'

export const RELEASES_PAGE_URL = `https://github.com/${RELEASES_REPO}/releases/latest`

const API_URL = `https://api.github.com/repos/${RELEASES_REPO}/releases/latest`
// Match either Deka-Setup-x.y.z.exe (current productName) or
// DekaAI-Setup-x.y.z.exe (legacy productName, kept for older releases).
const WIN_INSTALLER_PATTERN = /^Deka(?:AI)?-Setup-.*\.exe$/i
// Match any .dmg asset, but skip electron-builder sidecar files (.blockmap).
const MAC_INSTALLER_PATTERN = /\.dmg$/i

let cached

function fetchLatestRelease() {
  if (!cached) {
    cached = fetch(API_URL, { headers: { Accept: 'application/vnd.github+json' } })
      .then((res) => {
        if (!res.ok) throw new Error(`GitHub API ${res.status}`)
        return res.json()
      })
      .catch((err) => {
        cached = undefined
        throw err
      })
  }
  return cached
}

function pickAsset(release, predicate) {
  const assets = (release.assets || []).filter((a) => !/\.blockmap$/i.test(a.name))
  return assets.find(predicate) || null
}

export function getLatestWindowsInstallerUrl() {
  return fetchLatestRelease().then((release) => {
    const asset = pickAsset(release, (a) => WIN_INSTALLER_PATTERN.test(a.name))
    if (!asset) throw new Error('No Windows installer asset in latest release')
    return asset.browser_download_url
  })
}

// Picks the best DMG out of the latest release for the given arch.
// electron-builder naming when building both x64 and arm64:
//   Deka-x.y.z-arm64.dmg   ← Apple Silicon
//   Deka-x.y.z.dmg          ← Intel/x64 (no suffix because x64 is the default)
// When building a single arch or universal build, the no-suffix file is
// whatever was built. So "no suffix" doesn't reliably mean "universal".
//
// Priority (for `preferred='arm64'`, the default):
//   1. universal (suffix "-universal") — runs everywhere
//   2. arm64 — Apple Silicon native
//   3. anything else (no suffix or -x64) — Intel native, Rosetta on M-series
export function getLatestMacInstallerUrl(preferred = 'arm64') {
  return fetchLatestRelease().then((release) => {
    const dmgs = (release.assets || []).filter(
      (a) => MAC_INSTALLER_PATTERN.test(a.name) && !/\.blockmap$/i.test(a.name)
    )
    if (dmgs.length === 0) throw new Error('No macOS installer asset in latest release')

    const universal = dmgs.find((a) => /universal/i.test(a.name))
    const arm64 = dmgs.find((a) => /-arm64\.dmg$/i.test(a.name))
    const x64 =
      dmgs.find((a) => /-x64\.dmg$/i.test(a.name)) ||
      // electron-builder's multi-arch build leaves the x64 DMG without a suffix.
      dmgs.find((a) => !/-arm64\.dmg$/i.test(a.name) && !/universal/i.test(a.name))

    if (universal) return universal.browser_download_url
    if (preferred === 'x64' && x64) return x64.browser_download_url
    if (arm64) return arm64.browser_download_url
    if (x64) return x64.browser_download_url
    return dmgs[0].browser_download_url
  })
}

// Best-effort platform sniff for "show the right button first" UX. Returns
// 'mac' | 'win' | 'other'. Safe to call during render — uses navigator.
export function detectPlatform() {
  if (typeof navigator === 'undefined') return 'other'
  const ua = navigator.userAgent || ''
  const platform = navigator.platform || ''
  if (/Mac|iPhone|iPad|iPod/i.test(platform) || /Mac OS X/i.test(ua)) return 'mac'
  if (/Win/i.test(platform) || /Windows/i.test(ua)) return 'win'
  return 'other'
}

// Detect Mac architecture via the User-Agent Client Hints API (Chrome/Edge).
// Apple lies in the regular UA string — both Intel and Apple Silicon report
// "Intel Mac OS X" — so we have to ask through high-entropy hints. Safari and
// Firefox don't expose this; we default to 'arm64' there because Apple Silicon
// has been the only Mac sold since 2023 and is the majority of active devices.
//
// Returns 'arm64' | 'x64'. Always resolves; never throws.
export async function detectMacArch() {
  if (typeof navigator === 'undefined') return 'arm64'
  try {
    const data = navigator.userAgentData
    if (data && typeof data.getHighEntropyValues === 'function') {
      const hints = await data.getHighEntropyValues(['architecture'])
      if (hints?.architecture === 'x86') return 'x64'
      if (hints?.architecture === 'arm') return 'arm64'
    }
  } catch {
    /* hint denied or unsupported — fall through to default */
  }
  return 'arm64'
}
