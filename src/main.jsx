import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './auth/AuthContext.jsx'
import ThemeProvider from './theme/ThemeProvider.jsx'
import { applyTheme, readStoredTheme } from './theme/theme.js'
import './styles/global.css'

export const publicMiniSiteHost = 'links.shibinthomas.com'

export function isPublicMiniSiteHost(host = globalThis.location?.host) {
  return String(host ?? '').toLowerCase().split(':')[0] === publicMiniSiteHost
}

const routerBase =
  import.meta.env.BASE_URL === '/'
    ? undefined
    : import.meta.env.BASE_URL.replace(/\/$/, '')

applyTheme(readStoredTheme())

const isPublicHost = isPublicMiniSiteHost()
const application = <App isPublicHost={isPublicHost} />

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename={routerBase}>
      <ThemeProvider>
        {isPublicHost ? application : <AuthProvider>{application}</AuthProvider>}
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
