import { useEffect, useRef, useState } from 'react'
import { downloadJson } from './downloadJson.js'
import { JSON_SAMPLE, parseJson, repairJson } from './jsonUtils.js'
import './JsonFormatterPage.css'

function documentStats(text) {
  if (!text) {
    return { lines: 0, characters: 0 }
  }

  return {
    lines: text.split('\n').length,
    characters: text.length,
  }
}

function EditorHeader({ eyebrow, title, description, stats }) {
  return (
    <div className="json-editor__header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <span className="json-editor__stats" aria-label={`${stats.lines} lines`}>
        {stats.lines} {stats.lines === 1 ? 'line' : 'lines'}
        <span aria-hidden="true"> / </span>
        {stats.characters} chars
      </span>
    </div>
  )
}

function ValidationStatus({ validation }) {
  const state =
    validation.status === 'valid'
      ? 'valid'
      : validation.status === 'invalid'
        ? 'invalid'
        : 'ready'
  const label =
    state === 'valid'
      ? 'Valid JSON'
      : state === 'invalid'
        ? 'Invalid JSON'
        : 'Ready for JSON'

  return (
    <div
      className={`json-status json-status--${state}`}
      role="status"
      aria-live="polite"
    >
      <span className="json-status__signal" aria-hidden="true" />
      <div>
        <strong>{label}</strong>
        {validation.error ? (
          <>
            <span>
              Line {validation.error.line}, column {validation.error.column}
            </span>
            <p>{validation.error.message}</p>
          </>
        ) : (
          <p>
            {state === 'valid'
              ? 'Both editors are synchronized.'
              : 'Paste JSON or load the sample to begin.'}
          </p>
        )}
      </div>
    </div>
  )
}

function RepairReport({ report }) {
  if (!report) {
    return null
  }

  if (!report.success) {
    return (
      <div className="json-repair-report json-repair-report--error" role="alert">
        <strong>Still needs attention</strong>
        <p>
          The remaining syntax is ambiguous. Your original JSON was preserved.
        </p>
      </div>
    )
  }

  const repairCount = report.repairs.length
  const modeLabel = report.mode === 'deep' ? 'deep' : 'safe'

  return (
    <div className="json-repair-report" role="status">
      <div>
        <strong>
          {repairCount} {modeLabel} {repairCount === 1 ? 'fix' : 'fixes'} applied
        </strong>
        <span>Review what changed</span>
      </div>
      {repairCount > 0 ? (
        <ul>
          {report.repairs.map((repair) => (
            <li key={repair.code}>{repair.message}</li>
          ))}
        </ul>
      ) : (
        <p>The document was already valid, so only formatting changed.</p>
      )}
    </div>
  )
}

function FormattedEditor({
  id,
  label,
  value,
  onChange,
  onFocus,
  className = '',
}) {
  return (
    <textarea
      id={id}
      className={className}
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onFocus={onFocus}
      placeholder={'{\n  "formatted": true\n}'}
      spellCheck="false"
      autoCapitalize="none"
      autoCorrect="off"
    />
  )
}

export default function JsonFormatterPage({ downloadFile = downloadJson }) {
  const [sourceText, setSourceText] = useState('')
  const [formattedText, setFormattedText] = useState('')
  const [indent, setIndent] = useState(2)
  const [validation, setValidation] = useState(() => parseJson(''))
  const [lastValidValue, setLastValidValue] = useState(null)
  const [hasLastValidValue, setHasLastValidValue] = useState(false)
  const [activeEditor, setActiveEditor] = useState('input')
  const [repairReport, setRepairReport] = useState(null)
  const [copyFeedback, setCopyFeedback] = useState('')
  const [isFullScreen, setIsFullScreen] = useState(false)
  const fullScreenTriggerRef = useRef(null)

  const sourceStats = documentStats(sourceText)
  const formattedStats = documentStats(formattedText)
  const canCopy = validation.status === 'valid' && Boolean(formattedText)
  const canRepair = validation.status === 'invalid' && Boolean(sourceText)

  useEffect(() => {
    if (!isFullScreen) {
      return undefined
    }

    function handleEscape(event) {
      if (event.key !== 'Escape') {
        return
      }

      setIsFullScreen(false)
      setTimeout(() => fullScreenTriggerRef.current?.focus(), 0)
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isFullScreen])

  function resetFeedback() {
    setRepairReport(null)
    setCopyFeedback('')
  }

  function acceptValidResult(result) {
    setValidation(result)
    setLastValidValue(result.value)
    setHasLastValidValue(true)
  }

  function handleSourceChange(value) {
    const result = parseJson(value, indent)
    setSourceText(value)
    setValidation(result)
    resetFeedback()

    if (result.status === 'valid') {
      setFormattedText(result.formatted)
      setLastValidValue(result.value)
      setHasLastValidValue(true)
    } else if (result.status === 'empty') {
      setFormattedText('')
      setLastValidValue(null)
      setHasLastValidValue(false)
    }
  }

  function handleFormattedChange(value) {
    const result = parseJson(value, indent)
    setFormattedText(value)
    setSourceText(value)
    setValidation(result)
    resetFeedback()

    if (result.status === 'valid') {
      setLastValidValue(result.value)
      setHasLastValidValue(true)
    } else if (result.status === 'empty') {
      setLastValidValue(null)
      setHasLastValidValue(false)
    }
  }

  function handleRepair(mode) {
    const result = repairJson(sourceText, mode, indent)

    setRepairReport({ ...result, mode })
    setCopyFeedback('')

    if (result.success) {
      const parsed = parseJson(result.text, indent)
      setSourceText(result.text)
      setFormattedText(result.text)
      acceptValidResult(parsed)
    } else {
      setValidation({
        status: 'invalid',
        value: null,
        formatted: '',
        error: result.error,
      })
    }
  }

  function handleIndentChange(value) {
    const nextIndent = Number(value)
    setIndent(nextIndent)
    setCopyFeedback('')

    if (hasLastValidValue) {
      setFormattedText(JSON.stringify(lastValidValue, null, nextIndent))
    }
  }

  function handleSample() {
    const result = parseJson(JSON_SAMPLE, indent)
    setSourceText(JSON_SAMPLE)
    setFormattedText(result.formatted)
    setRepairReport(null)
    setCopyFeedback('')
    acceptValidResult(result)
  }

  function handleClear() {
    setSourceText('')
    setFormattedText('')
    setValidation(parseJson(''))
    setLastValidValue(null)
    setHasLastValidValue(false)
    setRepairReport(null)
    setCopyFeedback('')
  }

  async function handleCopy() {
    if (!canCopy) {
      return
    }

    try {
      await navigator.clipboard.writeText(formattedText)
      setCopyFeedback('JSON copied')
    } catch {
      setCopyFeedback('Copy failed. Select the JSON and copy it.')
    }
  }

  function handleDownload() {
    if (!canCopy) {
      return
    }

    try {
      downloadFile(formattedText)
      setCopyFeedback('JSON downloaded')
    } catch {
      setCopyFeedback(
        'Download failed. Copy the JSON and save it manually.',
      )
    }
  }

  function closeFullScreen() {
    setIsFullScreen(false)
    setTimeout(() => fullScreenTriggerRef.current?.focus(), 0)
  }

  return (
    <div className="json-formatter-page">
      <header className="json-intro">
        <p className="tool-breadcrumb">
          <span>Arvenilo Network</span>
          <span aria-hidden="true">/</span>
          <span>JSON Formatter</span>
        </p>
        <div className="json-intro__layout">
          <div>
            <p className="eyebrow">AVAILABLE NOW / DEVELOPER UTILITY</p>
            <h1>Repair the syntax. Keep the structure.</h1>
          </div>
          <p>
            Find the exact break, choose how much to repair, and leave with
            clean JSON you can trust.
          </p>
        </div>
      </header>

      <section
        className="json-workbench"
        aria-label="JSON formatting workspace"
      >
        <div className="json-workbench__toolbar">
          <div className="json-workbench__repair-actions">
            <button
              className="json-action json-action--safe"
              type="button"
              disabled={!canRepair}
              onClick={() => handleRepair('safe')}
            >
              <span aria-hidden="true">✓</span>
              Safe fix
            </button>
            <button
              className="json-action json-action--deep"
              type="button"
              disabled={!canRepair}
              onClick={() => handleRepair('deep')}
            >
              <span aria-hidden="true">✦</span>
              Deep fix
            </button>
          </div>

          <div className="json-workbench__document-actions">
            <label className="json-indent-control">
              <span>Indentation</span>
              <select
                aria-label="Indentation"
                value={indent}
                onChange={(event) => handleIndentChange(event.target.value)}
              >
                <option value="2">2 spaces</option>
                <option value="4">4 spaces</option>
              </select>
            </label>
            <button
              className="json-action json-action--quiet"
              type="button"
              onClick={handleSample}
            >
              Load sample
            </button>
            <button
              className="json-action json-action--quiet"
              type="button"
              disabled={!sourceText && !formattedText}
              onClick={handleClear}
            >
              Clear
            </button>
          </div>
        </div>

        <div className="json-editors">
          <article
            className={`json-editor ${activeEditor === 'input' ? 'json-editor--active' : ''} ${validation.status === 'invalid' ? 'json-editor--invalid' : ''}`}
          >
            <EditorHeader
              eyebrow="Source / 01"
              title="Input JSON"
              description="Paste valid JSON or syntax that needs repair."
              stats={sourceStats}
            />
            <textarea
              id="json-source"
              aria-label="Input JSON"
              value={sourceText}
              onChange={(event) => handleSourceChange(event.target.value)}
              onFocus={() => setActiveEditor('input')}
              placeholder={'{\n  "paste": "your JSON here"\n}'}
              spellCheck="false"
              autoCapitalize="none"
              autoCorrect="off"
            />
          </article>

          <article
            className={`json-editor json-editor--formatted ${activeEditor === 'formatted' ? 'json-editor--active' : ''}`}
          >
            <EditorHeader
              eyebrow="Result / 02"
              title="Formatted JSON"
              description="Edit here too; changes flow back to the source."
              stats={formattedStats}
            />
            <FormattedEditor
              id="json-formatted"
              label="Formatted JSON"
              value={formattedText}
              onChange={handleFormattedChange}
              onFocus={() => setActiveEditor('formatted')}
            />
            <div className="json-editor__actions">
              <button
                className="json-action json-action--copy"
                type="button"
                disabled={!canCopy}
                onClick={handleCopy}
              >
                Copy JSON
              </button>
              <button
                className="json-action json-action--download"
                type="button"
                disabled={!canCopy}
                onClick={handleDownload}
              >
                Download JSON
                <span aria-hidden="true">↓</span>
              </button>
              <button
                ref={fullScreenTriggerRef}
                className="json-action json-action--expand"
                type="button"
                disabled={!formattedText}
                onClick={() => setIsFullScreen(true)}
              >
                Full screen
                <span aria-hidden="true">↗</span>
              </button>
            </div>
          </article>
        </div>

        <div className="json-workbench__feedback">
          <ValidationStatus validation={validation} />
          <RepairReport report={repairReport} />
          {copyFeedback && (
            <p className="json-copy-feedback" role="status">
              {copyFeedback}
            </p>
          )}
        </div>
      </section>

      <aside className="json-privacy-note">
        <span aria-hidden="true">LOCAL</span>
        <p>
          Your JSON stays in this browser. Nothing is uploaded or stored.
        </p>
      </aside>

      {isFullScreen && (
        <div
          className="json-fullscreen"
          role="dialog"
          aria-modal="true"
          aria-label="Formatted JSON full screen"
        >
          <div className="json-fullscreen__toolbar">
            <div>
              <p className="eyebrow">Full-size result</p>
              <strong>Formatted JSON</strong>
            </div>
            <div>
              <button
                className="json-action json-action--copy"
                type="button"
                disabled={!canCopy}
                onClick={handleCopy}
              >
                Copy JSON
              </button>
              <button
                className="json-action json-action--download"
                type="button"
                disabled={!canCopy}
                onClick={handleDownload}
              >
                Download JSON
                <span aria-hidden="true">↓</span>
              </button>
              <button
                className="json-action json-action--quiet"
                type="button"
                autoFocus
                onClick={closeFullScreen}
              >
                Close
                <span aria-hidden="true">×</span>
              </button>
            </div>
          </div>
          <FormattedEditor
            id="json-formatted-fullscreen"
            label="Formatted JSON full-screen editor"
            value={formattedText}
            onChange={handleFormattedChange}
            onFocus={() => setActiveEditor('formatted')}
            className="json-fullscreen__editor"
          />
          <div className="json-fullscreen__footer">
            <ValidationStatus validation={validation} />
            {copyFeedback && (
              <p className="json-copy-feedback" role="status">
                {copyFeedback}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
