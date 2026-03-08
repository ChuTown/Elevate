import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import styles from './ProfileDetailsPage.module.css'

type UserProfile = {
  firstName: string
  lastName: string
  profilePhotoUrl: string
  professionalTitle: string
  yearsOfExperience: number
  primaryIndustry: string
  location: string
  currentRole: string
  currentCompany: string
  summary: string
}

type ProfileUser = {
  _id: string
  name: string
  email: string
  profile: UserProfile
}

const FALLBACK_AVATAR =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/User-avatar.svg/1280px-User-avatar.svg.png'

export default function ProfileDetailsPage() {
  const { userId } = useParams<{ userId: string }>()
  const [user, setUser] = useState<ProfileUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadUserProfile() {
      if (!userId) {
        setError('Invalid profile link.')
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/users/${encodeURIComponent(userId)}`)
        if (!response.ok) {
          throw new Error('Profile not found')
        }
        const data = (await response.json()) as ProfileUser
        setUser(data)
      } catch {
        setError('Could not load this profile.')
      } finally {
        setLoading(false)
      }
    }

    loadUserProfile()
  }, [userId])

  if (loading) {
    return (
      <main className={styles.page}>
        <p>Loading profile...</p>
      </main>
    )
  }

  if (error || !user) {
    return (
      <main className={styles.page}>
        <p>{error ?? 'Profile not found.'}</p>
      </main>
    )
  }

  const { profile } = user
  const displayName = `${profile.firstName} ${profile.lastName}`.trim() || user.name

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <img
          className={styles.avatar}
          src={profile.profilePhotoUrl || FALLBACK_AVATAR}
          alt={`${displayName} profile`}
        />
        <div>
          <h1>{displayName}</h1>
          <p className={styles.lead}>{profile.professionalTitle}</p>
          <p className={styles.meta}>
            {profile.yearsOfExperience}+ years experience
            {profile.location ? ` • ${profile.location}` : ''}
          </p>
        </div>
      </section>

      <section className={styles.grid}>
        <article className={styles.panel}>
          <h2>Current Position</h2>
          <p>
            {profile.currentRole || 'Professional'} at {profile.currentCompany || 'Independent'}
          </p>
        </article>
        <article className={styles.panel}>
          <h2>Primary Industry</h2>
          <p>{profile.primaryIndustry || 'General'}</p>
        </article>
        <article className={styles.panelWide}>
          <h2>About</h2>
          <p>{profile.summary || 'No summary provided yet.'}</p>
        </article>
        <article className={styles.panelWide}>
          <h2>Contact</h2>
          <p>{user.email}</p>
        </article>
      </section>
    </main>
  )
}
