import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useViewMode } from '../contexts/ViewModeContext'
import styles from './NavBar.module.css'

export default function NavBar() {
  const navigate = useNavigate()
  const { user, loading, logout } = useAuth()
  const { viewMode, setViewMode } = useViewMode()
  const rawProfilePhotoUrl =
    viewMode === 'professional'
      ? user?.profile?.profilePhotoUrl
      : user?.clientProfile?.profilePhotoUrl
  const profilePhotoUrl =
    typeof rawProfilePhotoUrl === 'string' && rawProfilePhotoUrl.trim() ? rawProfilePhotoUrl : null
  const avatarLabel = user?.name?.trim()?.[0] || user?.email?.trim()?.[0] || '?'

  function handleViewSwitch(mode: 'client' | 'professional') {
    setViewMode(mode)
    navigate(mode === 'professional' ? '/professional' : '/client')
  }

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
            <div className={styles.viewSwitcher}>
              <button
                type="button"
                className={viewMode === 'client' ? styles.viewActive : styles.viewBtn}
                onClick={() => handleViewSwitch('client')}
              >
                Client
              </button>
              <button
                type="button"
                className={viewMode === 'professional' ? styles.viewActive : styles.viewBtn}
                onClick={() => handleViewSwitch('professional')}
              >
                Professional
              </button>
            </div>
            <div className={styles.avatarMenuWrap}>
              <details className={styles.avatarMenu}>
                <summary className={styles.avatarSummary} title="Profile menu">
                  {profilePhotoUrl ? (
                    <img className={styles.avatarImage} src={profilePhotoUrl} alt="Your profile" />
                  ) : (
                    <span className={styles.avatarFallback}>{avatarLabel.toUpperCase()}</span>
                  )}
                </summary>
                <div className={styles.avatarDropdown}>
                  <p className={styles.menuIdentity}>{user.name || user.email}</p>
                  <Link to="/profile-builder" className={styles.menuLink}>
                    Professional Profile
                  </Link>
                  <Link to="/client" className={styles.menuLink}>
                    Client Profile
                  </Link>
                </div>
              </details>
            </div>
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
