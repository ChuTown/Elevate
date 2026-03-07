import { Link } from 'react-router-dom'
import styles from './CreateProfile.module.css'

export default function CreateProfile() {
  return (
    <main className={styles.page}>
      <h1>Create profile</h1>
      <p>Profile creation form goes here.</p>
      <Link to="/">Back to home</Link>
    </main>
  )
}
