import { useEffect, useRef } from 'react'
import { createQrOptions } from './qrRenderConfig.js'

export default function QrPreview({
  payload,
  design,
  valid,
  factory,
  onReady,
  onError,
  fullScreen,
}) {
  const hostRef = useRef(null)
  const instanceRef = useRef(null)

  useEffect(() => {
    const host = hostRef.current

    if (!host) {
      return
    }

    if (!valid) {
      host.replaceChildren()
      onReady(null)
      return
    }

    const options = createQrOptions(payload, design)

    try {
      if (!instanceRef.current) {
        instanceRef.current = factory(options)
      } else {
        instanceRef.current.update(options)
      }

      if (!host.hasChildNodes()) {
        instanceRef.current.append(host)
      }

      onReady(instanceRef.current)
      onError('')
    } catch (error) {
      host.replaceChildren()
      onReady(null)
      onError(
        error instanceof Error
          ? error.message
          : 'The QR code could not be rendered.',
      )
    }
  }, [design, factory, onError, onReady, payload, valid])

  return (
    <>
      <div className="qr-code-stage">
        <div
          className={`qr-code-host${valid ? ' qr-code-host--valid' : ''}${
            fullScreen ? ' qr-code-host--full' : ''
          }`}
          aria-label={valid ? 'Generated QR code' : 'QR code preview'}
          ref={hostRef}
        />
        {!valid && (
          <div className="qr-code-host__empty">
            <span aria-hidden="true" />
            <p>Complete the content fields to build your code.</p>
          </div>
        )}
      </div>
    </>
  )
}
