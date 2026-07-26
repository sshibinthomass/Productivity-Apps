import { useState } from 'react'
import DiffResult from './DiffResult.jsx'
import { MAX_TEXT_LENGTH, compareTexts } from './diffUtils.js'
import './TextComparisonPage.css'

function textStats(text) {
  return {
    lines: text ? text.split(/\r?\n/).length : 0,
    characters: text.length,
  }
}

function Editor({
  eyebrow,
  id,
  label,
  description,
  placeholder,
  value,
  onChange,
}) {
  const stats = textStats(value)

  return (
    <article className="comparison-editor">
      <div className="comparison-editor__header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <label htmlFor={id}>{label}</label>
          <p>{description}</p>
        </div>
        <span
          className="comparison-editor__stats"
          id={`${id}-stats`}
          aria-live="polite"
        >
          {stats.lines} {stats.lines === 1 ? 'line' : 'lines'}
          <span aria-hidden="true"> / </span>
          {stats.characters.toLocaleString()} chars
        </span>
      </div>

      <textarea
        id={id}
        aria-label={label}
        aria-describedby={`${id}-stats`}
        value={value}
        maxLength={MAX_TEXT_LENGTH}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        spellCheck="false"
        autoCapitalize="none"
        autoCorrect="off"
      />
    </article>
  )
}

export default function TextComparisonPage() {
  const [original, setOriginal] = useState('')
  const [revised, setRevised] = useState('')
  const [mode, setMode] = useState('words')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const canCompare = original.length > 0 && revised.length > 0
  const canClear =
    original.length > 0 ||
    revised.length > 0 ||
    result !== null ||
    error.length > 0

  function invalidateResult() {
    setResult(null)
    setError('')
  }

  function handleOriginalChange(value) {
    setOriginal(value)
    invalidateResult()
  }

  function handleRevisedChange(value) {
    setRevised(value)
    invalidateResult()
  }

  function handleModeChange(nextMode) {
    setMode(nextMode)
    invalidateResult()
  }

  function handleCompare(event) {
    event.preventDefault()
    setError('')

    try {
      setResult(compareTexts(original, revised, mode))
    } catch (comparisonError) {
      setResult(null)
      setError(
        comparisonError instanceof RangeError
          ? 'Each text must be 100,000 characters or fewer. Your text is still here; shorten it and try again.'
          : 'The comparison could not be completed. Your text is still here; try again.',
      )
    }
  }

  function handleClear() {
    setOriginal('')
    setRevised('')
    setMode('words')
    setResult(null)
    setError('')
  }

  return (
    <div className="text-comparison-page">
      <header className="comparison-intro">
        <p className="tool-breadcrumb">
          <span>Arvenilo Network</span>
          <span aria-hidden="true">/</span>
          <span>Text Comparison</span>
        </p>
        <div className="comparison-intro__layout">
          <div>
            <p className="eyebrow">AVAILABLE NOW / DEVELOPER UTILITY</p>
            <h1>See exactly what changed.</h1>
          </div>
          <p>
            Compare prose or code by words or exact characters. Every
            addition and removal stays aligned across both sides.
          </p>
        </div>
      </header>

      <form
        className="comparison-workbench"
        aria-label="Text comparison workspace"
        onSubmit={handleCompare}
      >
        <div className="comparison-toolbar">
          <fieldset className="comparison-mode">
            <legend>Compare by</legend>
            <div className="comparison-mode__options">
              <label>
                <input
                  type="radio"
                  name="comparison-mode"
                  value="words"
                  checked={mode === 'words'}
                  onChange={() => handleModeChange('words')}
                />
                <span>Words</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="comparison-mode"
                  value="characters"
                  checked={mode === 'characters'}
                  onChange={() => handleModeChange('characters')}
                />
                <span>Characters</span>
              </label>
            </div>
          </fieldset>

          <p className="comparison-local-note">
            <span aria-hidden="true" />
            Local comparison
          </p>
        </div>

        <div className="comparison-editors">
          <Editor
            eyebrow="Source / 01"
            id="comparison-original"
            label="Text 1 / Original"
            description="Paste the text or code you started with."
            placeholder={'const mode = "safe"\nreturn compare(mode)'}
            value={original}
            onChange={handleOriginalChange}
          />
          <Editor
            eyebrow="Revision / 02"
            id="comparison-revised"
            label="Text 2 / Revised"
            description="Paste the version you want to review."
            placeholder={'const mode = "deep"\nreturn compare(mode)'}
            value={revised}
            onChange={handleRevisedChange}
          />
        </div>

        <div className="comparison-actions">
          <div>
            <button
              className="comparison-button comparison-button--primary"
              type="submit"
              disabled={!canCompare}
            >
              Compare texts
              <span aria-hidden="true">↔</span>
            </button>
            <button
              className="comparison-button comparison-button--quiet"
              type="button"
              disabled={!canClear}
              onClick={handleClear}
            >
              Clear all
            </button>
          </div>
          <p>
            Up to {MAX_TEXT_LENGTH.toLocaleString()} characters in each
            editor.
          </p>
        </div>

        {error && (
          <div className="comparison-error" role="alert">
            <span aria-hidden="true">!</span>
            <p>{error}</p>
          </div>
        )}

        {result ? (
          <DiffResult result={result} />
        ) : (
          !error && (
            <div className="comparison-ready" role="status" aria-live="polite">
              <span aria-hidden="true" />
              <p>
                {canCompare
                  ? 'Ready to compare both texts.'
                  : 'Add content to both editors to begin.'}
              </p>
            </div>
          )
        )}
      </form>

      <aside className="comparison-privacy-note">
        <span aria-hidden="true">LOCAL</span>
        <p>Your text stays in this browser. Nothing is uploaded or stored.</p>
      </aside>
    </div>
  )
}
