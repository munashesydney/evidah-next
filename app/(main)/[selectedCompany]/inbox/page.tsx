'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { app } from '@/lib/firebase'
import InboxInputArea from '@/components/inbox-input-area'

const auth = getAuth(app)

// Loading skeleton component
const LoadingState = () => (
  <div className="flex items-center justify-center h-full w-full">
    <div className="animate-pulse flex flex-col items-center">
      <div className="rounded-full bg-gray-200 dark:bg-gray-700 h-16 w-16 mb-4"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2"></div>
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
    </div>
  </div>
)

// Function to generate consistent avatar colors based on name/email
const getAvatarColor = (name: string) => {
  const colors = [
    'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
    'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400'
  ]

  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }

  const index = Math.abs(hash) % colors.length
  return colors[index]
}

// Function to get initials from name/email
const getInitials = (name: string) => {
  if (!name) return '?'
  const parts = name.split('@')[0].split(/[\s._-]+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase()
}

// Format timestamp to day/month
function formatTimestampToDayMonth(timestamp: any) {
  if (!timestamp) {
    return 'N/A'
  }

  // Handle Firestore Timestamp object with seconds
  if (timestamp.seconds) {
    const date = new Date(timestamp.seconds * 1000)
    if (isNaN(date.getTime())) {
      return 'Invalid Date'
    }
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const day = date.getDate()
    const month = months[date.getMonth()]
    return `${day} ${month}`
  }

  // Handle Firestore Timestamp object with _seconds (sometimes used)
  if (timestamp._seconds) {
    const date = new Date(timestamp._seconds * 1000)
    if (isNaN(date.getTime())) {
      return 'Invalid Date'
    }
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const day = date.getDate()
    const month = months[date.getMonth()]
    return `${day} ${month}`
  }

  // Handle Date object or milliseconds
  const date = new Date(timestamp)
  if (isNaN(date.getTime())) {
    return 'Invalid Date'
  }
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const day = date.getDate()
  const month = months[date.getMonth()]
  return `${day} ${month}`
}

interface Ticket {
  id: string
  subject: string
  from: string
  lastMessage: string
  date: any
  lastMessageDate: any
  read: boolean
  status: string
  closed?: boolean
  aiOn?: boolean
}

interface Message {
  id: string
  from: string
  to: string
  subject: string
  body: string
  date: any
  type?: string
  open: boolean
  attachments?: Array<{ fileName: string; publicUrl: string }>
}

interface TicketData {
  id: string
  subject: string
  from: string
  status: string
  closed?: boolean
  aiOn?: boolean
  [key: string]: any
}

// MessageCard component to display individual messages
function MessageCard({
  message,
  subdomain,
  formatTimestamp,
}: {
  message: Message
  subdomain: string
  formatTimestamp: (timestamp: any) => string
}) {
  const [isOpen, setIsOpen] = useState(message.open)
  const isUser = message.from === `${subdomain}@ourkd.help` || message.type === 'humanSupport'
  const isAI = message.type === 'AI'

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 rounded-lg overflow-hidden">
      {/* Message Header */}
      <button
        className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            {/* Avatar */}
            <div
              className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                isUser
                  ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400'
                  : isAI
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : getAvatarColor(message.from.split('@')[0])
              }`}
            >
              {isUser ? 'Y' : isAI ? 'AI' : getInitials(message.from)}
            </div>

            {/* Message info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {isUser ? 'You' : isAI ? 'AI Assistant' : message.from.split('@')[0]}
                </span>
                {isAI && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                    AI Response
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                To: {message.to}
              </div>
              {!isOpen && (
                <div className="text-sm text-gray-700 dark:text-gray-300 mt-1 line-clamp-2">
                  {message.body.substring(0, 100)}...
                </div>
              )}
            </div>
          </div>

          {/* Right side - Date and toggle */}
          <div className="flex items-center space-x-2 ml-2">
            <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
              {formatTimestamp(message.date)}
            </span>
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </button>

      {/* Message Body */}
      {isOpen && (
        <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700/60">
          <div className="pt-4">
            <div className="prose dark:prose-invert max-w-none">
              <div
                className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words"
                dangerouslySetInnerHTML={{ __html: message.body }}
              />
            </div>

            {/* Attachments */}
            {message.attachments && Array.isArray(message.attachments) && message.attachments.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700/60">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Attachments ({message.attachments.length})
                </div>
                <div className="space-y-2">
                  {message.attachments.map((attachment, index) => (
                    <a
                      key={index}
                      href={attachment.publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center p-2 bg-gray-50 dark:bg-gray-900/50 rounded hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
                    >
                      <svg
                        className="w-5 h-5 text-gray-400 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                        />
                      </svg>
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                        {attachment.fileName}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function InboxPage() {
  const router = useRouter()
  const params = useParams()
  const selectedCompany = params.selectedCompany as string

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([])
  const [activeTicket, setActiveTicket] = useState<string>('')
  const [uid, setUid] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [lastTimestamp, setLastTimestamp] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [moreLoading, setMoreLoading] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [ticketData, setTicketData] = useState<TicketData | null>(null)
  const [subdomain, setSubdomain] = useState<string>('')
  const [messagesLoading, setMessagesLoading] = useState(false)

  const sidebarScrollRef = useRef<HTMLDivElement>(null)

  // Authentication check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid)
        fetchTickets(user.uid)
      } else {
        router.push('/sign-in')
      }
    })

    return () => unsubscribe()
  }, [router, selectedCompany])

  // Filter tickets based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredTickets(tickets)
    } else {
      const filtered = tickets.filter(
        (t) =>
          t.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.from?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredTickets(filtered)
    }
  }, [searchQuery, tickets])

  const fetchTickets = async (userId: string, startAfter?: number) => {
    try {
      const url = new URL('/api/inbox/tickets', window.location.origin)
      url.searchParams.append('uid', userId)
      url.searchParams.append('selectedCompany', selectedCompany)
      url.searchParams.append('limit', '10')
      if (startAfter) {
        url.searchParams.append('startAfter', startAfter.toString())
      }

      const response = await fetch(url.toString())
      const data = await response.json()

      if (data.status === 1) {
        if (startAfter) {
          // Append to existing tickets for "load more"
          setTickets((prev) => [...prev, ...data.tickets])
        } else {
          // Initial load
          setTickets(data.tickets)
          if (data.tickets.length > 0) {
            setActiveTicket(data.tickets[0].id)
            // Automatically fetch messages for first ticket
            fetchMessagesForTicket(data.tickets[0].id, userId)
          }
        }
        setHasMore(data.hasMore)
        setLastTimestamp(data.lastTimestamp)
      } else {
        console.error('Error fetching tickets:', data.message)
      }
    } catch (error) {
      console.error('Error fetching tickets:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMessagesForTicket = async (ticketId: string, userId: string) => {
    setMessagesLoading(true)
    try {
      const url = new URL('/api/inbox/messages', window.location.origin)
      url.searchParams.append('uid', userId)
      url.searchParams.append('selectedCompany', selectedCompany)
      url.searchParams.append('ticketId', ticketId)

      const response = await fetch(url.toString())
      const data = await response.json()

      if (data.status === 1) {
        setMessages(data.messages)
        setTicketData(data.ticketData)
        setSubdomain(data.subdomain || '')
      } else {
        console.error('Error fetching messages:', data.message)
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setMessagesLoading(false)
    }
  }

  const handleLoadMore = async () => {
    if (!uid || !lastTimestamp || !hasMore) return

    setMoreLoading(true)
    try {
      await fetchTickets(uid, lastTimestamp)
    } catch (error) {
      console.error('Error loading more tickets:', error)
    } finally {
      setMoreLoading(false)
    }
  }

  // Handle ticket status change (open/close)
  const handleChangeStatus = async () => {
    if (!uid || !activeTicket || !ticketData) return

    const isCurrentlyOpen = ticketData.status === 'Open'
    const newStatus = isCurrentlyOpen ? 'Closed' : 'Open'
    const endpoint = isCurrentlyOpen ? '/api/inbox/ticket/close' : '/api/inbox/ticket/open'

    try {
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid,
          selectedCompany,
          ticketId: activeTicket,
        }),
      })

      const result = await response.json()

      if (result.status === 1) {
        // Update local state
        setTicketData((prev) => ({
          ...prev!,
          status: newStatus,
          closed: !isCurrentlyOpen,
        }))

        // Update ticket in sidebar
        setTickets((prevTickets) =>
          prevTickets.map((t) =>
            t.id === activeTicket
              ? {
                  ...t,
                  status: newStatus,
                  closed: !isCurrentlyOpen,
                }
              : t
          )
        )
      } else {
        console.error('Error changing ticket status:', result.message)
      }
    } catch (error) {
      console.error('Error changing ticket status:', error)
    }
  }

  // Handle AI status change (enable/disable)
  const handleChangeAIStatus = async () => {
    if (!uid || !activeTicket || !ticketData) return

    // Default to true if not set (as per React app)
    const isCurrentlyEnabled = ticketData.aiOn !== false
    const newAIStatus = !isCurrentlyEnabled
    const endpoint = newAIStatus ? '/api/inbox/ticket/ai/enable' : '/api/inbox/ticket/ai/disable'

    try {
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid,
          selectedCompany,
          ticketId: activeTicket,
        }),
      })

      const result = await response.json()

      if (result.status === 1) {
        // Update local state
        setTicketData((prev) => ({
          ...prev!,
          aiOn: newAIStatus,
        }))

        // Update ticket in sidebar
        setTickets((prevTickets) =>
          prevTickets.map((t) =>
            t.id === activeTicket
              ? {
                  ...t,
                  aiOn: newAIStatus,
                }
              : t
          )
        )
      } else {
        console.error('Error changing AI status:', result.message)
      }
    } catch (error) {
      console.error('Error changing AI status:', error)
    }
  }

  const handleTicketSelect = async (ticketId: string) => {
    setActiveTicket(ticketId)
    setSidebarOpen(false)
    // Update ticket as read locally
    setTickets((prevTickets) =>
      prevTickets.map((t) => (t.id === ticketId ? { ...t, read: true } : t))
    )
    
    // Fetch messages for this ticket
    await fetchMessages(ticketId)
  }

  const fetchMessages = async (ticketId: string) => {
    if (!uid) return

    setMessagesLoading(true)
    try {
      const url = new URL('/api/inbox/messages', window.location.origin)
      url.searchParams.append('uid', uid)
      url.searchParams.append('selectedCompany', selectedCompany)
      url.searchParams.append('ticketId', ticketId)

      const response = await fetch(url.toString())
      const data = await response.json()

      if (data.status === 1) {
        setMessages(data.messages)
        setTicketData(data.ticketData)
        setSubdomain(data.subdomain || '')
      } else {
        console.error('Error fetching messages:', data.message)
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setMessagesLoading(false)
    }
  }

  // Format timestamp for display
  function formatTimestamp(timestamp: any) {
    if (!timestamp) return 'N/A'
    
    let milliseconds = 0
    
    // Handle Firestore Timestamp object with seconds
    if (timestamp.seconds) {
      milliseconds = timestamp.seconds * 1000 + Math.floor((timestamp.nanoseconds || 0) / 1000000)
    }
    // Handle Firestore Timestamp object with _seconds (sometimes used)
    else if (timestamp._seconds) {
      milliseconds = timestamp._seconds * 1000 + Math.floor((timestamp._nanoseconds || 0) / 1000000)
    }
    // Handle Date object or milliseconds
    else {
      milliseconds = new Date(timestamp).getTime()
    }

    const date = new Date(milliseconds)
    
    if (isNaN(date.getTime())) return 'Invalid Date'

    const dateOptions: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' }
    const formattedDate = date.toLocaleDateString('en-US', dateOptions)

    const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
    const formattedTime = date.toLocaleTimeString('en-US', timeOptions)

    return `${formattedDate} ${formattedTime}`
  }

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Inbox Sidebar */}
      <div
        className={`absolute z-20 top-0 bottom-0 w-full md:w-auto md:static md:top-auto md:bottom-auto -mr-px md:translate-x-0 transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div
          ref={sidebarScrollRef}
          className="sticky top-0 bg-white dark:bg-[#151D2C] overflow-x-hidden overflow-y-auto no-scrollbar shrink-0 border-r border-gray-200 dark:border-gray-700/60 md:w-[18rem] xl:w-[20rem] h-full"
        >
          {/* Header */}
          <div className="sticky top-0 z-10">
            <div className="flex items-center bg-white dark:bg-[#151D2C] border-b border-gray-200 dark:border-gray-700/60 px-5 h-16">
              <div className="w-full flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Inbox</h2>
                {/* New ticket button - will implement later */}
                <button className="p-1.5 shrink-0 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm ml-2">
                  <svg
                    className="fill-current text-gray-400 dark:text-gray-500"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                  >
                    <path d="M11.7.3c-.4-.4-1-.4-1.4 0l-10 10c-.2.2-.3.4-.3.7v4c0 .6.4 1 1 1h4c.3 0 .5-.1.7-.3l10-10c.4-.4.4-1 0-1.4l-4-4zM4.6 14H2v-2.6l6-6L10.6 8l-6 6zM12 6.6L9.4 4 11 2.4 13.6 5 12 6.6z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-5 py-4">
            {/* Search form */}
            <form className="relative mb-4" onSubmit={(e) => e.preventDefault()}>
              <label htmlFor="inbox-search" className="sr-only">
                Search
              </label>
              <input
                id="inbox-search"
                className="form-input w-full pl-9 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:border-violet-500"
                type="search"
                placeholder="Search tickets…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button className="absolute inset-0 right-auto group" type="submit" aria-label="Search">
                <svg
                  className="shrink-0 fill-current text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400 ml-3 mr-2"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M7 14c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7zM7 2C4.243 2 2 4.243 2 7s2.243 5 5 5 5-2.243 5-5-2.243-5-5-5z" />
                  <path d="M15.707 14.293L13.314 11.9a8.019 8.019 0 01-1.414 1.414l2.393 2.393a.997.997 0 001.414 0 .999.999 0 000-1.414z" />
                </svg>
              </button>
            </form>

            {/* Create Ticket Button */}
            <div className="mb-4">
              <button className="btn w-full bg-violet-500 hover:bg-violet-600 text-white shadow-lg hover:shadow-xl transition-all duration-200">
                <svg className="w-4 h-4 fill-current opacity-50 shrink-0 mr-2" viewBox="0 0 16 16">
                  <path d="M15 7H9V1c0-.6-.4-1-1-1S7 .4 7 1v6H1c-.6 0-1 .4-1 1s.4 1 1 1h6v6c0 .6.4 1 1 1s1-.4 1-1V9h6c.6 0 1-.4 1-1s-.4-1-1-1z" />
                </svg>
                <span>Create Ticket</span>
              </button>
            </div>

            {/* Tabs */}
            <div className="relative mb-4">
              <div className="absolute bottom-0 w-full h-px bg-gray-200 dark:bg-gray-700/60" aria-hidden="true"></div>
              <ul className="relative text-sm font-medium flex flex-nowrap -mx-4 sm:-mx-6 lg:-mx-8 overflow-x-scroll no-scrollbar">
                <li className="mr-6 last:mr-0 first:pl-4 sm:first:pl-6 lg:first:pl-8 last:pr-4 sm:last:pr-6 lg:last:pr-8">
                  <a
                    className="block pb-3 text-violet-500 whitespace-nowrap border-b-2 border-violet-500"
                    href="#0"
                  >
                    Primary
                  </a>
                </li>
              </ul>
            </div>

            {/* Inbox */}
            <div className="mt-4">
              <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase mb-3">
                Inbox ({filteredTickets.length})
              </div>

              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  ))}
                </div>
              ) : filteredTickets.length <= 0 ? (
                <div className="text-center py-8">
                  <svg
                    className="inline-block w-12 h-12 text-gray-400 dark:text-gray-600 mb-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                    />
                  </svg>
                  <p className="text-gray-600 dark:text-gray-400">No tickets found</p>
                  {searchQuery && (
                    <button
                      className="mt-2 text-violet-500 hover:text-violet-600"
                      onClick={() => setSearchQuery('')}
                    >
                      Clear search
                    </button>
                  )}
                </div>
              ) : (
                <ul className="mb-6">
                  {filteredTickets.map((item) => {
                    const read = 'read' in item ? item.read : false
                    const isActive = item.id === activeTicket
                    return (
                      <li key={item.id} className="-mx-2 mb-0.5">
                        <button
                          type="button"
                          className={`flex w-full p-2 rounded-lg transition-colors duration-150 text-left ${
                            isActive
                              ? 'bg-gradient-to-r from-violet-500/[0.12] dark:from-violet-500/[0.24] to-violet-500/[0.04] border border-violet-200 dark:border-violet-800/60'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-800/50'
                          }`}
                          onClick={() => handleTicketSelect(item.id)}
                        >
                          {/* Avatar */}
                          <div
                            className={`shrink-0 mr-2 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${getAvatarColor(
                              item.from ? item.from.split('@')[0] : ''
                            )}`}
                          >
                            {getInitials(item.from)}
                          </div>
                          <div className="grow truncate">
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="truncate">
                                <span className={`text-sm font-semibold ${
                                  isActive 
                                    ? 'text-violet-700 dark:text-violet-400' 
                                    : 'text-gray-800 dark:text-gray-100'
                                }`}>
                                  Re: {item.subject}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500 font-medium flex items-center gap-1">
                                {formatTimestampToDayMonth(item.lastMessageDate || item.date)}
                                {!read && (
                                  <span className="flex-shrink-0 ml-1">
                                    <div className="h-2 w-2 rounded-full bg-orange-500"></div>
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className={`text-xs font-medium truncate mb-0.5 ${
                              isActive 
                                ? 'text-violet-600 dark:text-violet-400' 
                                : 'text-gray-800 dark:text-gray-100'
                            }`}>
                              {item.from}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                              {item.lastMessage}
                            </div>
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}

              {/* Loading indicator */}
              {moreLoading && (
                <div className="flex justify-center py-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-violet-500 border-t-transparent"></div>
                </div>
              )}

              {/* Load More Button */}
              {hasMore && !isLoading && filteredTickets.length > 0 && !searchQuery && !moreLoading && (
                <button
                  onClick={handleLoadMore}
                  className="w-full py-2 text-sm text-violet-500 hover:text-violet-600 dark:text-violet-400 dark:hover:text-violet-300 font-medium transition-colors duration-150"
                  disabled={moreLoading}
                >
                  {moreLoading ? 'Loading...' : 'Load More'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Inbox Body */}
      <div className="grow flex flex-col md:translate-x-0 transition-transform duration-300 ease-in-out overflow-hidden bg-white dark:bg-[#151D2C]">
        {!activeTicket || messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            {messagesLoading ? (
              <LoadingState />
            ) : (
              <>
                <svg
                  className="w-16 h-16 text-gray-400 dark:text-gray-600 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
                  Select a ticket to view messages
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Choose a ticket from the sidebar to see the conversation
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="sticky top-0 z-20">
              <div className="flex items-center justify-between before:absolute before:inset-0 before:backdrop-blur-md before:bg-gray-50/90 dark:before:bg-[#151D2C]/90 before:-z-10 border-b border-gray-200 dark:border-gray-700/60 px-4 sm:px-6 md:px-5 h-16">
                {/* Left side buttons */}
                <div className="flex items-center space-x-3">
                  {/* Mobile menu button */}
                  <button
                    className="md:hidden text-gray-400 hover:text-gray-500 mr-2"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    aria-controls="inbox-sidebar"
                    aria-expanded={sidebarOpen}
                  >
                    <span className="sr-only">Open sidebar</span>
                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10.7 18.7l1.4-1.4L7.8 13H20v-2H7.8l4.3-4.3-1.4-1.4L4 12z" />
                    </svg>
                  </button>

                  {/* Status badge - clickable */}
                  <button
                    className={`flex items-center justify-center px-3 py-1.5 rounded-full transition-all duration-200 font-medium text-xs shadow-sm cursor-pointer ${
                      ticketData?.status === 'Open'
                        ? 'bg-green-100 text-green-700 border border-green-200 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/60 dark:hover:bg-green-800/40'
                        : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700/60 dark:hover:bg-gray-700/40'
                    }`}
                    onClick={handleChangeStatus}
                    disabled={!ticketData}
                  >
                    <span
                      className={`w-2 h-2 rounded-full mr-1.5 ${
                        ticketData?.status === 'Open' ? 'bg-green-500 dark:bg-green-400' : 'bg-gray-400 dark:bg-gray-500'
                      }`}
                    ></span>
                    {ticketData?.status || 'Open'}
                  </button>
                </div>

                {/* Center - Ticket info */}
                <div className="hidden md:flex items-center justify-center flex-1">
                  <div className="flex flex-col items-center">
                    <h2 className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {ticketData?.subject || 'Ticket Details'}
                    </h2>
                    {ticketData?.from && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        From: {ticketData.from.split('@')[0]}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right side - AI toggle */}
                <div className="flex items-center space-x-2">
                  <div className="relative inline-flex">
                    <button
                      className={`group flex items-center justify-center px-3 py-1.5 rounded-full transition-all duration-200 text-xs shadow-sm cursor-pointer ${
                        ticketData?.aiOn !== false
                          ? 'bg-violet-100 text-violet-700 border border-violet-200 hover:bg-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800/60 dark:hover:bg-violet-800/40'
                          : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700/60 dark:hover:bg-gray-700/40'
                      }`}
                      onClick={handleChangeAIStatus}
                      disabled={!ticketData}
                      aria-label="Toggle AI"
                    >
                      <svg
                        className={`fill-current w-3 h-3 mr-1 ${
                          ticketData?.aiOn !== false ? 'text-violet-600 dark:text-violet-400' : 'text-gray-500 dark:text-gray-500'
                        }`}
                        viewBox="0 0 20 20"
                      >
                        <path d="M10 0C4.5 0 0 4.5 0 10s4.5 10 10 10 10-4.5 10-10S15.5 0 10 0zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8zm0-12.5c-2.5 0-4.5 2-4.5 4.5s2 4.5 4.5 4.5 4.5-2 4.5-4.5-2-4.5-4.5-4.5z" />
                      </svg>
                      AI {ticketData?.aiOn !== false ? 'On' : 'Off'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-5 py-4">
              {messagesLoading ? (
                <LoadingState />
              ) : (
                <>
                  {/* Info banner */}
                  <div className="mb-6">
                    <div className="flex items-start bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/60 rounded-lg p-3">
                      <svg
                        className="w-4 h-4 mt-0.5 shrink-0 fill-current text-blue-500 mr-3"
                        viewBox="0 0 16 16"
                      >
                        <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 12c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1zm1-3H7V4h2v5z" />
                      </svg>
                      <div className="text-sm">
                        <div className="font-medium text-blue-800 dark:text-blue-300 mb-0.5">
                          Support conversation
                        </div>
                        <div className="text-blue-700 dark:text-blue-400">
                          This is a conversation between you and {ticketData?.from || 'a customer'}.{' '}
                          {ticketData?.aiOn !== false ? 'AI assistance is enabled.' : 'AI assistance is disabled.'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Messages list */}
                  <div className="space-y-4 pb-[230px]">
                    {messages.map((message) => (
                      <MessageCard
                        key={message.id}
                        message={message}
                        subdomain={subdomain}
                        formatTimestamp={formatTimestamp}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Input area - only show when messages exist */}
            {messages.length > 0 && uid && activeTicket && (
              <InboxInputArea
                uid={uid}
                selectedCompany={selectedCompany}
                subdomain={subdomain}
                customDomain={ticketData?.customDomain}
                customDomainVerified={ticketData?.customDomainVerified}
                ticketId={activeTicket}
                ticketData={ticketData}
                messages={messages}
                onMessageSent={(newMessage) => {
                  // Append new message to the top of the list instead of reloading
                  setMessages((prevMessages) => [newMessage, ...prevMessages])
                  
                  // Update the ticket in the sidebar with last message
                  setTickets((prevTickets) =>
                    prevTickets.map((ticket) =>
                      ticket.id === activeTicket
                        ? {
                            ...ticket,
                            lastMessage: newMessage.body.substring(0, 100),
                            lastMessageDate: newMessage.date,
                            read: false,
                          }
                        : ticket
                    )
                  )
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

