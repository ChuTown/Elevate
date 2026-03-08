import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import styles from './NavBar.module.css'

export default function NavBar() {
  const { user, loading, logout } = useAuth()
  const rawProfilePhotoUrl = user?.profile?.profilePhotoUrl
  const profilePhotoUrl =
    typeof rawProfilePhotoUrl === 'string' && rawProfilePhotoUrl.trim() ? rawProfilePhotoUrl : null
  const avatarLabel = user?.name?.trim()?.[0] || user?.email?.trim()?.[0] || '?'

  return (
    <nav className={styles.navbar}>
      <Link to="/" className={styles.brand}>
        Elevate
      </Link>
      <div className={styles.auth}>
        {loading ? (
          <span className={styles.userEmail}>...</span>
        ) : user ? (
          <>
            <Link to="/profile-builder" className={styles.avatarLink} title="Create or edit profile">
              {profilePhotoUrl ? (
                <img className={styles.avatarImage} src={profilePhotoUrl} alt="Your profile" />
              ) : (
                <span className={styles.avatarFallback}>{avatarLabel.toUpperCase()}</span>
              )}
            </Link>
            <button type="button" className={styles.logout} onClick={() => logout()}>
              Log out
            </button>
          </>
        ) : (
          <Link to="/login" className={styles.login}>
            Log in
          </Link>
        )}
      </div>
    </nav>
  )
}
