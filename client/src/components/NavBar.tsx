import { Link } from 'react-router-dom'
import styles from './NavBar.module.css'

export default function NavBar() {
  return (
    <nav className={styles.navbar}>
      <Link to="/" className={styles.brand}>
        Elevate
      </Link>
      <div className={styles.links}>
        <Link to="/">Home</Link>
        <Link to="/create-profile">Become an advisor</Link>
      </div>
      <div className={styles.auth}>
        <Link to="/login" className={styles.login}>
          Log in
        </Link>
        <Link to="/signup" className={styles.signup}>
          Sign up
        </Link>
      </div>
    </nav>
  )
}
