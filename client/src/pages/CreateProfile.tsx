import { Link } from 'react-router-dom'
import styles from './CreateProfile.module.css'

export default function CreateProfile() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1>Create profile</h1>
        <p>Set up your profile to start receiving bookings on the platform.</p>
        <div className={styles.actions}>
          <Link to="/profile-builder">Open profile builder</Link>
          <Link to="/availability">Set availability</Link>
          <Link to="/">Back to home</Link>
        </div>
      </section>
    </main>
  )
}
