import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './auth/AuthContext.jsx'
import { isPublicMiniSiteHost } from './publicHost.js'
import ThemeProvider from './theme/ThemeProvider.jsx'

export function ApplicationShell({
  host = globalThis.location?.host,
  routerBase,
  RouterComponent = BrowserRouter,
  routerProps,
  AuthBoundary = AuthProvider,
  AppComponent = App,
}) {
  const isPublicHost = isPublicMiniSiteHost(host)
  const application = <AppComponent isPublicHost={isPublicHost} />

  return (
    <RouterComponent basename={routerBase} {...routerProps}>
      <ThemeProvider>
        {isPublicHost ? application : <AuthBoundary>{application}</AuthBoundary>}
      </ThemeProvider>
    </RouterComponent>
  )
}
