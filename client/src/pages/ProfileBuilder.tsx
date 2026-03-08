import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

type ProfileFormState = {
  firstName: string
  lastName: string
  profilePhotoUrl: string
  profilePhotoPublicId: string
  professionalTitle: string
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

      setMessage('Profile saved to backend.')
      setForm({
        firstName: '',
        lastName: '',
        profilePhotoUrl: '',
        profilePhotoPublicId: '',
        professionalTitle: '',
        yearsOfExperience: 0,
        primaryIndustry: '',
        location: '',
        summary: '',
        currentRole: '',
        currentCompany: '',
      })
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
      <h1>Create Your Professional Profile</h1>
      <p>Build your profile for the currently logged-in account.</p>
      {user && <p>Signed in as: {user.email}</p>}

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
          {isSaving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>

      {message && <p>{message}</p>}
      <p>
        <Link to="/availability">Set availability and listing status</Link>
      </p>
    </main>
  )
}
