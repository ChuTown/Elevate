import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ProfessionalCard from '../components/ProfessionalCard'
import styles from './HomePage.module.css'

type FeaturedProfessional = {
  _id: string
  name: string
  profile: {
    firstName: string
    lastName: string
    profilePhotoUrl: string
    profilePhotoPublicId: string
    professionalTitle: string
    yearsOfExperience: number
    primaryIndustry: string
    location: string
    currentRole: string
    currentCompany: string
    summary: string
  } | null
}

export default function HomePage() {
  const [featured, setFeatured] = useState<FeaturedProfessional[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let eventSource: EventSource | null = null
    let syncTimer: number | null = null

    function applyFeatured(data: FeaturedProfessional[]) {
      setFeatured(data.filter((item) => item.profile))
      setLoading(false)
      setError(null)
    }

    async function loadFeaturedProfessionals() {
      try {
        const response = await fetch('/api/users/featured', { cache: 'no-store' })
        if (!response.ok) {
          throw new Error('Failed to fetch featured professionals')
        }
        const data = (await response.json()) as FeaturedProfessional[]
        applyFeatured(data)
      } catch {
        setFeatured([])
        setError('Could not load featured professionals right now.')
        setLoading(false)
      }
    }

    loadFeaturedProfessionals()

    try {
      eventSource = new EventSource('/api/users/featured/stream')
      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data) as FeaturedProfessional[] | { error?: string }
          if (Array.isArray(parsed)) {
            applyFeatured(parsed)
            return
          }
          setFeatured([])
          setError(parsed.error || 'Live updates failed.')
        } catch {
          setFeatured([])
          setError('Live updates failed to parse.')
        }
      }
      eventSource.onerror = () => {
        eventSource?.close()
        setFeatured([])
        setError('Live updates disconnected. Re-syncing...')
      }
    } catch {
      setFeatured([])
      setError('Live updates unavailable. Re-syncing...')
    } finally {
      syncTimer = window.setInterval(loadFeaturedProfessionals, 5000)
    }

    return () => {
      eventSource?.close()
      if (syncTimer) {
        window.clearInterval(syncTimer)
      }
    }
  }, [])

  return (
    <main className={styles.page}>
      <h1>Home</h1>
      <p>Welcome to Elevate.</p>
      <p>
        <Link to="/availability">Set your availability and list yourself on homepage</Link>
      </p>
      <section className={styles.featuredSection}>
        <h2>Featured Professionals</h2>
        {loading && <p>Loading featured professionals...</p>}
        {error && <p>{error}</p>}
        {!loading && !error && featured.length === 0 && (
          <p>No featured professionals yet. Create a profile, then enable listing in Availability.</p>
        )}
        <div className={styles.grid}>
          {featured.map((professional) =>
            professional.profile ? (
              <ProfessionalCard
                key={professional._id}
                userId={professional._id}
                name={professional.name}
                profile={professional.profile}
              />
            ) : null,
          )}
        </div>
      </section>
    </main>
  )
}
