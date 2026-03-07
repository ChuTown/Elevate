import styles from './ProfessionalCard.module.css'

type ProfessionalProfile = {
  firstName: string
  lastName: string
  profilePhotoUrl: string
  professionalTitle: string
  yearsOfExperience: number
  primaryIndustry: string
  location: string
  currentRole: string
  currentCompany: string
  summary: string
}

type ProfessionalCardProps = {
  name: string
  profile: ProfessionalProfile
}

function truncate(text: string, maxChars: number) {
  if (text.length <= maxChars) return text
  return `${text.slice(0, maxChars).trimEnd()}...`
}

export default function ProfessionalCard({ name, profile }: ProfessionalCardProps) {
  const title = profile.currentRole || profile.professionalTitle
  const company = profile.currentCompany ? ` at ${profile.currentCompany}` : ''
  const industry = profile.primaryIndustry || 'General'
  const summary = profile.summary ? truncate(profile.summary, 110) : 'No summary added yet.'
  const avatarUrl =
    profile.profilePhotoUrl ||
    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/User-avatar.svg/1280px-User-avatar.svg.png'

  return (
    <article className={styles.card}>
      <img className={styles.avatar} src={avatarUrl} alt={`${name} profile`} />
      <h3 className={styles.name}>{name}</h3>
      <p className={styles.title}>{title}{company}</p>
      <p className={styles.meta}>{profile.yearsOfExperience}+ yrs • {industry}</p>
      {profile.location && <p className={styles.meta}>{profile.location}</p>}
      <p className={styles.summary}>{summary}</p>
    </article>
  )
}
