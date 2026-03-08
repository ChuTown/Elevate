import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

type ProfileFormState = {
  firstName: string
  lastName: string
  profilePhotoUrl: string
  profilePhotoPublicId: string
  professionalTitle: string
  hourlyRate: number
  yearsOfExperience: number
  primaryIndustry: string
  location: string
  summary: string
  currentRole: string
  currentCompany: string
}

export default function ProfileBuilder() {
  const { user } = useAuth()
  const [form, setForm] = useState<ProfileFormState>({
    firstName: '',
    lastName: '',
    profilePhotoUrl: '',
    profilePhotoPublicId: '',
    professionalTitle: '',
    hourlyRate: 0,
    yearsOfExperience: 0,
    primaryIndustry: '',
    location: '',
    summary: '',
    currentRole: '',
    currentCompany: '',
  })
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [isEditMode, setIsEditMode] = useState(false)

  useEffect(() => {
    async function loadExistingProfile() {
      try {
        const response = await fetch('/api/users/me/profile')
        if (!response.ok) {
          throw new Error('Failed to fetch profile')
        }
        const data = (await response.json()) as {
          profile?: Partial<ProfileFormState>
        }

        if (data.profile) {
          setForm((prev) => ({
            ...prev,
            firstName: String(data.profile?.firstName || ''),
            lastName: String(data.profile?.lastName || ''),
            profilePhotoUrl: String(data.profile?.profilePhotoUrl || ''),
            profilePhotoPublicId: String(data.profile?.profilePhotoPublicId || ''),
            professionalTitle: String(data.profile?.professionalTitle || ''),
            hourlyRate: Number.isFinite(Number(data.profile?.hourlyRate))
              ? Number(data.profile?.hourlyRate)
              : 0,
            yearsOfExperience: Number.isFinite(Number(data.profile?.yearsOfExperience))
              ? Number(data.profile?.yearsOfExperience)
              : 0,
            primaryIndustry: String(data.profile?.primaryIndustry || ''),
            location: String(data.profile?.location || ''),
            summary: String(data.profile?.summary || ''),
            currentRole: String(data.profile?.currentRole || ''),
            currentCompany: String(data.profile?.currentCompany || ''),
          }))
          setIsEditMode(true)
        } else {
          setIsEditMode(false)
        }
      } catch {
        setMessage('Could not load existing profile data.')
      } finally {
        setIsLoadingProfile(false)
      }
    }

    loadExistingProfile()
  }, [])

  function updateField<K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs = 15000) {
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)
    try {
      return await fetch(input, { ...init, signal: controller.signal })
    } finally {
      window.clearTimeout(timeoutId)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!form.firstName || !form.lastName || !form.professionalTitle) {
      setMessage('Please complete first name, last name, and title.')
      return
    }

    setIsSaving(true)
    setMessage('Saving profile...')

    try {
      let uploadedPhotoUrl = form.profilePhotoUrl
      let uploadedPhotoPublicId = form.profilePhotoPublicId

      if (selectedPhoto) {
        setMessage('Uploading photo...')
        const imageFormData = new FormData()
        imageFormData.append('photo', selectedPhoto)

        const uploadResponse = await fetchWithTimeout('/api/users/profile/photo', {
          method: 'POST',
          body: imageFormData,
        })

        const uploadResult = (await uploadResponse.json()) as {
          profilePhotoUrl?: string
          profilePhotoPublicId?: string
          error?: string
        }

        if (!uploadResponse.ok) {
          setMessage(uploadResult.error || 'Failed to upload profile photo.')
          return
        }

        uploadedPhotoUrl = uploadResult.profilePhotoUrl || ''
        uploadedPhotoPublicId = uploadResult.profilePhotoPublicId || ''
      }

      setMessage('Saving profile...')
      const response = await fetchWithTimeout('/api/users/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          profilePhotoUrl: uploadedPhotoUrl,
          profilePhotoPublicId: uploadedPhotoPublicId,
        }),
      })

      const result = (await response.json()) as { error?: string }

      if (!response.ok) {
        setMessage(result.error || 'Failed to save profile.')
        return
      }

      setMessage(isEditMode ? 'Profile updated.' : 'Profile created.')
      setIsEditMode(true)
      setForm((prev) => ({
        ...prev,
        profilePhotoUrl: uploadedPhotoUrl,
        profilePhotoPublicId: uploadedPhotoPublicId,
      }))
      setSelectedPhoto(null)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setMessage('Request timed out. Check backend/Cloudinary config and try again.')
      } else {
        setMessage('Unable to reach backend. Make sure the server is running.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="profile-builder">
      <h1>{isEditMode ? 'Edit Your Professional Profile' : 'Create Your Professional Profile'}</h1>
      <p>
        {isEditMode
          ? 'Your previous responses are loaded below. Update and save anytime.'
          : 'Build your profile for the currently logged-in account.'}
      </p>
      {user && <p>Signed in as: {user.email}</p>}
      {isLoadingProfile && <p>Loading existing profile...</p>}

      <form onSubmit={handleSubmit}>
        <label htmlFor="firstName">First name</label>
        <input
          id="firstName"
          value={form.firstName}
          onChange={(event) => updateField('firstName', event.target.value)}
          placeholder="Jordan"
          required
        />

        <label htmlFor="lastName">Last name</label>
        <input
          id="lastName"
          value={form.lastName}
          onChange={(event) => updateField('lastName', event.target.value)}
          placeholder="Lee"
          required
        />

        <label htmlFor="professionalTitle">Professional title</label>
        <input
          id="professionalTitle"
          value={form.professionalTitle}
          onChange={(event) => updateField('professionalTitle', event.target.value)}
          placeholder="Senior Product Designer"
          required
        />

        <label htmlFor="hourlyRate">Price per hour (USD)</label>
        <input
          id="hourlyRate"
          type="number"
          min={0}
          step={1}
          value={form.hourlyRate}
          onChange={(event) => updateField('hourlyRate', Number(event.target.value))}
        />

        <label htmlFor="profilePhoto">Profile photo</label>
        <input
          id="profilePhoto"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(event) => setSelectedPhoto(event.target.files?.[0] || null)}
        />

        <label htmlFor="yearsOfExperience">Years of experience</label>
        <input
          id="yearsOfExperience"
          type="number"
          min={0}
          max={60}
          value={form.yearsOfExperience}
          onChange={(event) => updateField('yearsOfExperience', Number(event.target.value))}
        />

        <label htmlFor="primaryIndustry">Primary industry</label>
        <input
          id="primaryIndustry"
          value={form.primaryIndustry}
          onChange={(event) => updateField('primaryIndustry', event.target.value)}
          placeholder="FinTech"
        />

        <label htmlFor="location">Location</label>
        <input
          id="location"
          value={form.location}
          onChange={(event) => updateField('location', event.target.value)}
          placeholder="New York, NY"
        />

        <label htmlFor="currentRole">Current role</label>
        <input
          id="currentRole"
          value={form.currentRole}
          onChange={(event) => updateField('currentRole', event.target.value)}
          placeholder="Lead UX Designer"
        />

        <label htmlFor="currentCompany">Current company</label>
        <input
          id="currentCompany"
          value={form.currentCompany}
          onChange={(event) => updateField('currentCompany', event.target.value)}
          placeholder="Elevate Labs"
        />

        <label htmlFor="summary">Professional summary</label>
        <textarea
          id="summary"
          value={form.summary}
          onChange={(event) => updateField('summary', event.target.value)}
          rows={5}
          placeholder="Summarize your background and impact."
        />

        <button type="submit" disabled={isSaving}>
          {isSaving ? 'Saving...' : isEditMode ? 'Update Profile' : 'Save Profile'}
        </button>
      </form>

      {message && <p>{message}</p>}
      <p>
        <Link to="/availability">Set availability and listing status</Link>
      </p>
    </main>
  )
}
