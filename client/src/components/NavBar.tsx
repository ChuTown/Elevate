import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import styles from './NavBar.module.css'

export default function NavBar() {
  const { user, loading, logout } = useAuth()

  return (
    <nav className={styles.navbar}>
      <Link to="/" className={styles.brand}>
        Elevate
      </Link>
      <div className={styles.links}>
        <Link to="/">Home</Link>
      </div>
      <div className={styles.auth}>
        {loading ? (
          <span className={styles.userEmail}>...</span>
        ) : user ? (
          <>
            <span className={styles.userEmail}>{user.email}</span>
            <button
              type="button"
              className={styles.logout}
              onClick={() => logout()}
            >
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
