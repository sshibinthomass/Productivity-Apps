import { useEffect, useMemo, useState } from 'react'

const EMPTY_ANALYTICS = {
  summary: { totalViews: 0, totalClicks: 0, linkClicks: {} },
  days: [],
  linkClicks: {},
}

function formatDay(value) {
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
      }).format(date)
}

export default function AnalyticsPanel({
  repository,
  uid,
  siteId,
  blocks,
}) {
  const [state, setState] = useState({
    status: 'loading',
    data: EMPTY_ANALYTICS,
    error: null,
    attempt: 0,
  })

  useEffect(() => {
    let active = true
    repository
      .getAnalytics(uid, siteId)
      .then((data) => {
        if (active) {
          setState((current) => ({
            ...current,
            status: 'ready',
            data,
            error: null,
          }))
        }
      })
      .catch((error) => {
        if (active) {
          setState((current) => ({
            ...current,
            status: 'error',
            error,
          }))
        }
      })

    return () => {
      active = false
    }
  }, [repository, siteId, state.attempt, uid])

  const linkRows = useMemo(
    () =>
      blocks
        .filter(({ type }) => type === 'link')
        .map((block) => ({
          id: block.id,
          label: block.content.label || 'Untitled link',
          clicks: state.data.linkClicks?.[block.id] ?? 0,
        }))
        .sort((first, second) => second.clicks - first.clicks),
    [blocks, state.data.linkClicks],
  )

  if (state.status === 'loading') {
    return (
      <div className="mini-studio__wide-panel mini-analytics__state">
        Loading analytics…
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="mini-studio__wide-panel mini-analytics__state">
        <p role="alert">
          {state.error?.message ?? 'Analytics could not be loaded.'}
        </p>
        <button
          type="button"
          className="button button-primary"
          onClick={() =>
            setState((current) => ({
              ...current,
              status: 'loading',
              error: null,
              attempt: current.attempt + 1,
            }))
          }
        >
          Try analytics again
        </button>
      </div>
    )
  }

  const views = state.data.summary?.totalViews ?? 0
  const clicks = state.data.summary?.totalClicks ?? 0
  const clickRate = views > 0 ? (clicks / views) * 100 : 0
  const maxViews = Math.max(
    1,
    ...state.data.days.map((day) => day.views ?? 0),
  )
  const hasActivity =
    views > 0 || clicks > 0 || state.data.days.length > 0

  return (
    <section className="mini-studio__wide-panel mini-analytics">
      <header>
        <span>Last 30 days</span>
        <h2>Analytics</h2>
        <p>A private pulse check for your public page and its links.</p>
      </header>

      <dl className="mini-analytics__metrics">
        <div>
          <dt>Views</dt>
          <dd>{views.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Link clicks</dt>
          <dd>{clicks.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Click rate</dt>
          <dd>{clickRate.toFixed(1)}%</dd>
        </div>
      </dl>

      {!hasActivity ? (
        <div className="mini-analytics__empty">
          <span>00 / 30</span>
          <h3>No activity yet</h3>
          <p>Publish and share the page to start collecting private totals.</p>
        </div>
      ) : (
        <div className="mini-analytics__chart-wrap">
          <div className="mini-analytics__chart-heading">
            <h3>Views over time</h3>
            <span>{state.data.days.length} active days</span>
          </div>
          <div
            className="mini-analytics__chart"
            role="group"
            aria-label="Views over time"
          >
            {state.data.days.map((day) => (
              <div
                key={day.date}
                title={`${formatDay(day.date)}: ${day.views ?? 0} views`}
                role="img"
                aria-label={`${formatDay(day.date)}: ${day.views ?? 0} views and ${day.clicks ?? 0} clicks`}
              >
                <i
                  style={{
                    height: `${Math.max(
                      4,
                      ((day.views ?? 0) / maxViews) * 100,
                    )}%`,
                  }}
                />
                <span>{formatDay(day.date)}</span>
              </div>
            ))}
          </div>
          <table className="mini-analytics__table">
            <caption>Daily views and clicks</caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Views</th>
                <th scope="col">Clicks</th>
              </tr>
            </thead>
            <tbody>
              {state.data.days.map((day) => (
                <tr key={day.date}>
                  <th scope="row">{formatDay(day.date)}</th>
                  <td>{day.views ?? 0}</td>
                  <td>{day.clicks ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mini-analytics__links">
        <div className="mini-analytics__chart-heading">
          <h3>Link performance</h3>
          <span>Published clicks</span>
        </div>
        {linkRows.length === 0 ? (
          <p>Add a link block to see per-link performance.</p>
        ) : (
          <ol>
            {linkRows.map((link, index) => (
              <li key={link.id}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{link.label}</strong>
                <span>{link.clicks.toLocaleString()} clicks</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  )
}
