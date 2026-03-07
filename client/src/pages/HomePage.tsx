import { Link } from 'react-router-dom'
import './HomePage.css'

export default function HomePage() {
  return (
    <main>
      <h1>Home</h1>
      <p>Welcome to Elevate.</p>
      <Link to="/create-profile">Create a profile</Link>
    </main>
  )
}
