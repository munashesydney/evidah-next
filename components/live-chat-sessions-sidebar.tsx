'use client'

import { useState } from 'react'
import Image from 'next/image'

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

interface LiveChatSessionsSidebarProps {
  msgSidebarOpen: boolean
  setMsgSidebarOpen: (open: boolean) => void
  sessions: Session[]
  selectedSession: Session | null
  onSessionSelect: (session: Session) => void
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  onLoadMore: () => void
}

export default function LiveChatSessionsSidebar({
  msgSidebarOpen,
  setMsgSidebarOpen,
  sessions,
  selectedSession,
  onSessionSelect,
  loading,
  loadingMore,
  hasMore,
  onLoadMore,
}: LiveChatSessionsSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const formatTime = (timestamp: any) => {
    if (!timestamp) return ''
    let date: Date

    if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000)
    } else if (timestamp._seconds) {
      date = new Date(timestamp._seconds * 1000)
    } else if (timestamp.toDate) {
      date = timestamp.toDate()
    } else {
      date = new Date(timestamp)
    }

    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return ''
    let date: Date

    if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000)
    } else if (timestamp._seconds) {
      date = new Date(timestamp._seconds * 1000)
    } else if (timestamp.toDate) {
      date = timestamp.toDate()
    } else {
      date = new Date(timestamp)
    }

    return date.toLocaleDateString()
  }

  const getInitials = (name?: string) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getStatusColor = (session: Session) => {
    if (!session.lastActivity) return 'bg-gray-400'

    let effectiveStatus = session.status || 'New'
    let createdAt: Date

    if (session.createdAt) {
      if (session.createdAt.seconds) {
        createdAt = new Date(session.createdAt.seconds * 1000)
      } else if (session.createdAt._seconds) {
        createdAt = new Date(session.createdAt._seconds * 1000)
      } else if (session.createdAt.toDate) {
        createdAt = session.createdAt.toDate()
      } else {
        createdAt = new Date(session.createdAt)
      }
    } else {
      return 'bg-gray-400'
    }

    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    if (effectiveStatus === 'New' && createdAt < oneDayAgo) {
      effectiveStatus = 'Queued'
    }

    switch (effectiveStatus) {
      case 'New':
        return 'bg-blue-500'
      case 'Queued':
      case 'Waiting':
        return 'bg-yellow-500'
      case 'Resolved':
        return 'bg-green-500'
      case 'Escalated':
        return 'bg-red-500'
      default:
        return 'bg-gray-400'
    }
  }

  // Filter sessions based on search
  const filteredSessions = sessions.filter(
    (session) =>
      session.userInfo?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.userInfo?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.lastMessage?.content?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div
      id="messages-sidebar"
      className={`absolute z-20 top-0 bottom-0 w-full md:w-auto md:static md:top-auto md:bottom-auto -mr-px md:translate-x-0 transition-transform duration-200 ease-in-out ${
        msgSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="sticky top-0 bg-white dark:bg-[#151D2C] overflow-x-hidden overflow-y-auto no-scrollbar shrink-0 border-r border-gray-200 dark:border-gray-700/60 md:w-[18rem] xl:w-[20rem] h-full">
        {/* Header */}
        <div className="sticky top-0 z-10">
          <div className="flex items-center bg-white dark:bg-[#151D2C] border-b border-gray-200 dark:border-gray-700/60 px-5 h-16">
            <div className="w-full flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                Live Chat Sessions
              </h2>
              <button className="p-1.5 shrink-0 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm">
                <svg
                  className="fill-current text-gray-400 dark:text-gray-500"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                >
                  <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Marquavious Status Card */}
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700/60">
          <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium text-sm overflow-hidden">
                  <Image
                    src="/images/characters/mq.png"
                    alt="Marquavious"
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-white dark:border-gray-800"></div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                  Marquavious Working
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">Live Chat Specialist</p>
                <div className="flex items-center mt-1">
                  <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                    Online & Available
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="px-5 py-4">
          <form
            className="relative"
            onSubmit={(e) => {
              e.preventDefault()
            }}
          >
            <label htmlFor="session-search" className="sr-only">
              Search sessions
            </label>
            <input
              id="session-search"
              className="form-input w-full pl-9 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:border-violet-500"
              type="search"
              placeholder="Search customers..."
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
        </div>

        {/* Sessions List */}
        <div className="px-5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 dark:text-gray-500 mb-2">
                <svg
                  className="w-12 h-12 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {searchQuery ? 'No sessions match your search' : 'No active chat sessions'}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                {filteredSessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => onSessionSelect(session)}
                    className={`w-full text-left p-3 rounded-lg transition-colors duration-200 ${
                      selectedSession?.id === session.id
                        ? 'bg-gradient-to-r from-violet-500/[0.12] dark:from-violet-500/[0.24] to-violet-500/[0.04] border border-violet-200 dark:border-violet-800/60'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium text-sm">
                          {getInitials(session.userInfo?.name)}
                        </div>
                        <div
                          className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${getStatusColor(session)}`}
                        ></div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {session.userInfo?.name || 'Unknown User'}
                          </h3>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatTime(session.lastActivity)}
                          </span>
                        </div>

                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          {session.userInfo?.email || 'No email'}
                        </p>

                        <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                          {session.lastMessage?.content || 'No messages yet'}
                        </p>

                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {session.messageCount} messages
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {formatDate(session.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Load More Button */}
              {hasMore && (
                <div className="py-4">
                  <button
                    onClick={onLoadMore}
                    disabled={loadingMore}
                    className={`w-full py-2 px-4 rounded-lg border transition-colors duration-200 ${
                      loadingMore
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 cursor-not-allowed'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                  >
                    {loadingMore ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                        <span>Loading...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-2">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                        <span>Load More Sessions</span>
                      </div>
                    )}
                  </button>
                </div>
              )}

              {/* End of sessions indicator */}
              {!hasMore && filteredSessions.length > 0 && (
                <div className="py-4 text-center">
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    You've reached the end of all sessions
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

