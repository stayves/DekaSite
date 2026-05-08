import './Coworker.css'

const pillars = [
  {
    label: 'Shared context',
    title: 'One context across every app.',
    body:
      'Deka follows your work as it moves — the doc you edited, the Slack thread you replied to, the file you just dropped on your desktop. Every app sees the same memory, so you never re-explain what you just did.',
    chips: ['Slack ↔ Notion', 'Cursor ↔ Linear', 'Figma ↔ Email'],
  },
  {
    label: 'A language layer',
    title: 'A language layer for your computer that any AI can understand.',
    body:
      'Every app on your machine speaks differently — buttons, menus, APIs, hotkeys. Deka turns all of it into one shared vocabulary. Once your desktop has a language, any AI agent can read it, reason about it, and act on it. Nothing on your computer stays opaque.',
    chips: ['One vocabulary, every app', 'Readable by any agent', 'Nothing stays opaque'],
  },
  {
    label: 'Knows your files',
    title: 'Reads the files you actually use.',
    body:
      'Spreadsheets on your desktop. Specs in your Documents folder. Code in your repo. Deka indexes the files you care about, with your permission, so when you say “the deck from Tuesday,” it already knows which one.',
    chips: ['Local index', 'Permissioned', 'Never leaves your machine'],
  },
  {
    label: 'AI coworker',
    title: 'Not a chatbot. A coworker.',
    body:
      'Deka plans, executes, and reports back — the way a teammate would. It asks before doing risky things, remembers what worked, and gets a little better at your job every time you run it.',
    chips: ['Plans first', 'Asks before risky actions', 'Improves with each run'],
  },
]

export default function Coworker() {
  return (
    <section id="coworker" className="coworker">
      <div className="container">
        <div className="section-head reveal">
          <span className="eyebrow"><span className="dot" />Built to work with you</span>
          <h2>A coworker that <span className="text-gradient">lives in your apps</span>.</h2>
          <p>
            Deka is not another chat window. It is the connective tissue between you, your files,
            and the AI agents already inside the apps you use — sharing one context, speaking one
            language.
          </p>
        </div>

        <div className="coworker-grid">
          {pillars.map((p, i) => (
            <article key={p.label} className="coworker-card reveal" style={{ transitionDelay: `${i * 80}ms` }}>
              <span className="coworker-label">{p.label}</span>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
              <div className="coworker-chips">
                {p.chips.map((c) => (
                  <span key={c} className="coworker-chip">{c}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
