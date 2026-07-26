function Segment({ segment }) {
  if (segment.type === 'removed') {
    return (
      <del className="comparison-segment comparison-segment--removed">
        {segment.value}
      </del>
    )
  }

  if (segment.type === 'added') {
    return (
      <ins className="comparison-segment comparison-segment--added">
        {segment.value}
      </ins>
    )
  }

  return <span>{segment.value}</span>
}

function ResultSide({ side, sideName }) {
  if (side.placeholder) {
    return (
      <span
        className="comparison-placeholder"
        aria-label={`No corresponding line in ${sideName}`}
      />
    )
  }

  return side.segments.map((segment, index) => (
    <Segment
      key={`${segment.type}-${segment.value}-${index}`}
      segment={segment}
    />
  ))
}

export default function DiffResult({ result }) {
  const isIdentical = result.status === 'identical'
  const modeLabel =
    result.mode === 'characters'
      ? 'Character comparison'
      : 'Word comparison'

  return (
    <section className="comparison-result" aria-live="polite">
      <header className="comparison-result__summary">
        <div>
          <p className="eyebrow">Comparison result</p>
          <h2>
            {isIdentical ? 'No differences found' : 'Differences found'}
          </h2>
          <p>
            {isIdentical
              ? 'Both texts match in the selected mode.'
              : 'Review every changed row across the aligned result.'}
          </p>
        </div>

        <div className="comparison-result__metrics" aria-label="Change summary">
          <span>{result.addedCount} added</span>
          <span>{result.removedCount} removed</span>
          <span>{modeLabel}</span>
        </div>
      </header>

      <div className="comparison-result__legend" aria-label="Change legend">
        <span>
          <i className="comparison-legend-swatch comparison-legend-swatch--removed" />
          Removed
        </span>
        <span>
          <i className="comparison-legend-swatch comparison-legend-swatch--added" />
          Added
        </span>
      </div>

      <div
        className="comparison-result__scroll"
        role="region"
        aria-label="Side-by-side comparison results"
        tabIndex="0"
      >
        <div className="comparison-result-grid">
          <div className="comparison-result-grid__header">
            <span>Text 1 / Original</span>
            <span aria-hidden="true" />
            <span>Text 2 / Revised</span>
          </div>

          {result.rows.map((row) => (
            <div
              className={`comparison-result-row ${
                row.changed ? 'comparison-result-row--changed' : ''
              }`}
              key={row.id}
            >
              <code className="comparison-result-cell comparison-result-cell--left">
                <ResultSide side={row.left} sideName="Text 1" />
              </code>
              <span className="comparison-seam" aria-hidden="true" />
              <code className="comparison-result-cell comparison-result-cell--right">
                <ResultSide side={row.right} sideName="Text 2" />
              </code>
            </div>
          ))}
        </div>
      </div>

      <p className="comparison-result__scroll-hint">
        Scroll sideways to keep both sides aligned on smaller screens.
      </p>
    </section>
  )
}
