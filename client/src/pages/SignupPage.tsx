import { Link } from 'react-router-dom'
import styles from './SignupPage.module.css'

export default function SignupPage() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1>Sign up</h1>
        <p>Create an account to book professionals or offer your services.</p>
        <p className={styles.note}>Account creation currently uses Google sign-in.</p>
        <Link to="/login">Go to login</Link>
        <Link to="/" className={styles.backLink}>
          Back to home
        </Link>
      </section>
    </main>
  )
}
