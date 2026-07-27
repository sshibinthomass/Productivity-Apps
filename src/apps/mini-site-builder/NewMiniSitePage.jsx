import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useMiniSiteRepository } from './data/repositoryContext.js'
import { publicSiteBaseUrl } from './data/miniSiteRepository.js'
import { TEMPLATES } from './model/templates.js'
import { normalizeSlug, validateSlug } from './model/validation.js'
import { themeToCssVariables } from './model/themeCss.js'
import './MiniSiteBuilder.css'

export default function NewMiniSitePage() {
  const repository = useMiniSiteRepository()
  const navigate = useNavigate()
  const [templateId, setTemplateId] = useState('creator')
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError('')
    const slugResult = validateSlug(slug)
    if (!name.trim()) {
      setError('Add a site name.')
      return
    }
    if (!slugResult.valid) {
      setError(slugResult.error)
      return
    }

    setSubmitting(true)
    try {
      const site = await repository.createSite({
        name: name.trim(),
        slug: slugResult.value,
        templateId,
      })
      navigate(`/mini-sites/${site.siteId}/edit`)
    } catch (submissionError) {
      setError(
        submissionError.message ??
          'The mini-site could not be created. Try again.',
      )
      setSubmitting(false)
    }
  }

  return (
    <section className="mini-create">
      <header>
        <Link to="/mini-sites">← Your sites</Link>
        <p className="eyebrow">CHOOSE A STARTING SIGNAL</p>
        <h1>Begin polished. Make it entirely yours.</h1>
        <p>
          Templates are only a starting point—every color, type choice, button,
          and block remains editable.
        </p>
      </header>

      <form onSubmit={submit}>
        <fieldset className="mini-create__templates">
          <legend>Choose a template</legend>
          <div>
            {TEMPLATES.map((template) => (
              <label
                className={`mini-template${templateId === template.id ? ' is-selected' : ''}`}
                key={template.id}
                style={themeToCssVariables(template.theme)}
              >
                <input
                  type="radio"
                  name="template"
                  value={template.id}
                  checked={templateId === template.id}
                  onChange={() => setTemplateId(template.id)}
                />
                <span className="mini-template__preview" aria-hidden="true">
                  <i />
                  <b />
                  <b />
                </span>
                <strong>{template.name}</strong>
                <small>{template.description}</small>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mini-create__identity">
          <div>
            <p className="eyebrow">PUBLIC IDENTITY</p>
            <h2>Name the page people will remember.</h2>
          </div>
          <label>
            Site name
            <input
              value={name}
              maxLength={80}
              onChange={(event) => {
                const nextName = event.target.value
                setName(nextName)
                if (!slugEdited) setSlug(normalizeSlug(nextName))
              }}
              placeholder="Maya Studio"
              required
            />
          </label>
          <label>
            Public slug
            <span className="mini-create__slug">
              <span>{publicSiteBaseUrl.replace(/\/+$/, '')}/</span>
              <input
                aria-label="Public slug"
                value={slug}
                maxLength={40}
                onChange={(event) => {
                  setSlugEdited(true)
                  setSlug(event.target.value.toLowerCase())
                }}
                placeholder="maya-studio"
                required
              />
            </span>
          </label>
          {error && <p role="alert">{error}</p>}
          <button
            className="button button--primary"
            type="submit"
            disabled={submitting}
          >
            {submitting ? 'Creating…' : 'Create mini-site'}
          </button>
        </div>
      </form>
    </section>
  )
}
