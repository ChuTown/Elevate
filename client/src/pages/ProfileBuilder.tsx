import { useState } from 'react'
import ProfileForm from '../components/ProfileForm'
import { createProfile } from '../api/profiles'
import type { ProfileInput } from '../types'

type Props = { onDone?: () => void }

export default function ProfileBuilder({ onDone }: Props) {
  const [status, setStatus] = useState<string | null>(null)

  async function onSubmit(data: ProfileInput) {
    setStatus('saving')
    try {
      await createProfile(data)
      setStatus('saved')
      onDone?.()
    } catch (err: any) {
      setStatus(`error: ${err.message || err}`)
    }
  }

  return (
    <div className="profile-builder">
      <h2>Create your professional profile</h2>
      <ProfileForm onSubmit={onSubmit} />
      {status && <p className="status">{status}</p>}
    </div>
  )
}
