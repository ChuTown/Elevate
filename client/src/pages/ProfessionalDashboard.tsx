import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { AVAILABILITY_DAYS, AVAILABILITY_HOURS } from '../components/availability'
import { api } from '../api/client'
import styles from './ProfessionalDashboard.module.css'

type ScheduleRequest = {
  _id: string
  requesterId: string
  requesterEmail: string
  dayIndex: number
  slotIndex: number
  status: string
  createdAt: string
  requester: {
    _id: string
    name: string
    email: string
    clientProfile?: {
      firstName?: string
      lastName?: string
      profilePhotoUrl?: string
      resumeUrl?: string
      description?: string
    }
  }
}

type ConversationItem = {
  _id: string
  guestId: string
  guestName: string
  lastMessageAt: string
  messagesCount: number
  lastMessage: { text: string; senderRole: string } | null
}

export default function ProfessionalDashboard() {
  const { user } = useAuth()
  const [scheduleRequests, setScheduleRequests] = useState<ScheduleRequest[]>([])
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'inbox' | 'calendar' | 'clients'>('inbox')

  useEffect(() => {
    let isMounted = true

    async function load() {
      try {
        const [reqRes, convRes] = await Promise.all([
          api.get<{ scheduleRequests: ScheduleRequest[] }>('/api/users/me/schedule-requests'),
          api.get<ConversationItem[]>('/api/chat/professional/conversations'),
        ])
        if (!isMounted) return
        setScheduleRequests(reqRes.data.scheduleRequests ?? [])
        setConversations(Array.isArray(convRes.data) ? convRes.data : [])
      } catch {
        // ignore
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    load()
    const pollTimer = window.setInterval(load, 5000)

    return () => {
      isMounted = false
      window.clearInterval(pollTimer)
    }
  }, [])

  if (loading) {
    return (
      <main className={styles.page}>
        <p>Loading...</p>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Professional Dashboard</h1>
      <div className={styles.tabs}>
        <button
          type="button"
          className={activeTab === 'inbox' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('inbox')}
        >
          Inbox
        </button>
        <button
          type="button"
          className={activeTab === 'calendar' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('calendar')}
        >
          Calendar
        </button>
        <button
          type="button"
          className={activeTab === 'clients' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('clients')}
        >
          Who booked me
        </button>
      </div>

      {activeTab === 'inbox' && (
        <section className={styles.section}>
          <h2>Conversations</h2>
          {conversations.length === 0 ? (
            <p className={styles.empty}>No conversations yet.</p>
          ) : (
            <ul className={styles.convList}>
              {conversations.map((c) => (
                <li key={c._id}>
                  <Link
                    to={user ? `/chat/${user._id}?conversation=${c._id}` : '#'}
                    className={styles.convLink}
                  >
                    <span className={styles.convName}>{c.guestName || c.guestId}</span>
                    {c.lastMessage && (
                      <span className={styles.convPreview}>{c.lastMessage.text}</span>
                    )}
                    <span className={styles.convMeta}>
                      {c.messagesCount} message{c.messagesCount !== 1 ? 's' : ''}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className={styles.hint}>
            <Link to="/">Browse profiles</Link> — when someone starts a chat with you, it appears
            here.
          </p>
        </section>
      )}

      {activeTab === 'calendar' && (
        <section className={styles.section}>
          <h2>Schedule requests</h2>
          {scheduleRequests.length === 0 ? (
            <p className={styles.empty}>No schedule requests yet.</p>
          ) : (
            <ul className={styles.requestList}>
              {scheduleRequests.map((r) => (
                <li key={r._id} className={styles.requestItem}>
                  <span className={styles.slotLabel}>
                    {AVAILABILITY_DAYS[r.dayIndex]} {AVAILABILITY_HOURS[r.slotIndex]}
                  </span>
                  <span className={styles.requestStatus}>{r.status}</span>
                  <span className={styles.requestEmail}>{r.requester.email}</span>
                  <span className={styles.requestDate}>
                    {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {activeTab === 'clients' && (
        <section className={styles.section}>
          <h2>Who booked you</h2>
          <p className={styles.subtitle}>
            Client info (photo, description, resume) so you can prepare before sessions.
          </p>
          {scheduleRequests.length === 0 ? (
            <p className={styles.empty}>No bookings yet.</p>
          ) : (
            <div className={styles.clientCards}>
              {scheduleRequests.map((r) => {
                const clientName =
                  `${r.requester.clientProfile?.firstName ?? ''} ${r.requester.clientProfile?.lastName ?? ''}`.trim() ||
                  r.requester.name ||
                  'No name'

                return (
                  <article key={r._id} className={styles.clientCard}>
                  <div className={styles.clientHeader}>
                    {r.requester.clientProfile?.profilePhotoUrl ? (
                      <img
                        src={r.requester.clientProfile.profilePhotoUrl}
                        alt=""
                        className={styles.clientPhoto}
                      />
                    ) : (
                      <div className={styles.clientPhotoPlaceholder}>
                        {(clientName || r.requester.email)[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <strong>{clientName}</strong>
                      <div className={styles.clientEmail}>{r.requester.email}</div>
                      <span className={styles.slotLabel}>
                        {AVAILABILITY_DAYS[r.dayIndex]} {AVAILABILITY_HOURS[r.slotIndex]} —{' '}
                        {r.status}
                      </span>
                    </div>
                  </div>
                  {r.requester.clientProfile?.description && (
                    <p className={styles.clientDescription}>
                      {r.requester.clientProfile.description}
                    </p>
                  )}
                  {r.requester.clientProfile?.resumeUrl && (
                    <a
                      href={r.requester.clientProfile.resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.resumeLink}
                    >
                      View resume (PDF)
                    </a>
                  )}
                  </article>
                )
              })}
            </div>
          )}
        </section>
      )}
    </main>
  )
}
