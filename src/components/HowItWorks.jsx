import './HowItWorks.css'

const steps = [
  {
    n: '01',
    title: 'You ask in plain text',
    body: '“Pull yesterday’s Slack screenshots and rename them by sender.” Type it the way you’d say it to a coworker.',
  },
  {
    n: '02',
    title: 'Deka reads the room',
    body: 'It looks at the apps you have open, the files in your context, and the last things you did. The plan is written before any click happens.',
  },
  {
    n: '03',
    title: 'It runs on your machine',
    body: 'Clicks, keystrokes, API calls — all executed locally with your existing logins. Nothing is shipped to a remote browser.',
  },
  {
    n: '04',
    title: 'Every flow gets faster',
    body: 'Successful runs are persisted as reusable workflows. The next time you ask, Deka skips the discovery and goes straight to the answer.',
  },
]

export default function HowItWorks() {
  return (
    <section id="how" className="how">
      <div className="container">
        <div className="section-head reveal">
          <span className="eyebrow"><span className="dot" />How it works</span>
          <h2>Four steps. One desktop. Zero glue scripts.</h2>
        </div>

        <ol className="how-steps">
          {steps.map((s, i) => (
            <li key={s.n} className="how-step reveal" style={{ transitionDelay: `${i * 80}ms` }}>
              <div className="how-num">{s.n}</div>
              <div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
