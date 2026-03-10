import { useEffect, useMemo, useState } from 'react'
import ProfessionalCard from '../components/ProfessionalCard'
import styles from './AllProfessionalsPage.module.css'

type Professional = {
  _id: string
  name: string
  averageRating?: number
  totalRatings?: number
  profile: {
    firstName: string
    lastName: string
    profilePhotoUrl: string
    profilePhotoPublicId: string
    professionalTitle: string
    hourlyRate?: number
    yearsOfExperience: number
    primaryIndustry: string
    location: string
    currentRole: string
    currentCompany: string
    summary: string
  } | null
}

const EXPERIENCE_FILTERS = [
  { label: 'Any', min: 0 },
  { label: '3+ years', min: 3 },
  { label: '5+ years', min: 5 },
  { label: '8+ years', min: 8 },
  { label: '12+ years', min: 12 },
] as const

export default function AllProfessionalsPage() {
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchText, setSearchText] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [selectedLocation, setSelectedLocation] = useState('')
  const [selectedIndustry, setSelectedIndustry] = useState('')
  const [minExperience, setMinExperience] = useState(0)

  useEffect(() => {
    async function loadProfessionals() {
      try {
        const response = await fetch('/api/users/professionals', { cache: 'no-store' })
        if (!response.ok) {
          throw new Error('Failed to fetch professionals')
        }
        const data = (await response.json()) as Professional[]
        setProfessionals(data.filter((item) => item.profile))
      } catch {
        setError('Could not load professionals right now.')
      } finally {
        setLoading(false)
      }
    }

    loadProfessionals()
  }, [])

  const roleOptions = useMemo(() => {
    const set = new Set(
      professionals
        .map((professional) => professional.profile?.currentRole || professional.profile?.professionalTitle || '')
        .filter(Boolean),
    )
    return Array.from(set).sort((a, b) => a.localeCompare(b)).slice(0, 14)
  }, [professionals])

  const locationOptions = useMemo(() => {
    const set = new Set(professionals.map((professional) => professional.profile?.location || '').filter(Boolean))
    return Array.from(set).sort((a, b) => a.localeCompare(b)).slice(0, 14)
  }, [professionals])

  const industryOptions = useMemo(() => {
    const set = new Set(
      professionals.map((professional) => professional.profile?.primaryIndustry || '').filter(Boolean),
    )
    return Array.from(set).sort((a, b) => a.localeCompare(b)).slice(0, 14)
  }, [professionals])

  const filteredProfessionals = useMemo(() => {
    const searchNeedle = searchText.trim().toLowerCase()

    return professionals.filter((professional) => {
      if (!professional.profile) return false
      const profile = professional.profile

      const searchHaystack = [
        professional.name,
        profile.firstName,
        profile.lastName,
        profile.currentRole,
        profile.professionalTitle,
      ]
        .join(' ')
        .toLowerCase()

      if (searchNeedle && !searchHaystack.includes(searchNeedle)) return false
      if (selectedRole) {
        const roleHaystack = [profile.currentRole, profile.professionalTitle].join(' ').toLowerCase()
        if (!roleHaystack.includes(selectedRole.toLowerCase())) return false
      }
      if (selectedLocation && profile.location.toLowerCase() !== selectedLocation.toLowerCase()) return false
      if (selectedIndustry && profile.primaryIndustry.toLowerCase() !== selectedIndustry.toLowerCase()) return false
      if (Number(profile.yearsOfExperience || 0) < minExperience) return false

      return true
    })
  }, [professionals, searchText, selectedRole, selectedLocation, selectedIndustry, minExperience])

  return (
    <main className={styles.page}>
      <section className={styles.header}>
        <h1>All Professionals</h1>
        <p>Search by name or role, then narrow results with the filters.</p>
      </section>

      <div className={styles.searchRow}>
        <input
          id="searchFilter"
          className={styles.searchInput}
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="Search by name or role"
        />
      </div>

      <div className={styles.layout}>
        <section className={styles.resultsPanel}>
          {loading && <p>Loading professionals...</p>}
          {error && <p>{error}</p>}
          {!loading && !error && filteredProfessionals.length === 0 && (
            <p>No professionals match these filters.</p>
          )}

          <section className={styles.grid}>
            {filteredProfessionals.map((professional) =>
              professional.profile ? (
                <ProfessionalCard
                  key={professional._id}
                  userId={professional._id}
                  name={professional.name}
                  profile={professional.profile}
                  averageRating={professional.averageRating}
                  totalRatings={professional.totalRatings}
                />
              ) : null,
            )}
          </section>
        </section>

        <aside className={styles.filterPanel}>
          <div className={styles.filterGroup}>
            <h3>Role</h3>
            <div className={styles.pills}>
              {roleOptions.map((role) => (
                <button
                  key={role}
                  type="button"
                  className={selectedRole === role ? styles.pillActive : styles.pill}
                  onClick={() => setSelectedRole((prev) => (prev === role ? '' : role))}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.filterGroup}>
            <h3>Location</h3>
            <div className={styles.pills}>
              {locationOptions.map((location) => (
                <button
                  key={location}
                  type="button"
                  className={selectedLocation === location ? styles.pillActive : styles.pill}
                  onClick={() => setSelectedLocation((prev) => (prev === location ? '' : location))}
                >
                  {location}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.filterGroup}>
            <h3>Industry / Skill</h3>
            <div className={styles.pills}>
              {industryOptions.map((industry) => (
                <button
                  key={industry}
                  type="button"
                  className={selectedIndustry === industry ? styles.pillActive : styles.pill}
                  onClick={() => setSelectedIndustry((prev) => (prev === industry ? '' : industry))}
                >
                  {industry}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.filterGroup}>
            <h3>Experience</h3>
            <div className={styles.pills}>
              {EXPERIENCE_FILTERS.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  className={minExperience === option.min ? styles.pillActive : styles.pill}
                  onClick={() => setMinExperience(option.min)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            className={styles.clearButton}
            onClick={() => {
              setSearchText('')
              setSelectedRole('')
              setSelectedLocation('')
              setSelectedIndustry('')
              setMinExperience(0)
            }}
          >
            Clear filters
          </button>
        </aside>
      </div>
    </main>
  )
}
