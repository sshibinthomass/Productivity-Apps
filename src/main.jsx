import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ApplicationShell } from './appBootstrap.jsx'
import { applyTheme, readStoredTheme } from './theme/theme.js'
import './styles/global.css'

const routerBase =
  import.meta.env.BASE_URL === '/'
    ? undefined
    : import.meta.env.BASE_URL.replace(/\/$/, '')

applyTheme(readStoredTheme())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ApplicationShell routerBase={routerBase} />
  </StrictMode>,
)
