import { Link, useSearchParams } from 'react-router-dom'
import { apiBaseUrl } from '../config'

export default function LoginPage() {
  const [searchParams] = useSearchParams()
  const error = searchParams.get('error')
  const networkConnectEnabled = import.meta.env.VITE_NETWORK_CONNECT === 'true'
  const frontendOrigin = window.location.origin

  const googleAuthUrl = networkConnectEnabled
    ? `${apiBaseUrl}/api/auth/google?frontend_origin=${encodeURIComponent(frontendOrigin)}`
    : `${apiBaseUrl}/api/auth/google`

  return (
    <main>
      <h1>Log in</h1>
      {error && (
        <p role="alert" style={{ color: 'var(--color-error, #c00)' }}>
          {error === 'oauth_not_configured'
            ? 'Google sign-in is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on the server.'
            : `Sign-in error: ${error}`}
        </p>
      )}
      <a href={googleAuthUrl}>Sign in with Google</a>
      <p>Log in page — email form coming soon.</p>
      <Link to="/">Back to home</Link>
    </main>
  )
}
