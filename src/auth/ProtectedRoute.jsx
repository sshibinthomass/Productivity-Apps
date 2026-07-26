import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './authContext.js'

export default function ProtectedRoute({ children }) {
  const { user, isAuthLoading } = useAuth()
  const location = useLocation()

  if (isAuthLoading) {
    return (
      <div className="auth-loading" role="status" aria-live="polite">
        <span className="auth-loading__signal" aria-hidden="true" />
        <p>Checking your session…</p>
      </div>
    )
  }

  if (!user) {
    const from = `${location.pathname}${location.search}${location.hash}`

    return <Navigate to="/login" replace state={{ from }} />
  }

  return children
}
