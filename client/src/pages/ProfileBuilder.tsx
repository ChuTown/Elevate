import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'

type ProfileFormState = {
  email: string
  firstName: string
  lastName: string
  professionalTitle: string
  yearsOfExperience: number
  primaryIndustry: string
  location: string
  summary: string
  currentRole: string
  currentCompany: string
}

export default function ProfileBuilder() {
  const [form, setForm] = useState<ProfileFormState>({
    email: '',
    firstName: '',
    lastName: '',
    professionalTitle: '',
    yearsOfExperience: 0,
    primaryIndustry: '',
    location: '',
    summary: '',
    currentRole: '',
    currentCompany: '',
  })
  const [message, setMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  function updateField<K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!form.email || !form.firstName || !form.lastName || !form.professionalTitle) {
      setMessage('Please complete email, first name, last name, and title.')
      return
    }

    setIsSaving(true)
    setMessage('Saving profile...')

    try {
      const response = await fetch('/api/users/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const result = (await response.json()) as { error?: string }

      if (!response.ok) {
        setMessage(result.error || 'Failed to save profile.')
        return
      }

      setMessage('Profile saved to backend.')
      setForm({
        email: '',
        firstName: '',
        lastName: '',
        professionalTitle: '',
        yearsOfExperience: 0,
        primaryIndustry: '',
        location: '',
        summary: '',
        currentRole: '',
        currentCompany: '',
      })
    } catch {
      setMessage('Unable to reach backend. Make sure the server is running.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="profile-builder">
      <h1>Create Your Professional Profile</h1>
      <p>Build a basic professional profile with your role and experience.</p>

      <form onSubmit={handleSubmit}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={form.email}
          onChange={(event) => updateField('email', event.target.value)}
          placeholder="jordan@example.com"
          required
        />

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
        <Link to="/">Back to home</Link>
      </p>
    </main>
  )
}
