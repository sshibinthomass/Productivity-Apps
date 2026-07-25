import { useMemo, useState } from 'react'
import { openLinks, parseLinks } from './linkUtils.js'
import './MultiLinkOpenerPage.css'

const EXAMPLE_LINKS = `github.com
https://calendar.google.com
notion.so`

export default function MultiLinkOpenerPage() {
  const [text, setText] = useState('')
  const [result, setResult] = useState(null)

  const entryCount = useMemo(
    () => text.split(/\r?\n/).filter((entry) => entry.trim()).length,
    [text],
  )

  function handleSubmit(event) {
    event.preventDefault()
    const parsed = parseLinks(text)
    const opened = openLinks(parsed.validUrls)
    setResult({ ...parsed, ...opened })
  }

  function handleClear() {
    setText('')
    setResult(null)
  }

  return (
    <div className="link-opener-page">
      <header className="tool-intro">
        <div>
          <p className="eyebrow">Utility 01 / Browser workflow</p>
          <h1>Open the whole stack.</h1>
        </div>
        <p>
          Paste every destination you need. One click turns the list into a
          ready-to-use set of tabs.
        </p>
      </header>

      <section className="link-workbench">
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

        <form className="link-form" onSubmit={handleSubmit}>
          <div className="link-form__heading">
            <div>
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
      </section>
    </div>
  )
}

function ResultPanel({ result }) {
  if (!result) {
    return (
      <div className="result-panel result-panel--idle" aria-live="polite">
        <span className="result-panel__signal" aria-hidden="true" />
        <p>Ready for a link stack.</p>
      </div>
    )
  }

  const hasIssues =
    result.invalidEntries.length > 0 ||
    result.duplicateCount > 0 ||
    result.blockedCount > 0

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
            : `${result.openedCount} ${result.openedCount === 1 ? 'link' : 'links'} opened`}
        </strong>
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
                <li key={`${entry}-${index}`}>{entry}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
