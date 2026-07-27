import { useEffect } from 'react'
import { Route, Routes, useParams } from 'react-router-dom'
import ProtectedRoute from './auth/ProtectedRoute.jsx'
import Layout from './components/Layout.jsx'
import { appRegistry, isRoutableApp } from './config/appRegistry.jsx'
import HomePage from './pages/HomePage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import VerifyEmailPage from './pages/VerifyEmailPage.jsx'
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx'
import ResetPasswordPage from './pages/ResetPasswordPage.jsx'
import AccountSecurityPage from './pages/AccountSecurityPage.jsx'
import TermsPage from './pages/TermsPage.jsx'
import PrivacyPage from './pages/PrivacyPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import PublicMiniSitePage from './apps/mini-site-builder/PublicMiniSitePage.jsx'
import NewMiniSitePage from './apps/mini-site-builder/NewMiniSitePage.jsx'
import MiniSiteStudioPage from './apps/mini-site-builder/studio/MiniSiteStudioPage.jsx'
import { publicMiniSiteUrl } from './apps/mini-site-builder/data/miniSiteRepository.js'

function LegacyPublicSiteRedirect({ redirect }) {
  const { slug } = useParams()

  useEffect(() => {
    redirect(publicMiniSiteUrl(slug))
  }, [redirect, slug])

  return null
}

function PublicHostNotFound() {
  return (
    <main className="mini-site-public-state">
      <div>
        <p>404 / MINI-SITE</p>
        <h1>This mini-site is not live.</h1>
      </div>
    </main>
  )
}

export default function App({
  registry = appRegistry,
  isPublicHost = globalThis.location?.hostname === 'links.shibinthomas.com',
  legacyRedirect = (url) => globalThis.location.replace(url),
}) {
  const routableApps = registry.filter(isRoutableApp)

  if (isPublicHost) {
    return (
      <Routes>
        <Route path="/" element={<PublicHostNotFound />} />
        <Route path="/login" element={<PublicHostNotFound />} />
        <Route path="/verify-email" element={<PublicHostNotFound />} />
        <Route path="/forgot-password" element={<PublicHostNotFound />} />
        <Route path="/reset-password" element={<PublicHostNotFound />} />
        <Route path="/account/*" element={<PublicHostNotFound />} />
        <Route path="/mini-sites/*" element={<PublicHostNotFound />} />
        <Route path="/:slug" element={<PublicMiniSitePage />} />
        <Route path="*" element={<PublicHostNotFound />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route
        path="/s/:slug"
        element={<LegacyPublicSiteRedirect redirect={legacyRedirect} />}
      />
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/account/security" element={<ProtectedRoute><AccountSecurityPage /></ProtectedRoute>} />
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
        <Route
          path="/mini-sites/:siteId/analytics"
          element={
            <ProtectedRoute>
              <MiniSiteStudioPage initialSection="Analytics" />
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
