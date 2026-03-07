import { Link } from 'react-router-dom'
import './CreateProfile.css'

export default function CreateProfile() {
  return (
    <main>
      <h1>Create profile</h1>
      <p>Profile creation form goes here.</p>
      <Link to="/">Back to home</Link>
    </main>
  )
}
