import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface GuestOnlyRouteProps {
  children: React.ReactNode
}

/**
 * Renders children only when the user is not logged in. Otherwise redirects to home.
 */
export default function GuestOnlyRoute({ children }: GuestOnlyRouteProps) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ padding: 'var(--spacing-lg)', textAlign: 'center' }}>
        Loading…
      </div>
    )
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
