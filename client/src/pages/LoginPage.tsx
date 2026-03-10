import { Link, useSearchParams } from 'react-router-dom'
import { apiBaseUrl } from '../config'
import styles from './LoginPage.module.css'

export default function LoginPage() {
  const [searchParams] = useSearchParams()
  const error = searchParams.get('error')

  const googleAuthUrl = `${apiBaseUrl}/api/auth/google`

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1>Log in</h1>
        <p className={styles.subtitle}>Sign in to manage your client and professional workflows.</p>
        {error && (
          <p role="alert" className={styles.error}>
            {error === 'oauth_not_configured'
              ? 'Google sign-in is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on the server.'
              : `Sign-in error: ${error}`}
          </p>
        )}
        <a href={googleAuthUrl} className={styles.oauthButton}>
          Continue with Google
        </a>
        <p className={styles.note}>Email/password sign-in can be added later if needed.</p>
        <Link to="/" className={styles.backLink}>
          Back to home
        </Link>
      </section>
    </main>
  )
}
