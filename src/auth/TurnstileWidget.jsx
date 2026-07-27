import { useEffect, useRef } from 'react'

const scriptId = 'arvenilo-turnstile-script'
const scriptSource = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

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
    script.addEventListener('load', () => resolve(window.turnstile), { once: true })
    script.addEventListener('error', () => reject(new Error('Security check could not load. Refresh and try again.')), { once: true })
  })
}

export default function TurnstileWidget({ onVerify, resetKey = 0 }) {
  const container = useRef(null)
  const widgetId = useRef(null)
  const onVerifyRef = useRef(onVerify)

  useEffect(() => {
    onVerifyRef.current = onVerify
  }, [onVerify])

  useEffect(() => {
    let cancelled = false

    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !turnstile || !container.current) return
        widgetId.current = turnstile.render(container.current, {
          sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY || '',
          callback: (token) => onVerifyRef.current(token),
          'expired-callback': () => onVerifyRef.current(null),
          'error-callback': () => onVerifyRef.current(null),
        })
      })
      .catch(() => onVerifyRef.current(null))

    return () => {
      cancelled = true
      if (widgetId.current && window.turnstile?.remove) {
        window.turnstile.remove(widgetId.current)
      }
      widgetId.current = null
    }
  }, [])

  useEffect(() => {
    if (widgetId.current && window.turnstile?.reset) {
      window.turnstile.reset(widgetId.current)
    }
  }, [resetKey])

  return <div className="turnstile-widget" ref={container} aria-label="Security check" />
}
