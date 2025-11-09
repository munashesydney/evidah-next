'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { app, db } from '@/lib/firebase'
import LiveChatSessionsSidebar from '@/components/live-chat-sessions-sidebar'
import LiveChatMessagesBody from '@/components/live-chat-messages-body'

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

interface Session {
  id: string
  uid: string
  selectedCompany: string
  userInfo: {
    name?: string
    email?: string
  }
  messages: any[]
  lastMessage?: any
  messageCount: number
  lastActivity: any
  status?: string
  createdAt?: any
}

export default function LiveChatPage() {
  const params = useParams()
  const selectedCompany = params.selectedCompany as string

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [msgSidebarOpen, setMsgSidebarOpen] = useState(true)
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [uid, setUid] = useState<string | null>(null)
  const [lastDocId, setLastDocId] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const SESSIONS_PER_PAGE = 10

  // Authentication check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid)
        loadSessions(user.uid)
      }
    })

    return () => unsubscribe()
  }, [selectedCompany])

  // Load sessions
  const loadSessions = async (userId: string, isLoadMore = false) => {
    if (!userId || !selectedCompany) return

    try {
      if (isLoadMore) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }

      const url = new URL('/api/livechat/sessions', window.location.origin)
      url.searchParams.append('uid', userId)
      url.searchParams.append('selectedCompany', selectedCompany)
      url.searchParams.append('limit', SESSIONS_PER_PAGE.toString())

      if (isLoadMore && lastDocId) {
        url.searchParams.append('startAfter', lastDocId)
      }

      const response = await fetch(url.toString())
      const data = await response.json()

      if (data.status === 1) {
        if (isLoadMore) {
          setSessions((prev) => [...prev, ...data.sessions])
        } else {
          setSessions(data.sessions)
        }

        setLastDocId(data.lastDocId)
        setHasMore(data.hasMore)
      } else {
        console.error('Error fetching sessions:', data.message)
      }
    } catch (error) {
      console.error('Error fetching sessions:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const loadMoreSessions = () => {
    if (!loadingMore && hasMore && uid) {
      loadSessions(uid, true)
    }
  }

  const handleSessionSelect = async (session: Session) => {
    setSelectedSession(session)
    
    // Load full session with messages from API (initial load)
    if (uid && session.id) {
      try {
        const url = new URL(`/api/livechat/sessions/${session.id}`, window.location.origin)
        url.searchParams.append('uid', uid)
        url.searchParams.append('selectedCompany', selectedCompany)

        const response = await fetch(url.toString())
        const data = await response.json()

        if (data.status === 1) {
          setSelectedSession(data.session)
        }
      } catch (error) {
        console.error('Error fetching session:', error)
      }
    }
  }

  if (!uid) {
    return <LoadingState />
  }

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-white dark:bg-[#151D2C]">
      {/* Live Chat Sessions Sidebar */}
      <LiveChatSessionsSidebar
        msgSidebarOpen={msgSidebarOpen}
        setMsgSidebarOpen={setMsgSidebarOpen}
        sessions={sessions}
        selectedSession={selectedSession}
        onSessionSelect={handleSessionSelect}
        loading={loading}
        loadingMore={loadingMore}
        hasMore={hasMore}
        onLoadMore={loadMoreSessions}
      />

      {/* Live Chat Messages Body */}
      <div
        className={`grow flex flex-col md:translate-x-0 transition-transform duration-300 ease-in-out overflow-hidden ${
          msgSidebarOpen ? 'md:translate-x-0' : 'md:translate-x-0'
        }`}
      >
        <LiveChatMessagesBody
          selectedSession={selectedSession}
          msgSidebarOpen={msgSidebarOpen}
          setMsgSidebarOpen={setMsgSidebarOpen}
          uid={uid}
          selectedCompany={selectedCompany}
        />
      </div>
    </div>
  )
}

