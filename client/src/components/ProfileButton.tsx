import { useNavigate } from 'react-router-dom'

type ProfileButtonProps = {
  label?: string
}

export default function ProfileButton({ label = 'Create Profile' }: ProfileButtonProps) {
  const navigate = useNavigate()

  return (
    <button type="button" onClick={() => navigate('/create-profile')}>
      {label}
    </button>
  )
}
