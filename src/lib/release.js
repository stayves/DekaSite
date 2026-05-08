const RELEASES_REPO = 'stayves/DekaReleases'

export const RELEASES_PAGE_URL = `https://github.com/${RELEASES_REPO}/releases/latest`

const API_URL = `https://api.github.com/repos/${RELEASES_REPO}/releases/latest`
const WIN_INSTALLER_PATTERN = /^DekaAI-Setup-.*\.exe$/i

let cached

export function getLatestWindowsInstallerUrl() {
  if (!cached) {
    cached = fetch(API_URL, { headers: { Accept: 'application/vnd.github+json' } })
      .then((res) => {
        if (!res.ok) throw new Error(`GitHub API ${res.status}`)
        return res.json()
      })
      .then((release) => {
        const asset = (release.assets || []).find((a) => WIN_INSTALLER_PATTERN.test(a.name))
        if (!asset) throw new Error('No Windows installer asset in latest release')
        return asset.browser_download_url
      })
      .catch((err) => {
        cached = undefined
        throw err
      })
  }
  return cached
}
