import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/authContext.js'
import { SITE_LIMIT } from './model/miniSiteModel.js'
import { useMiniSiteRepository } from './data/repositoryContext.js'
import { publicMiniSiteUrl } from './data/miniSiteRepository.js'
import './MiniSiteBuilder.css'

function siteStatus(site) {
  if (site.status !== 'published') return 'Draft'
  return site.draftRevision !== site.publishedRevision
    ? 'Changes unpublished'
    : 'Published'
}

function SitePreviewStrip({ site }) {
  return (
    <div
      className="mini-dashboard__preview"
      style={{
        '--preview-start': site.theme?.background?.value ?? '#f4fbfa',
        '--preview-end':
          site.theme?.background?.secondary ??
          site.theme?.background?.value ??
          '#d8f8f2',
        '--preview-ink': site.theme?.colors?.text ?? '#081d21',
      }}
      aria-hidden="true"
    >
      <span />
      <i />
      <i />
      <i />
    </div>
  )
}

export default function MiniSitesDashboardPage() {
  const { user } = useAuth()
  const repository = useMiniSiteRepository()
  const [state, setState] = useState({
    status: 'loading',
    sites: [],
    error: null,
  })
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [confirmationName, setConfirmationName] = useState('')
  const [duplicateTarget, setDuplicateTarget] = useState(null)
  const [duplicateForm, setDuplicateForm] = useState({ name: '', slug: '' })
  const dialogRef = useRef(null)

  useEffect(() => {
    if (!deleteTarget && !duplicateTarget) return undefined
    const previousFocus = document.activeElement
    const frame = window.requestAnimationFrame(() => {
      dialogRef.current
        ?.querySelector('input, button, [href]')
        ?.focus()
    })
    return () => {
      window.cancelAnimationFrame(frame)
      previousFocus?.focus?.()
    }
  }, [deleteTarget, duplicateTarget])

  const handleDialogKeyDown = (event, close) => {
    if (event.key === 'Escape') {
      close()
      return
    }
    if (event.key !== 'Tab') return

    const focusable = Array.from(
      dialogRef.current?.querySelectorAll(
        'input:not([disabled]), button:not([disabled]), [href]',
      ) ?? [],
    )
    const first = focusable[0]
    const last = focusable.at(-1)
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last?.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first?.focus()
    }
  }

  const loadSites = useCallback(async () => {
    try {
      const sites = await repository.listSites(user.uid)
      setState({ status: 'ready', sites, error: null })
    } catch (error) {
      setState({
        status: 'error',
        sites: [],
        error: error.message ?? 'Sites could not load.',
      })
    }
  }, [repository, user.uid])

  useEffect(() => {
    let active = true
    repository
      .listSites(user.uid)
      .then((sites) => {
        if (active) setState({ status: 'ready', sites, error: null })
      })
      .catch((error) => {
        if (active) {
          setState({
            status: 'error',
            sites: [],
            error: error.message ?? 'Sites could not load.',
          })
        }
      })
    return () => {
      active = false
    }
  }, [repository, user.uid])

  const atLimit = state.sites.length >= SITE_LIMIT

  async function deleteSite() {
    await repository.deleteSite({
      siteId: deleteTarget.id,
      confirmationName,
    })
    setDeleteTarget(null)
    setConfirmationName('')
    await loadSites()
  }

  async function duplicateSite(event) {
    event.preventDefault()
    await repository.duplicateSite({
      sourceSiteId: duplicateTarget.id,
      name: duplicateForm.name,
      slug: duplicateForm.slug,
      templateId: duplicateTarget.templateId ?? 'blank',
    })
    setDuplicateTarget(null)
    await loadSites()
  }

  return (
    <section className="mini-dashboard">
      <header className="mini-dashboard__hero">
        <div>
          <p className="eyebrow">MINI-SITE SIGNAL DESK</p>
          <h1>One place for every version of you.</h1>
          <p>
            Build focused public pages, publish when they feel right, and see
            what visitors choose.
          </p>
        </div>
        <div className="mini-dashboard__quota">
          <strong>{state.sites.length} of {SITE_LIMIT} sites used</strong>
          <span>
            {Array.from({ length: SITE_LIMIT }, (_, index) => (
              <i
                key={index}
                className={index < state.sites.length ? 'is-used' : ''}
              />
            ))}
          </span>
          <Link
            className={`button button--primary${atLimit ? ' is-disabled' : ''}`}
            to={atLimit ? '/mini-sites' : '/mini-sites/new'}
            aria-disabled={atLimit ? 'true' : undefined}
            onClick={(event) => atLimit && event.preventDefault()}
          >
            Create site
          </Link>
        </div>
      </header>

      {state.status === 'loading' && (
        <div className="mini-dashboard__state" role="status">
          Loading your sites…
        </div>
      )}

      {state.status === 'error' && (
        <div className="mini-dashboard__state" role="alert">
          <p>{state.error}</p>
          <button type="button" onClick={loadSites}>Try again</button>
        </div>
      )}

      {state.status === 'ready' && state.sites.length === 0 && (
        <div className="mini-dashboard__empty">
          <p className="eyebrow">YOUR FIRST SIGNAL</p>
          <h2>No sites yet</h2>
          <p>Start with a polished template or shape every detail yourself.</p>
          <Link className="button button--primary" to="/mini-sites/new">
            Create your first site
          </Link>
        </div>
      )}

      {state.status === 'ready' && state.sites.length > 0 && (
        <div className="mini-dashboard__grid">
          {state.sites.map((site) => (
            <article className="mini-dashboard__card" key={site.id}>
              <SitePreviewStrip site={site} />
              <div className="mini-dashboard__card-body">
                <div className="mini-dashboard__card-title">
                  <div>
                    <p className="mini-dashboard__status">{siteStatus(site)}</p>
                    <h2>{site.name}</h2>
                    <p>{publicMiniSiteUrl(site.slug)}</p>
                  </div>
                  <a
                    href={publicMiniSiteUrl(site.slug)}
                    aria-label={`Open ${site.name} public site`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    ↗
                  </a>
                </div>
                <dl className="mini-dashboard__metrics">
                  <div>
                    <dt>Views</dt>
                    <dd>{site.analytics?.totalViews ?? 0} views</dd>
                  </div>
                  <div>
                    <dt>Clicks</dt>
                    <dd>{site.analytics?.totalClicks ?? 0} clicks</dd>
                  </div>
                </dl>
                <div className="mini-dashboard__actions">
                  <Link to={`/mini-sites/${site.id}/edit`}>Edit site</Link>
                  <Link to={`/mini-sites/${site.id}/analytics`}>
                    Analytics
                  </Link>
                  <button
                    type="button"
                    disabled={atLimit}
                    aria-label="Duplicate site"
                    onClick={() => {
                      setDuplicateTarget(site)
                      setDuplicateForm({
                        name: `${site.name} copy`,
                        slug: `${site.slug}-copy`,
                      })
                    }}
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    aria-label="Delete site"
                    onClick={() => setDeleteTarget(site)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {deleteTarget && (
        <div className="mini-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-title">
          <div
            className="mini-dialog__panel"
            ref={dialogRef}
            onKeyDown={(event) =>
              handleDialogKeyDown(event, () => setDeleteTarget(null))
            }
          >
            <h2 id="delete-title">Delete {deleteTarget.name}?</h2>
            <p>This removes the draft, published page, assets, and analytics.</p>
            <label>
              Type {deleteTarget.name} to confirm
              <input
                value={confirmationName}
                onChange={(event) => setConfirmationName(event.target.value)}
              />
            </label>
            <div>
              <button type="button" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="button button--danger"
                disabled={confirmationName !== deleteTarget.name}
                onClick={deleteSite}
              >
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {duplicateTarget && (
        <div className="mini-dialog" role="dialog" aria-modal="true" aria-labelledby="duplicate-title">
          <form
            className="mini-dialog__panel"
            ref={dialogRef}
            onSubmit={duplicateSite}
            onKeyDown={(event) =>
              handleDialogKeyDown(
                event,
                () => setDuplicateTarget(null),
              )
            }
          >
            <h2 id="duplicate-title">Duplicate {duplicateTarget.name}</h2>
            <label>
              Site name
              <input
                value={duplicateForm.name}
                onChange={(event) =>
                  setDuplicateForm((value) => ({
                    ...value,
                    name: event.target.value,
                  }))
                }
                required
              />
            </label>
            <label>
              Public slug
              <input
                value={duplicateForm.slug}
                onChange={(event) =>
                  setDuplicateForm((value) => ({
                    ...value,
                    slug: event.target.value,
                  }))
                }
                required
              />
            </label>
            <div>
              <button type="button" onClick={() => setDuplicateTarget(null)}>
                Cancel
              </button>
              <button className="button button--primary" type="submit">
                Duplicate site
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}
