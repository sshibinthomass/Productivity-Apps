import { useEffect, useRef, useState } from 'react'

const scriptId = 'arvenilo-turnstile-script'
const scriptSource = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

function removeScript() {
  document.getElementById(scriptId)?.remove()
}

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile)

  let script = document.getElementById(scriptId)
  if (!script) {
    script = document.createElement('script')
    script.id = scriptId
    script.src = scriptSource
    script.async = true
    script.defer = true
    document.head.append(script)
  }

  return new Promise((resolve, reject) => {
    script.addEventListener('load', () => window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile did not initialise.')), { once: true })
    script.addEventListener('error', () => reject(new Error('Security check could not load.')), { once: true })
  })
}

export default function TurnstileWidget({ onVerify, resetKey = 0 }) {
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY
  const container = useRef(null)
  const widgetId = useRef(null)
  const onVerifyRef = useRef(onVerify)
  const [error, setError] = useState(siteKey ? '' : 'Security check is not configured. Contact the site owner.')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    onVerifyRef.current = onVerify
  }, [onVerify])

  useEffect(() => {
    if (!siteKey) return undefined
    let cancelled = false

    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !container.current) return
        setError('')
        try {
          widgetId.current = turnstile.render(container.current, {
            sitekey: siteKey,
            size: window.innerWidth <= 360 ? 'compact' : 'normal',
            callback: (token) => onVerifyRef.current(token),
            'expired-callback': () => onVerifyRef.current(null),
            'error-callback': () => onVerifyRef.current(null),
          })
        } catch {
          onVerifyRef.current(null)
          setError('Security check could not start. Try again.')
        }
      })
      .catch(() => {
        if (cancelled) return
        onVerifyRef.current(null)
        removeScript()
        setError('Security check could not load. Try again.')
      })

    return () => {
      cancelled = true
      if (widgetId.current != null && window.turnstile?.remove) window.turnstile.remove(widgetId.current)
      widgetId.current = null
    }
  }, [retryKey, siteKey])

  useEffect(() => {
    if (widgetId.current != null && window.turnstile?.reset) {
      window.turnstile.reset(widgetId.current)
      onVerifyRef.current(null)
    }
  }, [resetKey])

  function retry() {
    onVerifyRef.current(null)
    removeScript()
    setRetryKey((value) => value + 1)
  }

  return (
    <div className="turnstile-widget">
      <div ref={container} aria-label="Security check" />
      {error && <p className="turnstile-widget__error" role="alert">{error} <button type="button" onClick={retry}>Retry security check</button></p>}
    </div>
  )
}
