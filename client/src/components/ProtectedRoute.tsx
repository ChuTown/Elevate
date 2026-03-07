import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
}

/**
 * Renders children only when the user is logged in. Otherwise redirects to /login with a return URL.
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div style={{ padding: 'var(--spacing-lg)', textAlign: 'center' }}>
        Loading…
      </div>
    )
  }

  if (!user) {
    const from = location.pathname + location.search
    return <Navigate to={`/login?from=${encodeURIComponent(from)}`} replace />
  }

  return <>{children}</>
}
