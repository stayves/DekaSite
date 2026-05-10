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

// Picks the best DMG out of the latest release. electron-builder may emit
// arch-specific files (`-arm64.dmg`, `-x64.dmg`) and/or a universal one
// (`-universal.dmg` or no suffix). Prefer the universal/no-suffix build,
// then Apple-Silicon, then Intel — falls back to whatever DMG is there.
export function getLatestMacInstallerUrl() {
  return fetchLatestRelease().then((release) => {
    const dmgs = (release.assets || []).filter(
      (a) => MAC_INSTALLER_PATTERN.test(a.name) && !/\.blockmap$/i.test(a.name)
    )
    if (dmgs.length === 0) throw new Error('No macOS installer asset in latest release')
    const universal = dmgs.find((a) => /universal/i.test(a.name))
    if (universal) return universal.browser_download_url
    const noArch = dmgs.find((a) => !/-arm64\.dmg$/i.test(a.name) && !/-x64\.dmg$/i.test(a.name))
    if (noArch) return noArch.browser_download_url
    const arm64 = dmgs.find((a) => /-arm64\.dmg$/i.test(a.name))
    if (arm64) return arm64.browser_download_url
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
