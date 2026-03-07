import { useEffect, useState } from 'react'
import ProfileButton from '../components/ProfileButton'
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
    async function loadFeaturedProfessionals() {
      try {
        const response = await fetch('/api/users/featured')
        if (!response.ok) {
          throw new Error('Failed to fetch featured professionals')
        }
        const data = (await response.json()) as FeaturedProfessional[]
        setFeatured(data.filter((item) => item.profile))
      } catch {
        setError('Could not load featured professionals right now.')
      } finally {
        setLoading(false)
      }
    }

    loadFeaturedProfessionals()
  }, [])

  return (
    <main className={styles.page}>
      <h1>Home</h1>
      <p>Welcome to Elevate.</p>
      <ProfileButton />
      <section className={styles.featuredSection}>
        <h2>Featured Professionals</h2>
        {loading && <p>Loading featured professionals...</p>}
        {error && <p>{error}</p>}
        {!loading && !error && featured.length === 0 && (
          <p>No featured professionals yet. Submit a profile to appear here.</p>
        )}
        <div className={styles.grid}>
          {featured.map((professional) =>
            professional.profile ? (
              <ProfessionalCard
                key={professional._id}
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
