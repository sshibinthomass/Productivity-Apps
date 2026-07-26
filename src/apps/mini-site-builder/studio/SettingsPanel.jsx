import { useState } from 'react'
import { Link } from 'react-router-dom'

function SettingsField({ label, children }) {
  return (
    <label className="mini-studio__field">
      <span>{label}</span>
      {children}
    </label>
  )
}

export default function SettingsPanel({
  draft,
  slug,
  status,
  busy,
  errors,
  actionError,
  onDraftChange,
  onChangeSlug,
  onPublish,
  onUnpublish,
}) {
  const [slugInput, setSlugInput] = useState(slug)

  return (
    <section className="mini-studio__wide-panel mini-settings">
      <header>
        <span>Identity & delivery</span>
        <h2>Settings</h2>
        <p>Control the public address, search preview, and publication state.</p>
      </header>

      <fieldset>
        <legend>Site details</legend>
        <SettingsField label="Site name">
          <input
            value={draft.name}
            maxLength="80"
            onChange={(event) =>
              onDraftChange({ name: event.target.value })
            }
          />
        </SettingsField>
        <SettingsField label="Public slug">
          <div className="mini-settings__slug">
            <span>/s/</span>
            <input
              aria-label="Public slug"
              value={slugInput}
              onChange={(event) => setSlugInput(event.target.value)}
            />
            <button
              type="button"
              onClick={() => onChangeSlug(slugInput)}
              disabled={busy || slugInput === slug}
            >
              Change address
            </button>
          </div>
        </SettingsField>
      </fieldset>

      <fieldset>
        <legend>Search & sharing</legend>
        <SettingsField label="SEO title">
          <input
            value={draft.seo.title}
            maxLength="80"
            onChange={(event) =>
              onDraftChange({
                seo: { ...draft.seo, title: event.target.value },
              })
            }
          />
        </SettingsField>
        <SettingsField label="SEO description">
          <textarea
            value={draft.seo.description}
            maxLength="180"
            rows="4"
            onChange={(event) =>
              onDraftChange({
                seo: { ...draft.seo, description: event.target.value },
              })
            }
          />
        </SettingsField>
      </fieldset>

      <div className="mini-settings__publish">
        <div>
          <span
            className={`mini-settings__status mini-settings__status--${status}`}
          >
            {status === 'published' ? 'Published' : 'Private draft'}
          </span>
          <h3>
            {status === 'published'
              ? 'Your page is live'
              : 'Ready when you are'}
          </h3>
          <p>
            Publishing creates a public snapshot. Editing always stays
            available only to you.
          </p>
        </div>
        <div>
          {status === 'published' ? (
            <>
              <Link to={`/s/${slug}`} target="_blank" rel="noreferrer">
                View public site
              </Link>
              <button
                type="button"
                className="button button-secondary"
                onClick={onUnpublish}
                disabled={busy}
              >
                Unpublish site
              </button>
            </>
          ) : (
            <button
              type="button"
              className="button button-primary"
              onClick={onPublish}
              disabled={busy}
            >
              Publish site
            </button>
          )}
        </div>
      </div>

      {(actionError || Object.keys(errors).length > 0) && (
        <div className="mini-settings__errors" role="alert">
          {actionError && <p>{actionError}</p>}
          {Object.values(errors).map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      )}
    </section>
  )
}
