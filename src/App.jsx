import { Route, Routes } from 'react-router-dom'
import ProtectedRoute from './auth/ProtectedRoute.jsx'
import Layout from './components/Layout.jsx'
import { appRegistry, isRoutableApp } from './config/appRegistry.jsx'
import HomePage from './pages/HomePage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import PublicMiniSitePage from './apps/mini-site-builder/PublicMiniSitePage.jsx'
import NewMiniSitePage from './apps/mini-site-builder/NewMiniSitePage.jsx'
import MiniSiteStudioPage from './apps/mini-site-builder/studio/MiniSiteStudioPage.jsx'

export default function App({ registry = appRegistry }) {
  const routableApps = registry.filter(isRoutableApp)

  return (
    <Routes>
      <Route path="/s/:slug" element={<PublicMiniSitePage />} />
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/mini-sites/new"
          element={
            <ProtectedRoute>
              <NewMiniSitePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mini-sites/:siteId/edit"
          element={
            <ProtectedRoute>
              <MiniSiteStudioPage />
            </ProtectedRoute>
          }
        />
        {routableApps.map((app) => {
          const Page = app.component
          const page = <Page />

          return (
            <Route
              key={app.id}
              path={app.path}
              element={
                app.requiresAuth ? (
                  <ProtectedRoute>{page}</ProtectedRoute>
                ) : (
                  page
                )
              }
            />
          )
        })}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
