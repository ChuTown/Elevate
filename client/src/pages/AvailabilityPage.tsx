import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AvailabilityCalendar from '../components/AvailabilityCalendar'
import { createEmptyAvailability, normalizeAvailability } from '../components/availability'
import styles from './AvailabilityPage.module.css'

type MeProfileResponse = {
  _id: string
  profile?: {
    availability?: number[][]
  }
}

export default function AvailabilityPage() {
  const [availability, setAvailability] = useState<number[][]>(createEmptyAvailability())
  const [loading, setLoading] = useState(true)
  const [hasProfile, setHasProfile] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    async function loadMyProfile() {
      try {
        const response = await fetch('/api/users/me/profile')
        if (!response.ok) {
          throw new Error('Failed to load profile')
        }
        const data = (await response.json()) as MeProfileResponse
        if (!data.profile) {
          setHasProfile(false)
          return
        }
        setAvailability(normalizeAvailability(data.profile.availability))
      } catch {
        setMessage('Unable to load your profile right now.')
      } finally {
        setLoading(false)
      }
    }

    loadMyProfile()
  }, [])

  async function saveAvailability() {
    setIsSaving(true)
    setMessage('Saving availability...')
    try {
      const response = await fetch('/api/users/me/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability }),
      })
      const result = (await response.json()) as { error?: string }
      if (!response.ok) {
        setMessage(result.error || 'Failed to save availability.')
        return
      }
      setMessage('Availability updated.')
    } catch {
      setMessage('Unable to reach backend. Make sure the server is running.')
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return (
      <main className={styles.page}>
        <section className={styles.card}>
          <p>Loading availability...</p>
        </section>
      </main>
    )
  }

  if (!hasProfile) {
    return (
      <main className={styles.page}>
        <section className={styles.card}>
          <h1>Availability & Listing</h1>
          <p>Create your profile first before setting availability.</p>
          <Link to="/profile-builder">Go to profile builder</Link>
        </section>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1>Availability & Listing</h1>
        <p>Only your logged-in account can update these slots and listing status.</p>
        <AvailabilityCalendar value={availability} onChange={setAvailability} />

        <button type="button" disabled={isSaving} onClick={saveAvailability}>
          {isSaving ? 'Saving...' : 'Save availability'}
        </button>

        {message && <p className={styles.message}>{message}</p>}
      </section>
    </main>
  )
}
