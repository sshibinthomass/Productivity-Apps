import { Route, Routes } from 'react-router-dom'
import ProtectedRoute from './auth/ProtectedRoute.jsx'
import Layout from './components/Layout.jsx'
import { appRegistry, isRoutableApp } from './config/appRegistry.jsx'
import HomePage from './pages/HomePage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'

export default function App({ registry = appRegistry }) {
  const routableApps = registry.filter(isRoutableApp)

  return (
    <Layout>
      <Routes>
        <Route index element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
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
      </Routes>
    </Layout>
  )
}
