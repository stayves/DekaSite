import { useState } from 'react'
import './Demos.css'

// Drop the matching .mp4 (and optional .jpg poster) into /public/videos/ —
// the page picks them up automatically. While a file is missing, the row
// renders a styled placeholder so the layout stays intentional.
const demos = [
  {
    id: 'files-excel',
    eyebrow: 'Files & spreadsheets',
    title: 'Reads the file. Runs the spreadsheet.',
    body:
      'Hand Deka a folder on your desktop. It opens the right file, dedupes rows, groups by client, and exports a CSV — locally, with the Excel commands you already know.',
    chips: ['invoices.xlsx', 'Range.removeDuplicates', 'GroupBy → ClientName'],
    src: '/videos/demo-files-excel.mp4',
    poster: '/videos/demo-files-excel.jpg',
  },
  {
    id: 'workflows',
    eyebrow: 'Teach by example',
    title: 'Show it once. It copies your hands.',
    body:
      'Run a task by hand while Deka watches. It names each step, ties them to the tools that worked, and saves a reusable workflow you can fire later with one sentence.',
    chips: ['Watch', 'Name the steps', 'Replay on demand'],
    src: '/videos/demo-workflows.mp4',
    poster: '/videos/demo-workflows.jpg',
  },
  {
    id: 'context-mesh',
    eyebrow: 'Context Mesh',
    title: 'One memory across every app.',
    body:
      'Slack threads, Notion pages, Obsidian notes, Cursor files. Deka federates live state from each — no OCR, no indexing. Ask once; the right reference surfaces from every app at the same time.',
    chips: ['Slack', 'Notion', 'Obsidian', 'Cursor'],
    src: '/videos/demo-context-mesh.mp4',
    poster: '/videos/demo-context-mesh.jpg',
  },
]

export default function Demos() {
  return (
    <section id="demos" className="demos">
      <div className="container">
        <div className="section-head reveal">
          <span className="eyebrow"><span className="dot" />See it run</span>
          <h2>Three demos. Three things only Deka can do.</h2>
          <p>
            Recorded on a real laptop. Each clip is one prompt — typed in plain English — and
            what Deka does with it across the apps you already have open.
          </p>
        </div>

        <div className="demos-list">
          {demos.map((d, i) => (
            <DemoRow key={d.id} demo={d} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}

function DemoRow({ demo, index }) {
  const [errored, setErrored] = useState(false)
  const showVideo = Boolean(demo.src) && !errored

  return (
    <article
      id={`demo-${demo.id}`}
      className={`demo-row reveal ${index % 2 === 1 ? 'demo-row-flip' : ''}`}
      style={{ transitionDelay: `${index * 60}ms` }}
    >
      <div className="demo-video-wrap">
        <span className="demo-index">{String(index + 1).padStart(2, '0')}</span>
        {showVideo ? (
          <video
            className="demo-video"
            src={demo.src}
            poster={demo.poster || undefined}
            controls
            preload="metadata"
            playsInline
            onError={() => setErrored(true)}
            aria-label={`${demo.eyebrow} — ${demo.title}`}
          />
        ) : (
          <DemoPlaceholder label={demo.eyebrow} />
        )}
      </div>
      <div className="demo-copy">
        <span className="demo-eyebrow">{demo.eyebrow}</span>
        <h3>{demo.title}</h3>
        <p>{demo.body}</p>
        <div className="demo-chips">
          {demo.chips.map((c) => (
            <span key={c} className="demo-chip">{c}</span>
          ))}
        </div>
      </div>
    </article>
  )
}

function DemoPlaceholder({ label }) {
  return (
    <div className="demo-placeholder" role="img" aria-label={`${label} demo video — coming soon`}>
      <div className="demo-placeholder-grid" aria-hidden="true" />
      <div className="demo-placeholder-inner">
        <PlayIcon />
        <span className="demo-placeholder-label">{label}</span>
        <span className="demo-placeholder-sub">Demo coming soon</span>
      </div>
    </div>
  )
}

function PlayIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="1.4" opacity="0.45" />
      <path d="M10 8.5l5.5 3.5L10 15.5v-7z" fill="currentColor" />
    </svg>
  )
}
