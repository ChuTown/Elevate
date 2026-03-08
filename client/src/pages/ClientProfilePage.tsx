import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../api/client'
import styles from './ClientProfilePage.module.css'

type ClientProfile = {
  firstName?: string
  lastName?: string
  profilePhotoUrl?: string
  resumeUrl?: string
  description?: string
}

export default function ClientProfilePage() {
  const { refetch } = useAuth()
  const [clientProfile, setClientProfile] = useState<ClientProfile>({})
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [description, setDescription] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get<{ clientProfile: ClientProfile }>(
          '/api/users/me/client-profile'
        )
        const cp = data.clientProfile ?? {}
        setClientProfile(cp)
        setFirstName(String(cp.firstName ?? ''))
        setLastName(String(cp.lastName ?? ''))
        setDescription(String(cp.description ?? ''))
      } catch {
        setMessage('Could not load client profile.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      if (photoFile) {
        const formData = new FormData()
        formData.append('photo', photoFile)
        const photoRes = await api.post<{ profilePhotoUrl: string }>(
          '/api/users/me/client-profile/photo',
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        )
        setClientProfile((prev) => ({ ...prev, profilePhotoUrl: photoRes.data.profilePhotoUrl }))
        setPhotoFile(null)
      }

      if (resumeFile) {
        const formData = new FormData()
        formData.append('resume', resumeFile)
        const resumeRes = await api.post<{ resumeUrl: string }>(
          '/api/users/me/client-profile/resume',
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        )
        setClientProfile((prev) => ({ ...prev, resumeUrl: resumeRes.data.resumeUrl }))
        setResumeFile(null)
      }

      await api.put('/api/users/me/client-profile', {
        firstName: firstName.trim().slice(0, 80),
        lastName: lastName.trim().slice(0, 80),
        description: description.trim().slice(0, 2000),
      })

      setClientProfile((prev) => ({
        ...prev,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        description: description.trim(),
      }))
      setMessage('Profile saved. Professionals will see this when you book them.')
      await refetch()
    } catch (err: unknown) {
      const msg =
        err &&
        typeof err === 'object' &&
        'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : null
      setMessage(msg || 'Failed to save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className={styles.page}>
        <p>Loading...</p>
      </main>
    )
  }

  const photoUrl = photoFile
    ? URL.createObjectURL(photoFile)
    : (clientProfile.profilePhotoUrl && clientProfile.profilePhotoUrl.trim())
      ? clientProfile.profilePhotoUrl
      : null

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Client profile</h1>
      <p className={styles.subtitle}>
        Add a photo, resume, and a short description. Professionals you book will see this so they
        can prepare for your session.
      </p>

      <section className={styles.layout}>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label htmlFor="client-first-name">First name</label>
              <input
                id="client-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                maxLength={80}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="client-last-name">Last name</label>
              <input
                id="client-last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                maxLength={80}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="client-photo">Profile picture</label>
            <div className={styles.photoRow}>
              {photoUrl ? (
                <img src={photoUrl} alt="Preview" className={styles.photoPreview} />
              ) : (
                <div className={styles.photoPlaceholder}>No photo</div>
              )}
              <input
                id="client-photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="client-resume">Resume (PDF)</label>
            <div className={styles.resumeRow}>
              {clientProfile.resumeUrl ? (
                <a
                  href={clientProfile.resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.resumeLink}
                >
                  Current resume
                </a>
              ) : (
                <span className={styles.noFile}>No resume uploaded</span>
              )}
              <input
                id="client-resume"
                type="file"
                accept="application/pdf"
                onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
              />
              {resumeFile && <span className={styles.fileName}>{resumeFile.name}</span>}
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="client-description">About you (for professionals)</label>
            <textarea
              id="client-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of your background and what you're looking for..."
              rows={5}
              maxLength={2000}
            />
            <span className={styles.charCount}>{description.length} / 2000</span>
          </div>

          <button type="submit" disabled={saving} className={styles.submit}>
            {saving ? 'Saving...' : 'Save client profile'}
          </button>
        </form>

        <section className={styles.previewCard}>
          <h2>Current client profile</h2>
          <p className={styles.previewName}>
            {`${clientProfile.firstName ?? ''} ${clientProfile.lastName ?? ''}`.trim() ||
              'No client name saved yet.'}
          </p>
          <div className={styles.previewHeader}>
            {clientProfile.profilePhotoUrl ? (
              <img
                src={clientProfile.profilePhotoUrl}
                alt="Current profile"
                className={styles.photoPreview}
              />
            ) : (
              <div className={styles.photoPlaceholder}>No photo</div>
            )}
            <div>
              <p className={styles.previewLabel}>Description</p>
              <p>{clientProfile.description?.trim() || 'No description saved yet.'}</p>
            </div>
          </div>
          <p className={styles.previewLabel}>Resume</p>
          {clientProfile.resumeUrl ? (
            <a
              href={clientProfile.resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.resumeLink}
            >
              View current resume
            </a>
          ) : (
            <p className={styles.noFile}>No resume saved yet.</p>
          )}
        </section>
      </section>

      {message && <p className={styles.message} role="alert">{message}</p>}
      <p>
        <Link to="/professional">Go to professional dashboard</Link>
      </p>
    </main>
  )
}
