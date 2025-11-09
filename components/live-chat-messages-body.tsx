'use client'

import { useState, useEffect, useRef } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
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

interface LiveChatMessagesBodyProps {
  selectedSession: Session | null
  msgSidebarOpen: boolean
  setMsgSidebarOpen: (open: boolean) => void
  uid: string
  selectedCompany: string
}

export default function LiveChatMessagesBody({
  selectedSession,
  msgSidebarOpen,
  setMsgSidebarOpen,
  uid,
  selectedCompany,
}: LiveChatMessagesBodyProps) {
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Initial load from API + real-time updates with onSnapshot
  useEffect(() => {
    if (!selectedSession || !uid || !selectedCompany) {
      setMessages([])
      return
    }

    setLoading(true)

    // First, load from API (initial load)
    const loadInitialMessages = async () => {
      try {
        const url = new URL(
          `/api/livechat/sessions/${selectedSession.id}`,
          window.location.origin
        )
        url.searchParams.append('uid', uid)
        url.searchParams.append('selectedCompany', selectedCompany)

        const response = await fetch(url.toString())
        const data = await response.json()

        if (data.status === 1 && data.session) {
          setMessages(data.session.messages || [])
        }
      } catch (error) {
        console.error('Error fetching initial messages:', error)
      } finally {
        setLoading(false)
      }
    }

    loadInitialMessages()

    // Then set up real-time listener
    const sessionDocRef = doc(
      db,
      `Users/${uid}/knowledgebases/${selectedCompany}/livechat/default/sessions/${selectedSession.id}`
    )

    const unsubscribe = onSnapshot(
      sessionDocRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data()
          const rawMessages = data.messages || []
          const deduplicatedMessages = deduplicateMessages(rawMessages)
          setMessages(deduplicatedMessages)
        } else {
          setMessages([])
        }
        setLoading(false)
      },
      (error) => {
        console.error('Error fetching messages:', error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [selectedSession, uid, selectedCompany])

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

  const deduplicateMessages = (messages: any[]): any[] => {
    if (!messages || messages.length === 0) return messages

    const deduplicated: any[] = []
    let lastBotMessage: any = null

    for (let i = 0; i < messages.length; i++) {
      const currentMessage = messages[i]

      // Always keep user messages
      if (currentMessage.type === 'user') {
        deduplicated.push(currentMessage)
        lastBotMessage = null
        continue
      }

      // For bot messages, check if it's a duplicate
      if (currentMessage.type === 'bot') {
        const lastTimestamp = lastBotMessage?.timestamp
          ? lastBotMessage.timestamp.seconds * 1000 +
            Math.floor((lastBotMessage.timestamp.nanoseconds || 0) / 1000000)
          : 0
        const currentTimestamp = currentMessage.timestamp
          ? currentMessage.timestamp.seconds * 1000 +
            Math.floor((currentMessage.timestamp.nanoseconds || 0) / 1000000)
          : 0

        const isDuplicate =
          lastBotMessage &&
          lastBotMessage.type === 'bot' &&
          lastBotMessage.content === currentMessage.content &&
          Math.abs(lastTimestamp - currentTimestamp) < 5000 // Within 5 seconds

        if (!isDuplicate) {
          deduplicated.push(currentMessage)
          lastBotMessage = currentMessage
        }
      }
    }

    return deduplicated
  }

  // Simple markdown/HTML renderer
  const renderMessageContent = (content: string) => {
    if (!content) return ''
    
    // Basic HTML rendering (sanitize in production)
    return content
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 rounded">$1</code>')
  }

  if (!selectedSession) {
    return (
      <div className="grow flex flex-col bg-white dark:bg-[#151D2C]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700/60">
          <div className="flex items-center space-x-3">
            <button
              className="md:hidden"
              onClick={() => setMsgSidebarOpen(!msgSidebarOpen)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Live Chat</h2>
          </div>
        </div>

        {/* Empty State */}
        <div className="grow flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-400 dark:text-gray-500 mb-4">
              <svg
                className="w-16 h-16 mx-auto"
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
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Select a chat session
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Choose a customer from the sidebar to view their conversation
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="grow flex flex-col bg-white dark:bg-[#151D2C]">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-[#151D2C] border-b border-gray-200 dark:border-gray-700/60">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <button
              className="md:hidden"
              onClick={() => setMsgSidebarOpen(!msgSidebarOpen)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>

            {/* Customer Info */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium text-sm">
                {getInitials(selectedSession.userInfo?.name)}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                  {selectedSession.userInfo?.name || 'Unknown User'}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedSession.userInfo?.email || 'No email'}
                </p>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span className="text-sm text-gray-500 dark:text-gray-400">New</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 px-4 sm:px-6 md:px-5 py-6 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">No messages yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => {
              const isUser = message.type === 'user'
              const showDate =
                index === 0 ||
                (messages[index - 1] &&
                  formatDate(message.timestamp) !== formatDate(messages[index - 1].timestamp))

              return (
                <div key={message.id || index}>
                  {/* Date Separator */}
                  {showDate && (
                    <div className="flex justify-center my-4">
                      <div className="inline-flex items-center justify-center text-xs text-gray-600 dark:text-gray-400 font-medium px-2.5 py-1 bg-white dark:bg-gray-700 shadow-sm rounded-full">
                        {formatDate(message.timestamp)}
                      </div>
                    </div>
                  )}

                  {/* Message */}
                  <div
                    className={`flex items-start mb-4 last:mb-0 ${
                      isUser ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {!isUser && (
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium text-xs mr-3 flex-shrink-0 overflow-hidden">
                        <Image
                          src="/images/characters/mq.png"
                          alt="Marquavious"
                          width={32}
                          height={32}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div className={`max-w-xs lg:max-w-md ${isUser ? 'order-1' : 'order-2'} relative`}>
                      <div
                        className={`text-sm p-3 rounded-lg ${
                          isUser
                            ? 'bg-blue-500 text-white rounded-br-none'
                            : 'bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-none'
                        }`}
                      >
                        <div
                          className="prose prose-sm dark:prose-invert max-w-none"
                          dangerouslySetInnerHTML={{
                            __html: renderMessageContent(message.content || ''),
                          }}
                        />
                      </div>

                      <div
                        className={`flex items-center justify-between mt-1 ${
                          isUser ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTime(message.timestamp)}
                        </div>
                        {isUser && (
                          <svg
                            className="w-3 h-3 shrink-0 fill-current text-gray-400"
                            viewBox="0 0 12 12"
                          >
                            <path d="M10.28 1.28L3.989 7.575 1.695 5.28A1 1 0 00.28 6.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 1.28z" />
                          </svg>
                        )}
                      </div>
                    </div>

                    {isUser && (
                      <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-medium text-xs ml-3 flex-shrink-0">
                        {getInitials(selectedSession.userInfo?.name)}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Sticky Footer - Read Only */}
      <div className="sticky bottom-0 z-10 bg-white dark:bg-[#151D2C] border-t border-gray-200 dark:border-gray-700/60">
        <div className="flex items-center justify-center p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This is a read-only view of the customer conversation
          </p>
        </div>
      </div>
    </div>
  )
}

