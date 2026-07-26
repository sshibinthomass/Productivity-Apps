import { useMemo, useState } from 'react'
import { INVALID_REASON_MESSAGES, submitLinks } from './linkUtils.js'
import './MultiLinkOpenerPage.css'

const EXAMPLE_LINKS = `github.com
https://calendar.google.com
notion.so`

export default function MultiLinkOpenerPage() {
  const [text, setText] = useState('')
  const [delaySeconds, setDelaySeconds] = useState('0')
  const [result, setResult] = useState(null)

  const entryCount = useMemo(
    () => text.split(/\r?\n/).filter((entry) => entry.trim()).length,
    [text],
  )

  function handleSubmit(event) {
    event.preventDefault()
    const submission = submitLinks(text, delaySeconds)

    setDelaySeconds(String(submission.delaySeconds))
    setResult(submission)
  }

  function handleClear() {
    setText('')
    setResult(null)
  }

  return (
    <div className="link-opener-page">
      <header className="tool-intro">
        <p className="tool-breadcrumb">
          <span>Arvenilo Network</span>
          <span aria-hidden="true">/</span>
          <span>Multi Link Opener</span>
        </p>
        <div className="tool-intro__layout">
          <div>
            <p className="eyebrow">AVAILABLE NOW / BROWSER WORKFLOW</p>
            <h1>Open every link in one controlled pass.</h1>
          </div>
          <p>
            Paste every destination you need. Review the stack, choose the
            pacing, and open each valid link in its own tab.
          </p>
        </div>
      </header>

      <section className="link-workbench" aria-label="Link opening workspace">
        <form className="link-form" onSubmit={handleSubmit}>
          <div className="link-form__heading">
            <div>
              <p className="eyebrow">Link stack</p>
              <label htmlFor="link-list">Your links</label>
              <p>One link per line</p>
            </div>
            <output htmlFor="link-list" className="entry-count">
              <strong>{entryCount}</strong>{' '}
              {entryCount === 1 ? 'entry' : 'entries'}
            </output>
          </div>

          <textarea
            id="link-list"
            name="links"
            value={text}
            onChange={(event) => {
              setText(event.target.value)
              setResult(null)
            }}
            placeholder={EXAMPLE_LINKS}
            rows="12"
            spellCheck="false"
            autoCapitalize="none"
            autoCorrect="off"
          />

          <div className="delay-control">
            <div className="delay-control__copy">
              <label htmlFor="link-delay">Delay between links</label>
              <p id="link-delay-help">
                First link opens immediately. Waiting tabs stay blank until
                their turn.
              </p>
            </div>
            <div className="delay-control__input">
              <input
                id="link-delay"
                name="delay"
                type="number"
                min="0"
                max="60"
                step="1"
                value={delaySeconds}
                aria-describedby="link-delay-help"
                onChange={(event) => {
                  setDelaySeconds(event.target.value)
                  setResult(null)
                }}
              />
              <span>seconds</span>
            </div>
          </div>

          <div className="link-form__actions">
            <button
              className="button button--primary"
              type="submit"
              disabled={entryCount === 0}
            >
              Open links
              <span aria-hidden="true">↗</span>
            </button>
            <button
              className="button button--quiet"
              type="button"
              disabled={!text}
              onClick={handleClear}
            >
              Clear
            </button>
          </div>

          <ResultPanel result={result} />
        </form>

        <aside className="link-guide">
          <div className="link-guide__icon" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div>
            <p className="eyebrow">How it works</p>
            <ol className="link-guide__steps">
              <li>
                <span>01</span>
                Add one address per line.
              </li>
              <li>
                <span>02</span>
                Review the detected count.
              </li>
              <li>
                <span>03</span>
                Open every valid link.
              </li>
            </ol>
          </div>
          <p className="link-guide__note">
            Missing <code>https://</code>? We add it for you.
          </p>
        </aside>
      </section>
    </div>
  )
}

export function ResultPanel({ result }) {
  if (!result) {
    return (
      <div className="result-panel result-panel--idle" aria-live="polite">
        <span className="result-panel__signal" aria-hidden="true" />
        <p>Ready for a link stack.</p>
      </div>
    )
  }

  const hasIssues =
    result.limitError ||
    result.invalidEntries.length > 0 ||
    result.duplicateCount > 0 ||
    result.blockedCount > 0
  const isScheduled = result.delaySeconds > 0 && result.openedCount > 1

  return (
    <div
      className={`result-panel ${hasIssues ? 'result-panel--warning' : 'result-panel--success'}`}
      role="status"
      aria-live="polite"
    >
      <span className="result-panel__signal" aria-hidden="true" />
      <div>
        <strong>
          {result.openedCount === 0
            ? 'No links opened'
            : isScheduled
              ? `${result.openedCount} tabs scheduled`
              : `${result.openedCount} ${result.openedCount === 1 ? 'link' : 'links'} opened`}
        </strong>
        {result.limitError && <p className="limit-error">{result.limitError}</p>}
        {isScheduled && (
          <p>
            First link is loading now. The rest will load every{' '}
            {result.delaySeconds} seconds.
          </p>
        )}
        {result.blockedCount > 0 && (
          <p>
            Your browser blocked {result.blockedCount}{' '}
            {result.blockedCount === 1 ? 'tab' : 'tabs'}. Allow pop-ups for
            this site, then try again.
          </p>
        )}
        {result.duplicateCount > 0 && (
          <p>
            Skipped {result.duplicateCount}{' '}
            {result.duplicateCount === 1 ? 'duplicate' : 'duplicates'}.
          </p>
        )}
        {result.invalidEntries.length > 0 && (
          <div className="invalid-links">
            <p>
              Fix {result.invalidEntries.length}{' '}
              {result.invalidEntries.length === 1
                ? 'invalid entry'
                : 'invalid entries'}
              :
            </p>
            <ul>
              {result.invalidEntries.map((entry, index) => (
                <li key={`${entry.value}-${entry.reason}-${index}`}>
                  <code>{entry.value}</code>
                  <span>
                    {INVALID_REASON_MESSAGES[entry.reason] ??
                      INVALID_REASON_MESSAGES['invalid-url']}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {result.adjustedEntries.length > 0 && (
          <details className="adjusted-links">
            <summary>
              Adjusted {result.adjustedEntries.length}{' '}
              {result.adjustedEntries.length === 1 ? 'link' : 'links'}
            </summary>
            <ul>
              {result.adjustedEntries.map((entry, index) => (
                <li key={`${entry.original}-${entry.normalized}-${index}`}>
                  <code>{entry.original}</code>
                  <span className="adjusted-links__relationship">
                    changed to
                  </span>
                  <span aria-hidden="true">-&gt;</span>
                  <code>{entry.normalized}</code>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  )
}
