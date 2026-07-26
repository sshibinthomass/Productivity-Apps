import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMiniSiteRepository } from './data/repositoryContext.js'
import { MiniSiteRenderer } from './renderer/MiniSiteRenderer.jsx'

function sessionEventId(slug) {
  const key = `mini-site-view:${slug}`
  const existing = globalThis.sessionStorage?.getItem(key)
  if (existing) return existing
  const eventId =
    globalThis.crypto?.randomUUID?.() ??
    `event-${Date.now()}-${Math.random().toString(36).slice(2)}`
  globalThis.sessionStorage?.setItem(key, eventId)
  return eventId
}

export default function PublicMiniSitePage() {
  const { slug } = useParams()
  const repository = useMiniSiteRepository()
  const [state, setState] = useState({
    slug,
    status: 'loading',
    site: null,
  })
  const viewReported = useRef(false)

  useEffect(() => {
    let active = true
    repository
      .getPublished(slug)
      .then((site) => {
        if (!active) return
        setState({ slug, status: site ? 'ready' : 'not-found', site })
      })
      .catch(() => {
        if (active) setState({ slug, status: 'error', site: null })
      })
    return () => {
      active = false
    }
  }, [repository, slug])

  const currentState =
    state.slug === slug ? state : { slug, status: 'loading', site: null }

  useEffect(() => {
    viewReported.current = false
  }, [slug])

  useEffect(() => {
    if (currentState.status !== 'ready' || viewReported.current) return
    viewReported.current = true
    repository
      .recordEvent({
        slug,
        type: 'view',
        eventId: sessionEventId(slug),
      })
      .catch(() => {})
  }, [currentState.status, repository, slug])

  if (currentState.status === 'loading') {
    return (
      <div className="mini-site-public-state" role="status">
        Loading mini-site…
      </div>
    )
  }

  if (currentState.status === 'not-found') {
    return (
      <main className="mini-site-public-state">
        <div>
          <p>404 / MINI-SITE</p>
          <h1>This mini-site is not live.</h1>
          <p>It may be unpublished, renamed, or no longer available.</p>
        </div>
      </main>
    )
  }

  if (currentState.status === 'error') {
    return (
      <main className="mini-site-public-state">
        <div>
          <p>CONNECTION INTERRUPTED</p>
          <h1>This mini-site could not load.</h1>
          <button type="button" onClick={() => globalThis.location.reload()}>
            Try again
          </button>
        </div>
      </main>
    )
  }

  return (
    <MiniSiteRenderer
      site={currentState.site}
      onLinkClick={(blockId) => {
        repository
          .recordEvent({
            slug,
            type: 'link_click',
            blockId,
            eventId: `${sessionEventId(slug)}:${blockId}:${Date.now()}`,
          })
          .catch(() => {})
      }}
    />
  )
}
