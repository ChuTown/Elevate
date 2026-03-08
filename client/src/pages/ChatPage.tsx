import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../api/client'
import styles from './ChatPage.module.css'

type ChatMessage = {
  senderRole: 'professional' | 'guest'
  senderName: string
  text: string
  createdAt: string
}

type ChatConversation = {
  _id: string
  professionalId: string
  guestId: string
  guestName: string
  messages: ChatMessage[]
  lastMessageAt: string
  professional?: {
    _id: string
    name: string
    profile?: {
      firstName?: string
      lastName?: string
      professionalTitle?: string
    }
  } | null
}

type ProfessionalConversationListItem = {
  _id: string
  guestId: string
  guestName: string
  lastMessageAt: string
  messagesCount: number
  lastMessage: ChatMessage | null
}

const GUEST_ID_KEY = 'elevate_guest_id'
const GUEST_NAME_KEY = 'elevate_guest_name'

function getOrCreateGuestId() {
  const existing = localStorage.getItem(GUEST_ID_KEY)?.trim()
  if (existing) {
    return existing
  }
  const randomPart =
    typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  const created = `guest-${randomPart}`
  localStorage.setItem(GUEST_ID_KEY, created)
  return created
}

export default function ChatPage() {
  const { professionalId } = useParams<{ professionalId: string }>()
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const query = useMemo(() => new URLSearchParams(location.search), [location.search])
  const initialConversationId = query.get('conversation')

  const [guestName, setGuestName] = useState(localStorage.getItem(GUEST_NAME_KEY) ?? '')
  const [conversation, setConversation] = useState<ChatConversation | null>(null)
  const [conversationList, setConversationList] = useState<ProfessionalConversationListItem[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const isProfessionalView = Boolean(user && professionalId && user._id === professionalId)
  const guestId = useMemo(() => getOrCreateGuestId(), [])

  async function loadConversation(conversationId: string) {
    const response = await api.get<ChatConversation>(`/api/chat/conversations/${conversationId}`, {
      params: isProfessionalView ? undefined : { guestId },
    })
    setConversation(response.data)
    setStatus(null)
  }

  async function loadProfessionalInbox() {
    const response = await api.get<ProfessionalConversationListItem[]>(
      '/api/chat/professional/conversations'
    )
    setConversationList(response.data)
  }

  useEffect(() => {
    let isActive = true

    async function initialize() {
      if (!professionalId) {
        setStatus('Invalid professional link.')
        setLoading(false)
        return
      }

      try {
        if (isProfessionalView) {
          await loadProfessionalInbox()
          if (initialConversationId) {
            await loadConversation(initialConversationId)
          }
        } else {
          const storedConversationId = sessionStorage.getItem(`elevate_chat_${professionalId}`)
          if (storedConversationId) {
            await loadConversation(storedConversationId)
          }
        }
      } catch (error) {
        if (isActive) {
          setStatus('Unable to load chat right now.')
        }
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    initialize()
    return () => {
      isActive = false
    }
  }, [guestId, initialConversationId, isProfessionalView, professionalId])

  useEffect(() => {
    if (!conversation?._id) {
      return
    }

    const pollId = window.setInterval(() => {
      loadConversation(conversation._id).catch(() => {
        setStatus('Live updates paused. Retrying...')
      })
    }, 2000)

    return () => window.clearInterval(pollId)
  }, [conversation?._id, guestId, isProfessionalView])

  async function startGuestConversation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!professionalId) {
      setStatus('Invalid professional link.')
      return
    }
    const trimmedName = guestName.trim()
    if (!trimmedName) {
      setStatus('Enter your name to start chatting.')
      return
    }

    setStatus('Starting chat...')
    localStorage.setItem(GUEST_NAME_KEY, trimmedName)

    try {
      const response = await api.post<{ conversation: ChatConversation }>(
        '/api/chat/conversations',
        {
          professionalId,
          guestId,
          guestName: trimmedName,
        }
      )
      const nextConversation = response.data.conversation
      sessionStorage.setItem(`elevate_chat_${professionalId}`, nextConversation._id)
      setConversation(nextConversation)
      navigate(`/chat/${professionalId}?conversation=${nextConversation._id}`, { replace: true })
      setStatus(null)
    } catch {
      setStatus('Unable to start chat.')
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!conversation?._id) {
      setStatus('Open a conversation first.')
      return
    }

    const trimmed = newMessage.trim()
    if (!trimmed) {
      return
    }

    setStatus('Sending...')
    try {
      await api.post(`/api/chat/conversations/${conversation._id}/messages`, {
        text: trimmed,
        guestId: isProfessionalView ? undefined : guestId,
        guestName: isProfessionalView ? undefined : guestName.trim(),
      })
      setNewMessage('')
      await loadConversation(conversation._id)
      if (isProfessionalView) {
        await loadProfessionalInbox()
      }
      setStatus(null)
    } catch {
      setStatus('Failed to send message.')
    }
  }

  if (!professionalId) {
    return (
      <main className={styles.page}>
        <p>Invalid chat link.</p>
      </main>
    )
  }

  const profileLabel =
    conversation?.professional?.profile?.firstName &&
    conversation?.professional?.profile?.lastName
      ? `${conversation.professional.profile.firstName} ${conversation.professional.profile.lastName}`.trim()
      : conversation?.professional?.name || 'Professional'

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>{isProfessionalView ? 'Conversation Inbox' : `Chat with ${profileLabel}`}</h1>
        <Link to={`/profiles/${professionalId}`}>Back to profile</Link>
      </header>

      {loading && <p>Loading chat...</p>}
      {status && <p className={styles.status}>{status}</p>}

      {!loading && !isProfessionalView && !conversation && (
        <form className={styles.guestCard} onSubmit={startGuestConversation}>
          <label htmlFor="guestName">Your name</label>
          <input
            id="guestName"
            value={guestName}
            onChange={(event) => setGuestName(event.target.value)}
            placeholder="Enter your name"
            maxLength={80}
          />
          <button type="submit">Start conversation</button>
        </form>
      )}

      <section className={styles.chatLayout}>
        {isProfessionalView && (
          <aside className={styles.inbox}>
            <h2>Guests</h2>
            {conversationList.length === 0 && <p>No conversations yet.</p>}
            {conversationList.map((item) => (
              <button
                key={item._id}
                className={styles.inboxItem}
                onClick={() => {
                  loadConversation(item._id).catch(() => setStatus('Could not open conversation.'))
                  navigate(`/chat/${professionalId}?conversation=${item._id}`, { replace: true })
                }}
                type="button"
              >
                <strong>{item.guestName}</strong>
                <span>{item.lastMessage?.text || 'No messages yet'}</span>
              </button>
            ))}
          </aside>
        )}

        <article className={styles.thread}>
          {conversation ? (
            <>
              <div className={styles.threadHeader}>
                <h2>{isProfessionalView ? conversation.guestName : profileLabel}</h2>
              </div>
              <div className={styles.messages}>
                {conversation.messages.map((message) => {
                  const mine = isProfessionalView
                    ? message.senderRole === 'professional'
                    : message.senderRole === 'guest'
                  return (
                    <div
                      key={`${message.createdAt}-${message.senderRole}-${message.text}`}
                      className={mine ? styles.myMessage : styles.otherMessage}
                    >
                      <p>{message.text}</p>
                      <small>{message.senderName}</small>
                    </div>
                  )
                })}
              </div>
              <form className={styles.composer} onSubmit={sendMessage}>
                <input
                  value={newMessage}
                  onChange={(event) => setNewMessage(event.target.value)}
                  placeholder="Type your message..."
                  maxLength={2000}
                />
                <button type="submit">Send</button>
              </form>
            </>
          ) : (
            <p>{isProfessionalView ? 'Select a guest conversation.' : 'Start a chat to begin.'}</p>
          )}
        </article>
      </section>
    </main>
  )
}
