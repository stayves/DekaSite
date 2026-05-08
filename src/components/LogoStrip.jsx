import './LogoStrip.css'

const apps = [
  { name: 'Slack', src: '/slack.png' },
  { name: 'Discord', src: '/discord.png' },
  { name: 'Notion', src: '/notion.png' },
  { name: 'Figma', src: '/figma.png' },
  { name: 'Cursor', src: '/cursor.png' },
  { name: 'Antigravity', src: '/antigravity.png' },
  { name: 'Excel', src: '/excel.png' },
  { name: 'Chrome', src: '/chrome.png' },
  { name: 'Obsidian', src: '/obsidian.png' },
  { name: 'AutoCAD', src: '/autocad.png' },
]

export default function LogoStrip() {
  return (
    <section className="strip" aria-label="Apps Deka can drive">
      <div className="container">
        <div className="strip-head reveal">
          <h2 className="strip-title">
            Connects context across <span className="text-gradient">any app you use</span>.
          </h2>
          <p className="strip-sub">
            Slack, Excel, Figma, Cursor, Notion, your CAD software — Deka picks up new apps the
            moment you open them. No plugins, no integrations to wire up. If it runs on your
            desktop, Deka can work inside it.
          </p>
        </div>

        <div className="strip-track reveal">
          <div className="strip-row">
            {apps.concat(apps).map((app, i) => (
              <div key={i} className="strip-item" title={app.name}>
                <img src={app.src} alt={app.name} loading="lazy" />
              </div>
            ))}
          </div>
        </div>

        <p className="strip-foot reveal">
          …and every other app you have. <span>Deka learns the ones it doesn’t know yet.</span>
        </p>
      </div>
    </section>
  )
}
