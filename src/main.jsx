import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ApplicationShell } from './appBootstrap.jsx'
import { applyTheme, readStoredTheme } from './theme/theme.js'
import './styles/global.css'

const routerBase =
  import.meta.env.BASE_URL === '/'
    ? undefined
    : import.meta.env.BASE_URL.replace(/\/$/, '')

const requestedRoute = new URL(window.location.href).searchParams.get('route')
if (
  requestedRoute
  && requestedRoute.startsWith('/')
  && !requestedRoute.startsWith('//')
) {
  window.history.replaceState(null, '', requestedRoute)
}

applyTheme(readStoredTheme())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ApplicationShell routerBase={routerBase} />
  </StrictMode>,
)
