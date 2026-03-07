import ProfileButton from '../components/ProfileButton'
import styles from './HomePage.module.css'

export default function HomePage() {
  return (
    <main className={styles.page}>
      <h1>Home</h1>
      <p>Welcome to Elevate.</p>
      <ProfileButton />
    </main>
  )
}
