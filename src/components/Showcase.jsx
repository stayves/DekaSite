import { useState } from 'react'
import './Showcase.css'

const tabs = [
  {
    label: 'Triage Slack',
    prompt: 'Skim my unread DMs from yesterday and draft replies. Wait for me to approve before sending.',
    steps: [
      { tool: 'observe_page', detail: 'Slack → DMs panel' },
      { tool: 'get_dom_outline', detail: 'Pulled 27 unread threads' },
      { tool: 'read_redux_state', detail: 'Filtered to 2026-05-06' },
      { tool: 'type_text', detail: '6 drafts saved · awaiting your review' },
    ],
  },
  {
    label: 'Clean Excel',
    prompt: "Take last week's invoices.xlsx, dedupe rows, and export a CSV grouped by client.",
    steps: [
      { tool: 'click', detail: 'Open invoices.xlsx in Excel Online' },
      { tool: 'call_api', detail: 'Range.removeDuplicates(A:F)' },
      { tool: 'run_js', detail: 'GroupBy → ClientName' },
      { tool: 'save_learned_command', detail: 'Persisted “dedupe + group” flow' },
    ],
  },
  {
    label: 'Ship a PR',
    prompt: 'Open the failing PR in Cursor, fix the type error in auth.ts, push, and comment on the GitHub thread.',
    steps: [
      { tool: 'switch_context', detail: 'Cursor → src/auth.ts:42' },
      { tool: 'type_text', detail: 'Patched return type · 1 line' },
      { tool: 'press_key', detail: 'Ctrl+Shift+G → push' },
      { tool: 'call_api', detail: 'POST /repos/.../comments → done' },
    ],
  },
]

export default function Showcase() {
  const [active, setActive] = useState(0)
  const t = tabs[active]
  return (
    <section id="showcase" className="showcase">
      <div className="container">
        <div className="section-head reveal">
          <span className="eyebrow"><span className="dot" />See it in motion</span>
          <h2>One sentence in. A finished task out.</h2>
          <p>Pick a workflow. Deka plans the steps, runs them on your machine, and shows its work as it goes.</p>
        </div>

        <div className="showcase-card reveal">
          <div className="showcase-tabs" role="tablist">
            {tabs.map((tab, i) => (
              <button
                key={tab.label}
                role="tab"
                aria-selected={i === active}
                className={`showcase-tab ${i === active ? 'is-active' : ''}`}
                onClick={() => setActive(i)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="showcase-body">
            <div className="showcase-prompt">
              <span className="prompt-label">You</span>
              <p>{t.prompt}</p>
            </div>

            <div className="showcase-steps">
              {t.steps.map((s, i) => (
                <div key={i} className="step" style={{ animationDelay: `${i * 90}ms` }}>
                  <span className="step-num">{String(i + 1).padStart(2, '0')}</span>
                  <code className="step-tool">{s.tool}</code>
                  <span className="step-detail">{s.detail}</span>
                </div>
              ))}
              <div className="step done">
                <span className="check">✓</span>
                <span className="step-detail">Completed in 12.4s · saved as a reusable workflow.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
