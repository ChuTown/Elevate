import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Link, useParams } from 'react-router-dom'
import AvailabilityCalendar from '../components/AvailabilityCalendar'
import { AVAILABILITY_DAYS, AVAILABILITY_HOURS } from '../components/availability'
import { useAuth } from '../contexts/AuthContext'
import styles from './ProfileDetailsPage.module.css'

type UserProfile = {
  firstName: string
  lastName: string
  profilePhotoUrl: string
  professionalTitle: string
  hourlyRate?: number
  yearsOfExperience: number
  primaryIndustry: string
  location: string
  currentRole: string
  currentCompany: string
  summary: string
  availability?: number[][]
}

type ProfileUser = {
  _id: string
  name: string
  email: string
  averageRating?: number
  totalRatings?: number
  reviews?: Array<{
    _id: string
    reviewerId: string
    reviewerName: string
    reviewerEmail: string
    rating: number
    comment?: string
    updatedAt: string
  }>
  profile: UserProfile
}

const FALLBACK_AVATAR =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/User-avatar.svg/1280px-User-avatar.svg.png'

export default function ProfileDetailsPage() {
  const { user: sessionUser } = useAuth()
  const { userId } = useParams<{ userId: string }>()
  const [user, setUser] = useState<ProfileUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<{ rowIndex: number; colIndex: number } | null>(null)
  const [isRequesting, setIsRequesting] = useState(false)
  const [requestMessage, setRequestMessage] = useState<string | null>(null)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const [reviewMessage, setReviewMessage] = useState<string | null>(null)

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
  const selectedLabel = selectedSlot
    ? `${AVAILABILITY_DAYS[selectedSlot.colIndex]} ${AVAILABILITY_HOURS[selectedSlot.rowIndex]}`
    : null

  function renderStars(rating: number) {
    const rounded = Math.max(0, Math.min(5, Math.round(rating)))
    return '★'.repeat(rounded) + '☆'.repeat(5 - rounded)
  }

  async function submitRequest() {
    if (!selectedSlot || !userId) return
    setIsRequesting(true)
    setRequestMessage('Submitting request...')
    try {
      const response = await fetch(`/api/users/${encodeURIComponent(userId)}/schedule-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayIndex: selectedSlot.colIndex,
          slotIndex: selectedSlot.rowIndex,
        }),
      })
      const result = (await response.json()) as { error?: string; message?: string }
      if (!response.ok) {
        setRequestMessage(result.error || 'Failed to submit request.')
        return
      }
      setRequestMessage(result.message || 'Request submitted.')
    } catch {
      setRequestMessage('Unable to reach backend right now.')
    } finally {
      setIsRequesting(false)
    }
  }

  async function submitReview() {
    if (!userId) return
    setIsSubmittingReview(true)
    setReviewMessage('Submitting review...')
    try {
      const response = await fetch(`/api/users/${encodeURIComponent(userId)}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment }),
      })
      const result = (await response.json()) as {
        error?: string
        averageRating?: number
        totalRatings?: number
        reviews?: ProfileUser['reviews']
      }
      if (!response.ok) {
        setReviewMessage(result.error || 'Failed to submit review.')
        return
      }
      setReviewMessage('Review submitted.')
      setUser((prev) =>
        prev
          ? {
              ...prev,
              averageRating: result.averageRating ?? prev.averageRating,
              totalRatings: result.totalRatings ?? prev.totalRatings,
              reviews: result.reviews ?? prev.reviews,
            }
          : prev,
      )
      setReviewComment('')
    } catch {
      setReviewMessage('Unable to reach backend right now.')
    } finally {
      setIsSubmittingReview(false)
    }
  }

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
          <p className={styles.meta}>
            {Number.isFinite(Number(profile.hourlyRate)) ? `$${Number(profile.hourlyRate)}/hr` : '$0/hr'}
          </p>
          <p className={styles.meta}>
            {renderStars(user.averageRating || 0)}{' '}
            {user.totalRatings && user.totalRatings > 0
              ? `${(user.averageRating || 0).toFixed(1)} from ${user.totalRatings} review(s)`
              : 'No ratings yet'}
          </p>
          <Link className={styles.chatLink} to={`/chat/${user._id}`}>
            Open chat
          </Link>
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
        <article className={styles.panelWide}>
          <h2>Weekly Availability</h2>
          <AvailabilityCalendar
            value={profile.availability ?? []}
            selectable
            selectedCell={selectedSlot}
            onSelectCell={(selection) => {
              setSelectedSlot(selection)
              setRequestMessage(null)
            }}
          />
          {selectedLabel && <p>Selected slot: {selectedLabel}</p>}
          {sessionUser ? (
            <button type="button" disabled={!selectedSlot || isRequesting} onClick={submitRequest}>
              {isRequesting ? 'Requesting...' : 'Request This Slot'}
            </button>
          ) : (
            <p>
              <Link to="/login">Log in</Link> to request a time slot.
            </p>
          )}
          {requestMessage && <p>{requestMessage}</p>}
        </article>
        <article className={styles.panelWide}>
          <h2>Ratings & Reviews</h2>
          {sessionUser ? (
            <div>
              <label htmlFor="reviewRating">Your rating</label>
              <select
                id="reviewRating"
                value={reviewRating}
                onChange={(event) => setReviewRating(Number(event.target.value))}
              >
                {[5, 4, 3, 2, 1].map((value) => (
                  <option key={value} value={value}>
                    {value} star{value > 1 ? 's' : ''}
                  </option>
                ))}
              </select>

              <label htmlFor="reviewComment">Your review</label>
              <textarea
                id="reviewComment"
                rows={3}
                value={reviewComment}
                onChange={(event) => setReviewComment(event.target.value)}
                placeholder="Share your experience (optional)"
              />
              <p>
                <button type="button" disabled={isSubmittingReview} onClick={submitReview}>
                  {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </p>
              {reviewMessage && <p>{reviewMessage}</p>}
            </div>
          ) : (
            <p>
              <Link to="/login">Log in</Link> to leave a review.
            </p>
          )}

          <hr />
          <ul>
            {(user.reviews || [])
              .slice()
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .map((review) => (
                <li key={review._id}>
                  <p>
                    <strong>{review.reviewerName}</strong> - {renderStars(review.rating)} ({review.rating}/5)
                  </p>
                  {review.comment && <p>{review.comment}</p>}
                </li>
              ))}
          </ul>
          {(!user.reviews || user.reviews.length === 0) && <p>No reviews yet.</p>}
        </article>
      </section>
    </main>
  )
}
