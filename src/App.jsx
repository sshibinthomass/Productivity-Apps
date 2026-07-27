import { Route, Routes } from 'react-router-dom'
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

export default function App({ registry = appRegistry }) {
  const routableApps = registry.filter(isRoutableApp)

  return (
    <Routes>
      <Route path="/s/:slug" element={<PublicMiniSitePage />} />
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
