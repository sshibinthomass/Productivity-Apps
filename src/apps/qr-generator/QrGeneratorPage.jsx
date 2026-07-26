import QRCodeStyling from 'qr-code-styling'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import QrContentForm from './QrContentForm.jsx'
import QrDesignControls from './QrDesignControls.jsx'
import QrPreview from './QrPreview.jsx'
import { createExportFilename, processLogoFile } from './qrMedia.js'
import {
  QR_TYPES,
  buildQrPayload,
  createInitialValues,
} from './qrPayloads.js'
import {
  DEFAULT_QR_DESIGN,
  normalizeQrDesign,
} from './qrRenderConfig.js'
import { analyzeQrSafety } from './qrSafety.js'

const defaultQrFactory = (options) => new QRCodeStyling(options)
const defaultPrint = () => window.print()
const defaultClipboardItem = (items) => new ClipboardItem(items)

function groupedTypes() {
  return QR_TYPES.reduce((groups, type) => {
    const group = groups.find(({ category }) => category === type.category)

    if (group) {
      group.types.push(type)
    } else {
      groups.push({ category: type.category, types: [type] })
    }

    return groups
  }, [])
}

const TYPE_GROUPS = groupedTypes()

function currentTypeMeta(type) {
  return QR_TYPES.find(({ id }) => id === type) ?? QR_TYPES[0]
}

export default function QrGeneratorPage({
  createQrCode = defaultQrFactory,
  processLogo = processLogoFile,
  clipboard = globalThis.navigator?.clipboard,
  createClipboardItem = defaultClipboardItem,
  printPage = defaultPrint,
}) {
  const [selectedType, setSelectedType] = useState('url')
  const [valuesByType, setValuesByType] = useState(createInitialValues)
  const [attemptedTypes, setAttemptedTypes] = useState({})
  const [design, setDesign] = useState({ ...DEFAULT_QR_DESIGN })
  const [renderer, setRenderer] = useState(null)
  const [feedback, setFeedback] = useState('')
  const [logoName, setLogoName] = useState('')
  const [logoError, setLogoError] = useState('')
  const [previewError, setPreviewError] = useState('')
  const [isFullScreen, setIsFullScreen] = useState(false)
  const dialogRef = useRef(null)
  const fullScreenTriggerRef = useRef(null)

  const values = valuesByType[selectedType]
  const result = useMemo(
    () => buildQrPayload(selectedType, values),
    [selectedType, values],
  )
  const valid = Boolean(result.payload) && Object.keys(result.errors).length === 0
  const errors = attemptedTypes[selectedType] ? result.errors : {}
  const safety = useMemo(
    () => analyzeQrSafety({ design, byteLength: result.byteLength }),
    [design, result.byteLength],
  )
  const typeMeta = currentTypeMeta(selectedType)
  const canUseRenderer = valid && Boolean(renderer) && !previewError
  const canCopyImage =
    canUseRenderer &&
    typeof clipboard?.write === 'function' &&
    typeof createClipboardItem === 'function'

  const handleRendererReady = useCallback((nextRenderer) => {
    setRenderer(nextRenderer)
  }, [])

  const handlePreviewError = useCallback((message) => {
    setPreviewError(message)
  }, [])

  useEffect(() => {
    if (!isFullScreen) {
      return undefined
    }

    dialogRef.current?.focus()

    function closeOnEscape(event) {
      if (event.key === 'Escape') {
        setIsFullScreen(false)
        setTimeout(() => fullScreenTriggerRef.current?.focus(), 0)
      }
    }

    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [isFullScreen])

  function handleFieldChange(field, value) {
    setValuesByType((current) => ({
      ...current,
      [selectedType]: {
        ...current[selectedType],
        [field]: value,
      },
    }))
    setAttemptedTypes((current) => ({ ...current, [selectedType]: true }))
    setFeedback('')
    setPreviewError('')
  }

  function handleDesignChange(field, value) {
    setDesign((current) =>
      normalizeQrDesign({
        ...current,
        [field]: value,
      }),
    )
    setFeedback('')
  }

  async function handleLogo(file) {
    if (!file) {
      return
    }

    setLogoError('')
    setFeedback('')

    try {
      const logoDataUrl = await processLogo(file)
      setLogoName(file.name)
      setDesign((current) =>
        normalizeQrDesign({
          ...current,
          logoDataUrl,
          errorCorrection: 'H',
          logoScale: Math.min(current.logoScale, 0.2),
        }),
      )
    } catch (error) {
      setLogoError(
        error instanceof Error ? error.message : 'The logo could not be used.',
      )
    }
  }

  function removeLogo() {
    setDesign((current) => ({
      ...current,
      logoDataUrl: '',
    }))
    setLogoName('')
    setLogoError('')
  }

  async function copyPayload() {
    if (!valid || typeof clipboard?.writeText !== 'function') {
      return
    }

    try {
      await clipboard.writeText(result.payload)
      setFeedback('Payload copied')
    } catch {
      setFeedback('Copy failed. Select the payload and copy it manually.')
    }
  }

  async function download(extension) {
    if (!canUseRenderer) {
      return
    }

    const filename = createExportFilename(selectedType, extension)
    const name = filename.slice(0, -(extension.length + 1))

    try {
      await renderer.download({ name, extension })
      setFeedback(`${extension.toUpperCase()} downloaded`)
    } catch {
      setFeedback(
        'Download failed. Try another format or copy the payload.',
      )
    }
  }

  async function copyImage() {
    if (!canCopyImage) {
      return
    }

    try {
      const blob = await renderer.getRawData('png')
      await clipboard.write([
        createClipboardItem({ 'image/png': blob }),
      ])
      setFeedback('QR image copied')
    } catch {
      setFeedback('Image copy is not available. Download the PNG instead.')
    }
  }

  function resetAll() {
    setSelectedType('url')
    setValuesByType(createInitialValues())
    setAttemptedTypes({})
    setDesign({ ...DEFAULT_QR_DESIGN })
    setRenderer(null)
    setLogoName('')
    setLogoError('')
    setPreviewError('')
    setFeedback('')
  }

  function closeFullScreen() {
    setIsFullScreen(false)
    setTimeout(() => fullScreenTriggerRef.current?.focus(), 0)
  }

  return (
    <div className="qr-generator-page">
      <header className="qr-intro">
        <p className="tool-breadcrumb">
          <span>Arvenilo Network</span>
          <span aria-hidden="true">/</span>
          <span>QR Generator</span>
        </p>
        <div className="qr-intro__layout">
          <div>
            <p className="eyebrow">Local QR studio</p>
            <h1>Make one code. Use it anywhere.</h1>
          </div>
          <p>
            Build a scan-ready QR for links, contacts, networks, events,
            profiles, payments, or any custom payload. Everything stays on this
            device.
          </p>
        </div>
      </header>

      <div className="qr-studio">
        <section className="qr-builder" aria-label="QR content and design">
          <div className="qr-panel qr-panel--types">
            <div className="qr-panel__heading">
              <span>Content</span>
              <div>
                <p className="eyebrow">Choose what the code does</p>
                <h2>Start with a purpose</h2>
              </div>
            </div>
            <div className="qr-type-groups">
              {TYPE_GROUPS.map((group) => (
                <section key={group.category}>
                  <h3>{group.category}</h3>
                  <div className="qr-type-grid">
                    {group.types.map((type) => (
                      <button
                        aria-pressed={selectedType === type.id}
                        className="qr-type-button"
                        key={type.id}
                        type="button"
                        onClick={() => {
                          setSelectedType(type.id)
                          setFeedback('')
                          setPreviewError('')
                        }}
                      >
                        <span>{type.label}</span>
                        <small>{type.description}</small>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>

          <div className="qr-panel qr-panel--content">
            <div className="qr-panel__heading">
              <span>Details</span>
              <div>
                <p className="eyebrow">{typeMeta.category}</p>
                <h2>{typeMeta.label}</h2>
                <p>{typeMeta.description}</p>
              </div>
            </div>
            <QrContentForm
              errors={errors}
              onChange={handleFieldChange}
              type={selectedType}
              values={values}
            />
          </div>

          <details className="qr-panel qr-panel--design">
            <summary>
              <span>Design</span>
              <div>
                <p className="eyebrow">Make it yours</p>
                <h2>Style and scan settings</h2>
              </div>
            </summary>
            <QrDesignControls
              design={design}
              logoError={logoError}
              logoName={logoName}
              onChange={handleDesignChange}
              onLogo={handleLogo}
              onRemoveLogo={removeLogo}
            />
          </details>
        </section>

        <aside className="qr-proof" aria-label="QR preview and export">
          <div className="qr-proof__sticky">
            <div className="qr-proof__heading">
              <div>
                <p className="eyebrow">Live proof</p>
                <h2>Your QR</h2>
              </div>
              <span>{result.byteLength} bytes</span>
            </div>

            <div
              className={`qr-registration-frame${
                valid ? ' qr-registration-frame--active' : ''
              }`}
            >
              <QrPreview
                design={design}
                factory={createQrCode}
                onError={handlePreviewError}
                onReady={handleRendererReady}
                payload={result.payload}
                valid={valid}
              />
            </div>

            {previewError && (
              <p className="qr-preview-error" role="alert">
                {previewError}
              </p>
            )}

            <section
              className={`qr-safety qr-safety--${safety.level}`}
              aria-live="polite"
            >
              <div>
                <span aria-hidden="true" />
                <div>
                  <p className="eyebrow">Scan safety</p>
                  <strong>{safety.label}</strong>
                </div>
              </div>
              {safety.issues.length > 0 ? (
                <ul>
                  {safety.issues.map((issue) => (
                    <li key={issue.code}>{issue.message}</li>
                  ))}
                </ul>
              ) : (
                <p>High contrast, protected margin, and balanced density.</p>
              )}
            </section>

            <details className="qr-payload">
              <summary>Inspect encoded payload</summary>
              <code>{valid ? result.payload : 'No payload yet'}</code>
              <button
                disabled={!valid}
                type="button"
                onClick={copyPayload}
              >
                Copy payload
              </button>
            </details>

            <div className="qr-export-actions">
              <button
                className="qr-action qr-action--primary"
                disabled={!canUseRenderer}
                type="button"
                onClick={() => download('png')}
              >
                Download PNG
              </button>
              <button
                className="qr-action"
                disabled={!canUseRenderer}
                type="button"
                onClick={() => download('svg')}
              >
                Download SVG
              </button>
              <button
                className="qr-action"
                disabled={!canCopyImage}
                type="button"
                onClick={copyImage}
              >
                Copy image
              </button>
              <button
                className="qr-action"
                disabled={!canUseRenderer}
                type="button"
                onClick={printPage}
              >
                Print QR
              </button>
              <button
                className="qr-action"
                disabled={!canUseRenderer}
                ref={fullScreenTriggerRef}
                type="button"
                onClick={() => setIsFullScreen(true)}
              >
                Open full-size preview
              </button>
              <button
                className="qr-action qr-action--quiet"
                type="button"
                onClick={resetAll}
              >
                Reset all
              </button>
            </div>

            <p className="qr-feedback" aria-live="polite">
              {feedback}
            </p>
            <p className="qr-local-note">
              <span aria-hidden="true">LOCAL</span>
              Your data stays in this browser.
            </p>
          </div>
        </aside>
      </div>

      {isFullScreen && (
        <div className="qr-dialog-backdrop" role="presentation">
          <section
            aria-label="Full-size QR preview"
            aria-modal="true"
            className="qr-dialog"
            ref={dialogRef}
            role="dialog"
            tabIndex="-1"
          >
            <div className="qr-dialog__heading">
              <div>
                <p className="eyebrow">{typeMeta.label}</p>
                <h2>Full-size QR preview</h2>
              </div>
              <button type="button" onClick={closeFullScreen}>
                Close preview
              </button>
            </div>
            <QrPreview
              design={design}
              factory={createQrCode}
              fullScreen
              onError={handlePreviewError}
              onReady={() => {}}
              payload={result.payload}
              valid={valid}
            />
          </section>
        </div>
      )}
    </div>
  )
}
