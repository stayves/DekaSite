import './Features.css'

const features = [
  {
    title: 'Drives every app you have',
    body: 'Slack, Discord, VS Code, Excel, Figma, your internal tools — Deka picks up new apps the moment you open them. No plugins, no integrations to install.',
    icon: <BoltIcon />,
  },
  {
    title: 'Knows your context',
    body: 'Deka watches the apps and files you work in and builds a private map of your workflow. The next time you ask, it already knows where the file lives.',
    icon: <BrainIcon />,
  },
  {
    title: 'Local-first',
    body: 'The agent runs on your machine. Your screen, your files, and your context never leave the laptop unless you say so.',
    icon: <ShieldIcon />,
  },
  {
    title: 'Learns as you work',
    body: 'When Deka figures out a new flow, it remembers it. The second run is faster than the first — and the tenth happens without asking.',
    icon: <LoopIcon />,
  },
  {
    title: 'Native text in, action out',
    body: 'Talk to Deka the way you talk to a teammate. It plans, then executes — clicking, typing, calling APIs the same way you would.',
    icon: <ChatIcon />,
  },
  {
    title: 'Inspectable, every step',
    body: 'Every action shows the tool it used and the payload it sent. Nothing hidden, nothing magic.',
    icon: <EyeIcon />,
  },
]

export default function Features() {
  return (
    <section id="features" className="features">
      <div className="container">
        <div className="section-head reveal">
          <span className="eyebrow"><span className="dot" />Why Deka</span>
          <h2>An automation layer for your whole desktop.</h2>
          <p>Built for the work that lives outside your browser. Deka treats every app the same way you do — by looking at it, clicking on it, and remembering what worked.</p>
        </div>

        <div className="features-grid">
          {features.map((f, i) => (
            <article key={i} className="feature-card reveal">
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function BoltIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}
function BrainIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 4a3 3 0 0 0-3 3v0a3 3 0 0 0-2 5 3 3 0 0 0 2 5v0a3 3 0 0 0 6 0V4a3 3 0 0 0-3 0zM15 4a3 3 0 0 1 3 3v0a3 3 0 0 1 2 5 3 3 0 0 1-2 5v0a3 3 0 0 1-6 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}
function LoopIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 12a8 8 0 0 1 13.66-5.66L20 8M20 4v4h-4M20 12a8 8 0 0 1-13.66 5.66L4 16M4 20v-4h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 5h16v11H8l-4 4V5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}
function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}
