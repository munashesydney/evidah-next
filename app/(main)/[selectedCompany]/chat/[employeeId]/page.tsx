'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { getFirestore, collection, query, orderBy, getDocs, doc, setDoc, Timestamp, where, limit } from 'firebase/firestore'
import Assistant from '@/components/chat/assistant'
import ToolsPanel from '@/components/chat/tools-panel'
import { Menu, X, MessageSquarePlus } from 'lucide-react'
import useConversationStore from '@/stores/chat/useConversationStore'

interface Employee {
  id: string
  name: string
  role: string
  theme: {
    primary: string
    gradient: string
  }
}

const employees: Record<string, Employee> = {
  charlie: {
    id: 'charlie',
    name: 'Charlie',
    role: 'Customer Support',
    theme: {
      primary: '#D97706',
      gradient: 'from-amber-500 to-orange-600',
    },
  },
  marquavious: {
    id: 'marquavious',
    name: 'Marquavious',
    role: 'Live Chat Specialist',
    theme: {
      primary: '#2563EB',
      gradient: 'from-blue-500 to-blue-700',
    },
  },
  emma: {
    id: 'emma',
    name: 'Emma',
    role: 'Knowledge Management',
    theme: {
      primary: '#DB2777',
      gradient: 'from-pink-500 to-pink-700',
    },
  },
  'sung-wen': {
    id: 'sung-wen',
    name: 'Sung Wen',
    role: 'Training Specialist',
    theme: {
      primary: '#059669',
      gradient: 'from-emerald-500 to-emerald-700',
    },
  },
}

interface Chat {
  id: string
  title: string
  agentId: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const selectedCompany = params.selectedCompany as string
  const employeeId = params.employeeId as string
  
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [isToolsPanelOpen, setIsToolsPanelOpen] = useState(false)
  const [isChatSidebarOpen, setIsChatSidebarOpen] = useState(false)
  const [chats, setChats] = useState<Chat[]>([])
  const [activeChat, setActiveChat] = useState<Chat | null>(null)
  
  const { resetConversation } = useConversationStore()
  const db = getFirestore()

  // Authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid)
      } else {
        router.push('/signin')
      }
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  // Set employee data
  useEffect(() => {
    if (employeeId) {
      const emp = employees[employeeId]
      if (emp) {
        setEmployee(emp)
      } else {
        // Invalid employee, redirect back
        router.push(`/${selectedCompany}`)
      }
    }
  }, [employeeId, selectedCompany, router])

  // Load chats for this employee
  useEffect(() => {
    const loadChats = async () => {
      if (!userId || !selectedCompany || !employeeId) return

      try {
        const chatsRef = collection(db, 'Users', userId, 'knowledgebases', selectedCompany, 'aiChats')
        const q = query(
          chatsRef,
          where('agentId', '==', employeeId),
          orderBy('updatedAt', 'desc'),
          limit(20)
        )
        
        const querySnapshot = await getDocs(q)
        const chatsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as Chat))

        setChats(chatsData)
      } catch (error) {
        console.error('Error loading chats:', error)
      }
    }

    loadChats()
  }, [userId, selectedCompany, employeeId, db])

  // Create new chat
  const handleNewChat = async () => {
    if (!userId || !selectedCompany || !employeeId) return

    try {
      const chatId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const chatRef = doc(db, 'Users', userId, 'knowledgebases', selectedCompany, 'aiChats', chatId)
      
      const newChat: Chat = {
        id: chatId,
        title: 'New Chat',
        agentId: employeeId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }

      await setDoc(chatRef, newChat)
      
      setChats(prev => [newChat, ...prev])
      setActiveChat(newChat)
      resetConversation()
    } catch (error) {
      console.error('Error creating chat:', error)
    }
  }

  if (isLoading || !employee) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-900">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900">
      {/* Chat Sidebar - Mobile Drawer */}
      {isChatSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsChatSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-80 bg-white dark:bg-gray-800 shadow-xl">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Chats</h2>
              <button onClick={() => setIsChatSidebarOpen(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <X size={20} />
              </button>
            </div>
            <div className="p-4">
              <button
                onClick={handleNewChat}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white rounded-lg transition-colors mb-4"
              >
                <MessageSquarePlus size={18} />
                New Chat
              </button>
              <div className="space-y-2">
                {chats.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => {
                      setActiveChat(chat)
                      setIsChatSidebarOpen(false)
                    }}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      activeChat?.id === chat.id
                        ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-900 dark:text-violet-100'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="text-sm font-medium truncate">{chat.title}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {chat.updatedAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsChatSidebarOpen(true)}
              className="md:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <Menu size={24} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{employee.name}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{employee.role}</p>
            </div>
          </div>
          <button
            onClick={() => setIsToolsPanelOpen(!isToolsPanelOpen)}
            className="md:hidden px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white rounded-lg transition-colors"
          >
            Tools
          </button>
        </div>

        {/* Chat Content */}
        <div className="flex-1 overflow-hidden">
          <Assistant />
        </div>
      </div>

      {/* Tools Panel - Desktop */}
      <div className="hidden md:block w-[350px] border-l border-gray-200 dark:border-gray-700 overflow-hidden">
        <ToolsPanel />
      </div>

      {/* Tools Panel - Mobile Overlay */}
      {isToolsPanelOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsToolsPanelOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-white dark:bg-gray-800 shadow-xl overflow-y-auto">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Tools</h2>
              <button onClick={() => setIsToolsPanelOpen(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <X size={20} />
              </button>
            </div>
            <ToolsPanel />
          </div>
        </div>
      )}
    </div>
  )
}

