'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { auth, db } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, query, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore'
import ChatMessages from '@/components/chat/chat-messages'
import ChatInput from '@/components/chat/chat-input'
import ToolsPanel from '@/components/chat/tools-panel'
import ChatListSidebar from '@/components/chat/chat-list-sidebar'
import useConversationStore from '@/stores/chat/useConversationStore'
import useChatListStore, { Chat } from '@/stores/chat/useChatListStore'
import useToolsStore, { ToolsState } from '@/stores/chat/useToolsStore'
import { convertMessagesToItems } from '@/lib/chat/message-converter'
import { Message } from '@/lib/services/message-service'
import type { Item, MessageItem, ContentItem } from '@/lib/chat/assistant'

import { employees, type Employee } from '@/lib/services/employee-helpers'
import type { ToolCallItem } from '@/lib/chat/assistant'

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const { theme, resolvedTheme } = useTheme()
  const selectedCompany = params.selectedCompany as string
  const employeeId = params.employeeId as string
  
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [access, setAccess] = useState({
    emma: false,
    sungWen: false,
    marquavious: false,
    charlie: false,
    evidahQ: false,
  })
  const [isAIOptionsPanelOpen, setIsAIOptionsPanelOpen] = useState(false)
  const [personalityLevel, setPersonalityLevel] = useState(2)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [mode, setMode] = useState<'chat' | 'agent'>('agent')
  const activeListenersRef = useRef<{ unsubscribe: () => void; chatId: string }[]>([])
  
  const { chatMessages, setChatMessages, resetConversation, isAssistantLoading } = useConversationStore()
  const { chats, activeChat, setChats, setActiveChat, addChat, removeChat, setLoading: setChatListLoading } = useChatListStore()
  const toolsStore = useToolsStore()
  
  const isDarkMode = resolvedTheme === 'dark' || theme === 'dark'

  // Authentication and access control
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid)
        
        // Fetch access control
        try {
          const kbRef = doc(db, 'Users', user.uid, 'knowledgebases', selectedCompany)
          const kbDoc = await getDoc(kbRef)
          
          if (kbDoc.exists()) {
            const kbData = kbDoc.data()
            const accessData = {
              emma: kbData.emma === true,
              sungWen: kbData.sungWen === true,
              marquavious: kbData.marquavious === true,
              charlie: kbData.charlie === true,
              evidahQ: kbData.evidahQ === true,
            }
            setAccess(accessData)
            
            // Check if employee is available, redirect if not
            let isAvailable = false
            switch (employeeId) {
              case 'charlie':
                isAvailable = accessData.charlie || accessData.evidahQ
                break
              case 'marquavious':
                isAvailable = accessData.marquavious || accessData.evidahQ
                break
              case 'emma':
                isAvailable = accessData.emma || accessData.evidahQ
                break
              case 'sung-wen':
                isAvailable = accessData.sungWen || accessData.evidahQ
                break
              default:
                isAvailable = false
            }
            
            if (!isAvailable) {
              router.push(`/${selectedCompany}/settings/plans`)
              return
            }
          }
        } catch (error) {
          console.error('Error fetching access control:', error)
        }
      } else {
        router.push('/signin')
      }
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [router, selectedCompany, employeeId])

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

  // Cleanup when employee changes
  useEffect(() => {
    return () => {
      // Reset stores when navigating away
      const { reset: resetChatList } = useChatListStore.getState()
      resetChatList()
    }
  }, [employeeId])

  // Reconnect to job streaming when switching back to a chat with an active job
  const reconnectToJobStreaming = async (chatId: string, jobId: string, token: string) => {
    if (!userId || !selectedCompany) return

    console.log(`[CHAT PAGE] 🔄 Reconnecting to job streaming: ${jobId}`)

    const { addChatMessage, setChatMessages, setAssistantLoading } = useConversationStore.getState()

    // Set up real-time listener for job streaming updates
    const updatesRef = collection(
      db,
      `Users/${userId}/knowledgebases/${selectedCompany}/chatJobs/${jobId}/updates`
    )
    const updatesQuery = query(updatesRef, orderBy('timestamp', 'asc'))

    // Track streaming state
    let streamingMessageId: string | null = null
    let streamingAssistantText = ''
    const processedUpdateIds = new Set<string>()

    // Helpers for streaming assistant message into the UI
    const ensureStreamingMessage = () => {
      if (streamingMessageId) return
      streamingMessageId = `stream-${Date.now()}`
      addChatMessage({
        type: 'message',
        role: 'assistant',
        id: streamingMessageId,
        content: [
          {
            type: 'output_text',
            text: '',
          },
        ],
      })
    }

    const updateStreamingMessage = (text: string) => {
      if (!streamingMessageId) return
      const { chatMessages } = useConversationStore.getState()
      const updated: Item[] = chatMessages.map((item: Item) => {
        if (item.id === streamingMessageId && item.type === 'message') {
          const existingContent = item.content?.[0]
          const contentItem: ContentItem =
            existingContent && existingContent.type === 'output_text'
              ? existingContent
              : { type: 'output_text' as const, text: '' }
          const updatedItem: MessageItem = {
            ...item,
            content: [
              {
                ...contentItem,
                type: 'output_text' as const,
                text,
              },
            ],
          }
          return updatedItem
        }
        return item
      })
      setChatMessages(updated)
    }

    const handleToolCallStart = (data: any) => {
      if (!data?.id) return
      const store = useConversationStore.getState()
      const { chatMessages, addChatMessage } = store
      const setMessages = store.setChatMessages
      const toolType =
        (data.toolType as ToolCallItem['tool_type']) ||
        (data.name === 'file_search'
          ? 'file_search_call'
          : data.name === 'web_search'
            ? 'web_search_call'
            : 'function_call')

      const existing = chatMessages.find(item => item.type === 'tool_call' && item.id === data.id) as ToolCallItem | undefined
      if (existing) {
        const updated: Item[] = chatMessages.map(item => {
          if (item.type === 'tool_call' && item.id === data.id) {
            const updatedItem: ToolCallItem = {
              ...item,
              status: 'in_progress' as const,
              name: data.name ?? item.name,
              arguments:
                typeof data.arguments === 'string'
                  ? data.arguments
                  : data.arguments
                    ? JSON.stringify(data.arguments)
                    : item.arguments,
            }
            return updatedItem
          }
          return item
        })
        setMessages(updated)
        return
      }

      const serializedArgs =
        typeof data.arguments === 'string'
          ? data.arguments
          : data.arguments
            ? JSON.stringify(data.arguments)
            : undefined

      addChatMessage({
        type: 'tool_call',
        tool_type: toolType,
        status: 'in_progress',
        id: data.id,
        name: data.name ?? null,
        arguments: serializedArgs,
        output: null,
      })
    }

    const handleToolCallComplete = (data: any) => {
      if (!data?.id) return
      const store = useConversationStore.getState()
      const { chatMessages } = store
      const setMessages = store.setChatMessages
      let changed = false
      const updated: Item[] = chatMessages.map(item => {
        if (item.type === 'tool_call' && item.id === data.id) {
          changed = true
          const updatedItem: ToolCallItem = {
            ...item,
            status: 'completed' as const,
            output: data.result ? JSON.stringify(data.result) : item.output,
          }
          return updatedItem
        }
        return item
      })
      if (changed) {
        setMessages(updated)
      }
    }

    // Listen to real-time updates from the job
    const unsubscribe = onSnapshot(
      updatesQuery,
      async (snapshot) => {
        // Only process updates if this is still the active chat
        const currentActiveChatId = useChatListStore.getState().activeChat?.id
        if (chatId !== currentActiveChatId) {
          console.log(`[CHAT PAGE] Ignoring update - chat switched`)
          return
        }

        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const updateId = change.doc.id
            if (processedUpdateIds.has(updateId)) return
            processedUpdateIds.add(updateId)

            const updateData = change.doc.data()
            const event = {
              type: updateData.type,
              data: updateData.data,
            }

            console.log(`[CHAT PAGE] 📡 Received streaming update: ${event.type}`)

            switch (event.type) {
              case 'message_delta':
                {
                  const deltaText = event.data?.delta || event.data?.textDelta || ''
                  const cumulativeText = event.data?.text || (streamingAssistantText + deltaText)
                  if (cumulativeText) {
                    ensureStreamingMessage()
                    streamingAssistantText = cumulativeText
                    updateStreamingMessage(streamingAssistantText)
                  }
                }
                break

              case 'tool_call_start':
                console.log('🔧 Tool call started:', event.data.name)
                handleToolCallStart(event.data)
                break

              case 'tool_call_complete':
                console.log('✅ Tool call completed:', event.data.name)
                handleToolCallComplete(event.data)
                break

              case 'assistant_message_saved':
                console.log('💾 Message saved:', event.data.messageNumber)
                // Reload messages from database to get the final saved message
                setTimeout(async () => {
                  try {
                    const messagesResponse = await fetch(
                      `/api/chat/${chatId}/messages/list?companyId=${selectedCompany}&page=1&limit=100`,
                      {
                        headers: {
                          Authorization: `Bearer ${token}`,
                        },
                      }
                    )

                    if (messagesResponse.ok) {
                      const data = await messagesResponse.json()
                      const { convertMessagesToItems, convertMessagesToConversationHistory } = await import('@/lib/chat/message-converter')
                      const items = convertMessagesToItems(data.messages)
                      const conversationHistory = convertMessagesToConversationHistory(data.messages)

                      const { setConversationItems } = useConversationStore.getState()
                      setChatMessages(items)
                      setConversationItems(conversationHistory)
                      streamingMessageId = null
                      streamingAssistantText = ''
                    }
                  } catch (error) {
                    console.error('[CHAT PAGE] Error reloading messages:', error)
                  }
                }, 500)
                break

              case 'error':
                console.error('❌ Error:', event.data.error)
                setAssistantLoading(false)
                unsubscribe()
                break
            }
          }
        })
      },
      (error) => {
        console.error('[CHAT PAGE] Error listening to job updates:', error)
        setAssistantLoading(false)
      }
    )

    // Store the listener so we can clean it up when switching chats
    activeListenersRef.current.push({ unsubscribe, chatId })

    // Also set up a listener to check when job is completed
    const jobRef = doc(db, `Users/${userId}/knowledgebases/${selectedCompany}/chatJobs/${jobId}`)
    const jobUnsubscribe = onSnapshot(jobRef, (jobDoc) => {
      const currentActiveChatId = useChatListStore.getState().activeChat?.id
      if (chatId !== currentActiveChatId) {
        return
      }

      if (jobDoc.exists()) {
        const jobData = jobDoc.data()
        if (jobData.status === 'completed' || jobData.status === 'failed') {
          console.log(`[CHAT PAGE] Job ${jobId} ${jobData.status}`)
          setAssistantLoading(false)
          unsubscribe()
          jobUnsubscribe()
        }
      }
    })
  }

  // Load chats for this employee
  useEffect(() => {
    const loadChats = async () => {
      if (!userId || !selectedCompany || !employeeId) return

      try {
        setChatListLoading(true)
        const token = await auth.currentUser?.getIdToken()
        if (!token) {
          throw new Error('Not authenticated')
        }

        const response = await fetch(
          `/api/chat/list?companyId=${selectedCompany}&employeeId=${employeeId}&page=1&limit=20`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )

        if (!response.ok) {
          throw new Error('Failed to load chats')
        }

        const data = await response.json()
        setChats(data.chats || [])
        
        // Check if there's a chatId in the URL query params
        const urlParams = new URLSearchParams(window.location.search)
        const chatIdFromUrl = urlParams.get('chatId')
        
        if (chatIdFromUrl) {
          // Find the chat in the loaded chats
          const chatToLoad = data.chats.find((c: Chat) => c.id === chatIdFromUrl)
          if (chatToLoad) {
            // Load this chat automatically
            await loadChatMessages(chatToLoad)
          }
        }
      } catch (error) {
        console.error('Error loading chats:', error)
      } finally {
        setChatListLoading(false)
      }
    }

    loadChats()
  }, [userId, selectedCompany, employeeId])

  // Load messages for a chat
  const loadChatMessages = async (chat: Chat) => {
    if (!userId || !selectedCompany) return

    try {
      setIsLoadingMessages(true)
      setActiveChat(chat)
      
      // Clean up any active listeners from previous chats
      activeListenersRef.current.forEach(({ unsubscribe, chatId }) => {
        if (chatId !== chat.id) {
          console.log(`[CHAT PAGE] Cleaning up listener for chat: ${chatId}`)
          unsubscribe()
        }
      })
      activeListenersRef.current = activeListenersRef.current.filter(l => l.chatId === chat.id)
      
      // Save active chat to localStorage for persistence
      localStorage.setItem(`activeChat_${selectedCompany}_${employeeId}`, chat.id)
      
      const token = await auth.currentUser?.getIdToken()
      if (!token) {
        throw new Error('Not authenticated')
      }

      // Load messages
      const response = await fetch(
        `/api/chat/${chat.id}/messages/list?companyId=${selectedCompany}&page=1&limit=100`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to load messages')
      }

      const data = await response.json()
      const messages = data.messages as Message[]
      
      console.log('📥 === LOADING MESSAGES FROM DATABASE ===')
      console.log('📊 Total messages loaded:', messages.length)
      
      // Convert API messages to UI items
      const items = convertMessagesToItems(messages)
      console.log('📊 Converted to', items.length, 'UI items')
      
      // Convert messages to conversation history format for API calls
      const { convertMessagesToConversationHistory } = await import('@/lib/chat/message-converter')
      const conversationHistory = convertMessagesToConversationHistory(messages)
      console.log('💬 Conversation history items:', conversationHistory.length)
      console.log('🏁 === LOADING COMPLETE ===')
      
      // Update both UI items and conversation history
      const { setConversationItems, setAssistantLoading } = useConversationStore.getState()
      setChatMessages(items)
      setConversationItems(conversationHistory)

      // Check if there's an active job for this chat
      console.log(`[CHAT PAGE] Checking for active jobs for chat: ${chat.id}`)
      const activeJobResponse = await fetch(
        `/api/chat/${chat.id}/active-job?companyId=${selectedCompany}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (activeJobResponse.ok) {
        const activeJobData = await activeJobResponse.json()
        
        if (activeJobData.activeJob) {
          const jobId = activeJobData.activeJob.id
          console.log(`[CHAT PAGE] 🔄 Found active job: ${jobId}, reconnecting to streaming...`)
          
          // Set loading state to show "Thinking" indicator
          setAssistantLoading(true)
          
          // Reconnect to job streaming updates
          await reconnectToJobStreaming(chat.id, jobId, token)
        } else {
          console.log(`[CHAT PAGE] ✅ No active jobs for this chat`)
          setAssistantLoading(false)
        }
      } else {
        console.warn(`[CHAT PAGE] Failed to check for active jobs`)
        setAssistantLoading(false)
      }
    } catch (error) {
      console.error('Error loading messages:', error)
      resetConversation()
    } finally {
      setIsLoadingMessages(false)
    }
  }

  // Create new chat - just clear active chat to show centered input
  const handleNewChat = () => {
    setActiveChat(null)
    resetConversation()
    // Clear the saved active chat from localStorage
    localStorage.removeItem(`activeChat_${selectedCompany}_${employeeId}`)
  }

  // Delete a chat
  const handleDeleteChat = async (chatId: string) => {
    if (!userId || !selectedCompany) return

    try {
      const token = await auth.currentUser?.getIdToken()
      if (!token) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(`/api/chat/${chatId}/delete?companyId=${selectedCompany}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to delete chat')
      }

      removeChat(chatId)
      
      // If the deleted chat was active, reset conversation
      if (activeChat?.id === chatId) {
        setActiveChat(null)
        resetConversation()
        
        // Load the first available chat if any
        if (chats.length > 1) {
          const nextChat = chats.find(c => c.id !== chatId)
          if (nextChat) {
            await loadChatMessages(nextChat)
          }
        }
      }
    } catch (error) {
      console.error('Error deleting chat:', error)
    }
  }

  const handleChangeAssistant = () => {
    // Navigate back to employee selection
    router.push(`/${selectedCompany}/chat`)
  }

  // Get irregular gradient style for employee theme
  const getEmployeeGradientStyle = (employeeId: string, isDark: boolean = false) => {
    if (isDark) {
      switch (employeeId) {
        case 'charlie':
          return { 
            backgroundImage: `
              radial-gradient(ellipse 80% 60% at 45% 50%, rgba(217, 119, 6, 0.06) 0%, transparent 50%),
              radial-gradient(ellipse 60% 80% at 55% 50%, rgba(217, 119, 6, 0.04) 0%, transparent 50%),
              radial-gradient(ellipse 100% 40% at 50% 60%, rgba(217, 119, 6, 0.03) 0%, transparent 60%)
            `
          }
        case 'marquavious':
          return { 
            backgroundImage: `
              radial-gradient(ellipse 80% 60% at 45% 50%, rgba(37, 99, 235, 0.06) 0%, transparent 50%),
              radial-gradient(ellipse 60% 80% at 55% 50%, rgba(37, 99, 235, 0.04) 0%, transparent 50%),
              radial-gradient(ellipse 100% 40% at 50% 60%, rgba(37, 99, 235, 0.03) 0%, transparent 60%)
            `
          }
        case 'emma':
          return { 
            backgroundImage: `
              radial-gradient(ellipse 80% 60% at 45% 50%, rgba(219, 39, 119, 0.06) 0%, transparent 50%),
              radial-gradient(ellipse 60% 80% at 55% 50%, rgba(219, 39, 119, 0.04) 0%, transparent 50%),
              radial-gradient(ellipse 100% 40% at 50% 60%, rgba(219, 39, 119, 0.03) 0%, transparent 60%)
            `
          }
        case 'sung-wen':
          return { 
            backgroundImage: `
              radial-gradient(ellipse 80% 60% at 45% 50%, rgba(5, 150, 105, 0.06) 0%, transparent 50%),
              radial-gradient(ellipse 60% 80% at 55% 50%, rgba(5, 150, 105, 0.04) 0%, transparent 50%),
              radial-gradient(ellipse 100% 40% at 50% 60%, rgba(5, 150, 105, 0.03) 0%, transparent 60%)
            `
          }
        default:
          return { 
            backgroundImage: `
              radial-gradient(ellipse 80% 60% at 45% 50%, rgba(107, 114, 128, 0.06) 0%, transparent 50%),
              radial-gradient(ellipse 60% 80% at 55% 50%, rgba(107, 114, 128, 0.04) 0%, transparent 50%),
              radial-gradient(ellipse 100% 40% at 50% 60%, rgba(107, 114, 128, 0.03) 0%, transparent 60%)
            `
          }
      }
    } else {
      switch (employeeId) {
        case 'charlie':
          return { 
            backgroundImage: `
              radial-gradient(ellipse 80% 60% at 45% 50%, rgba(255, 251, 235, 0.4) 0%, rgba(254, 243, 199, 0.2) 30%, transparent 60%),
              radial-gradient(ellipse 60% 80% at 55% 50%, rgba(254, 243, 199, 0.3) 0%, transparent 50%),
              radial-gradient(ellipse 100% 40% at 50% 60%, rgba(255, 251, 235, 0.2) 0%, transparent 50%)
            `
          }
        case 'marquavious':
          return { 
            backgroundImage: `
              radial-gradient(ellipse 80% 60% at 45% 50%, rgba(239, 246, 255, 0.4) 0%, rgba(219, 234, 254, 0.2) 30%, transparent 60%),
              radial-gradient(ellipse 60% 80% at 55% 50%, rgba(219, 234, 254, 0.3) 0%, transparent 50%),
              radial-gradient(ellipse 100% 40% at 50% 60%, rgba(239, 246, 255, 0.2) 0%, transparent 50%)
            `
          }
        case 'emma':
          return { 
            backgroundImage: `
              radial-gradient(ellipse 80% 60% at 45% 50%, rgba(253, 244, 255, 0.4) 0%, rgba(252, 231, 243, 0.2) 30%, transparent 60%),
              radial-gradient(ellipse 60% 80% at 55% 50%, rgba(252, 231, 243, 0.3) 0%, transparent 50%),
              radial-gradient(ellipse 100% 40% at 50% 60%, rgba(253, 244, 255, 0.2) 0%, transparent 50%)
            `
          }
        case 'sung-wen':
          return { 
            backgroundImage: `
              radial-gradient(ellipse 80% 60% at 45% 50%, rgba(236, 253, 245, 0.4) 0%, rgba(209, 250, 229, 0.2) 30%, transparent 60%),
              radial-gradient(ellipse 60% 80% at 55% 50%, rgba(209, 250, 229, 0.3) 0%, transparent 50%),
              radial-gradient(ellipse 100% 40% at 50% 60%, rgba(236, 253, 245, 0.2) 0%, transparent 50%)
            `
          }
        default:
          return { 
            backgroundImage: `
              radial-gradient(ellipse 80% 60% at 45% 50%, rgba(249, 250, 251, 0.4) 0%, rgba(243, 244, 246, 0.2) 30%, transparent 60%),
              radial-gradient(ellipse 60% 80% at 55% 50%, rgba(243, 244, 246, 0.3) 0%, transparent 50%),
              radial-gradient(ellipse 100% 40% at 50% 60%, rgba(249, 250, 251, 0.2) 0%, transparent 50%)
            `
          }
      }
    }
  }

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || !userId || !selectedCompany) return

    // If no active chat, create a new one first
    let currentActiveChat = activeChat
    if (!currentActiveChat) {
      try {
        const token = await auth.currentUser?.getIdToken()
        if (!token) {
          throw new Error('Not authenticated')
        }

        const response = await fetch('/api/chat/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            employeeId,
            companyId: selectedCompany,
            title: message.trim().substring(0, 50) || 'New Chat',
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to create chat')
        }

        const data = await response.json()
        const newChat = data.chat as Chat
        
        // Use the setters from the hook to ensure React re-renders
        addChat(newChat)
        setActiveChat(newChat)
        resetConversation()
        
        currentActiveChat = newChat
        
        // Save active chat to localStorage
        localStorage.setItem(`activeChat_${selectedCompany}_${employeeId}`, newChat.id)
      } catch (error) {
        console.error('Error creating chat:', error)
        return
      }
    }

    const { addConversationItem, addChatMessage, setAssistantLoading, setChatMessages } = useConversationStore.getState()

    console.log('🚀 === SEND MESSAGE START ===')

    const userItem = {
      type: 'message' as const,
      role: 'user' as const,
      content: [{ type: 'input_text' as const, text: message.trim() }],
    }
    const userMessage = {
      role: 'user' as const,
      content: message.trim(),
    }

    try {
      setAssistantLoading(true)
      
      // Add message to UI immediately for better UX
      addConversationItem(userMessage)
      addChatMessage(userItem)

      const updatedConversationItems = useConversationStore.getState().conversationItems

      console.log('📊 Current conversation items before send:', updatedConversationItems.length)
      console.log('📋 Conversation items:', JSON.stringify(updatedConversationItems.map((item: any) => ({
        role: item.role,
        contentLength: item.content?.length || 0
      })), null, 2))

      // Get auth token
      const token = await auth.currentUser?.getIdToken()
      if (!token) {
        throw new Error('Not authenticated')
      }

      // Build conversation history for context
      const conversationHistory = updatedConversationItems.map((item: any) => ({
        role: item.role,
        content: typeof item.content === 'string' ? item.content : item.content[0]?.text || '',
      }))

      console.log('🤖 === SENDING MESSAGE THREAD TO AI ===')
      console.log('📊 Total messages in thread:', conversationHistory.length)
      console.log('📋 Full conversation thread:')
      conversationHistory.forEach((msg, index) => {
        console.log(`  [${index + 1}] ${msg.role.toUpperCase()}: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`)
      })
      console.log('🚀 Calling server-side processor...')

      // Get tools configuration based on mode
      let toolsState: ToolsState
      if (mode === 'chat') {
        // Chat mode: only web search and file search enabled
        toolsState = {
          webSearchEnabled: true,
          fileSearchEnabled: true,
          functionsEnabled: false,
          codeInterpreterEnabled: false,
          webSearchConfig: toolsStore.webSearchConfig,
        }
      } else {
        // Agent mode: use actual tools configuration from store
        toolsState = {
          webSearchEnabled: toolsStore.webSearchEnabled,
          fileSearchEnabled: toolsStore.fileSearchEnabled,
          functionsEnabled: toolsStore.functionsEnabled,
          codeInterpreterEnabled: toolsStore.codeInterpreterEnabled,
          webSearchConfig: toolsStore.webSearchConfig,
        }
      }

      console.log(`[CHAT PAGE] Mode: ${mode}, Tools State:`, toolsState)

      // Call the API to enqueue the job
      const response = await fetch(`/api/chat/${currentActiveChat.id}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: message.trim(),
          companyId: selectedCompany,
          employeeId,
          personalityLevel,
          conversationHistory,
          toolsState,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to enqueue message')
      }

      const responseData = await response.json()
      const { jobId } = responseData

      console.log(`[CHAT PAGE] ✅ Job enqueued: ${jobId}`)

      // Set up real-time listener for job streaming updates
      const updatesRef = collection(
        db,
        `Users/${userId}/knowledgebases/${selectedCompany}/chatJobs/${jobId}/updates`
      )
      const updatesQuery = query(updatesRef, orderBy('timestamp', 'asc'))

      // Track streaming state
      let streamingMessageId: string | null = null
      let streamingAssistantText = ''
      const processedUpdateIds = new Set<string>()

      // Helpers for streaming assistant message into the UI
      const ensureStreamingMessage = () => {
        if (streamingMessageId) return
        streamingMessageId = `stream-${Date.now()}`
        addChatMessage({
          type: 'message',
          role: 'assistant',
          id: streamingMessageId,
          content: [
            {
              type: 'output_text',
              text: '',
            },
          ],
        })
      }

      const updateStreamingMessage = (text: string) => {
        if (!streamingMessageId) return
        const { chatMessages } = useConversationStore.getState()
        const updated: Item[] = chatMessages.map((item: Item) => {
          if (item.id === streamingMessageId && item.type === 'message') {
            const existingContent = item.content?.[0]
            const contentItem: ContentItem =
              existingContent && existingContent.type === 'output_text'
                ? existingContent
                : { type: 'output_text' as const, text: '' }
            const updatedItem: MessageItem = {
              ...item,
              content: [
                {
                  ...contentItem,
                  type: 'output_text' as const,
                  text,
                },
              ],
            }
            return updatedItem
          }
          return item
        })
        setChatMessages(updated)
      }

      const handleToolCallStart = (data: any) => {
        if (!data?.id) return
        const store = useConversationStore.getState()
        const { chatMessages, addChatMessage } = store
        const setMessages = store.setChatMessages
        const toolType =
          (data.toolType as ToolCallItem['tool_type']) ||
          (data.name === 'file_search'
            ? 'file_search_call'
            : data.name === 'web_search'
              ? 'web_search_call'
              : 'function_call')

        const existing = chatMessages.find(item => item.type === 'tool_call' && item.id === data.id) as ToolCallItem | undefined
        if (existing) {
          const updated: Item[] = chatMessages.map(item => {
            if (item.type === 'tool_call' && item.id === data.id) {
              const updatedItem: ToolCallItem = {
                ...item,
                status: 'in_progress' as const,
                name: data.name ?? item.name,
                arguments:
                  typeof data.arguments === 'string'
                    ? data.arguments
                    : data.arguments
                      ? JSON.stringify(data.arguments)
                      : item.arguments,
              }
              return updatedItem
            }
            return item
          })
          setMessages(updated)
          return
        }

        const serializedArgs =
          typeof data.arguments === 'string'
            ? data.arguments
            : data.arguments
              ? JSON.stringify(data.arguments)
              : undefined

        addChatMessage({
          type: 'tool_call',
          tool_type: toolType,
          status: 'in_progress',
          id: data.id,
          name: data.name ?? null,
          arguments: serializedArgs,
          output: null,
        })
      }

      const handleToolCallComplete = (data: any) => {
        if (!data?.id) return
        const store = useConversationStore.getState()
        const { chatMessages } = store
        const setMessages = store.setChatMessages
        let changed = false
        const updated: Item[] = chatMessages.map(item => {
          if (item.type === 'tool_call' && item.id === data.id) {
            changed = true
            const updatedItem: ToolCallItem = {
              ...item,
              status: 'completed' as const,
              output: data.result ? JSON.stringify(data.result) : item.output,
            }
            return updatedItem
          }
          return item
        })
        if (changed) {
          setMessages(updated)
        }
      }

      // Listen to real-time updates from the job
      const unsubscribe = onSnapshot(
        updatesQuery,
        async (snapshot) => {
          // Only process updates if this is still the active chat
          const currentActiveChatId = useChatListStore.getState().activeChat?.id
          if (currentActiveChat?.id !== currentActiveChatId) {
            console.log(`[CHAT PAGE] Ignoring update - chat switched (job: ${currentActiveChat?.id}, active: ${currentActiveChatId})`)
            return
          }

          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const updateId = change.doc.id
              if (processedUpdateIds.has(updateId)) return
              processedUpdateIds.add(updateId)

              const updateData = change.doc.data()
              const event = {
                type: updateData.type,
                data: updateData.data,
              }

              console.log(`[CHAT PAGE] 📡 Received streaming update: ${event.type}`)

              switch (event.type) {
                case 'message_delta':
                  {
                    const deltaText = event.data?.delta || event.data?.textDelta || ''
                    const cumulativeText = event.data?.text || (streamingAssistantText + deltaText)
                    if (cumulativeText) {
                      ensureStreamingMessage()
                      streamingAssistantText = cumulativeText
                      updateStreamingMessage(streamingAssistantText)
                    }
                  }
                  break

                case 'tool_call_start':
                  console.log('🔧 Tool call started:', event.data.name)
                  handleToolCallStart(event.data)
                  break

                case 'tool_call_complete':
                  console.log('✅ Tool call completed:', event.data.name)
                  handleToolCallComplete(event.data)
                  break

                case 'assistant_message_saved':
                  console.log('💾 Message saved:', event.data.messageNumber)
                  // Reload messages from database to get the final saved message
                  setTimeout(async () => {
                    try {
                      const messagesResponse = await fetch(
                        `/api/chat/${currentActiveChat.id}/messages/list?companyId=${selectedCompany}&page=1&limit=100`,
                        {
                          headers: {
                            Authorization: `Bearer ${token}`,
                          },
                        }
                      )

                      if (messagesResponse.ok) {
                        const data = await messagesResponse.json()
                        const { convertMessagesToItems, convertMessagesToConversationHistory } = await import('@/lib/chat/message-converter')
                        const items = convertMessagesToItems(data.messages)
                        const conversationHistory = convertMessagesToConversationHistory(data.messages)

                        const { setConversationItems } = useConversationStore.getState()
                        setChatMessages(items)
                        setConversationItems(conversationHistory)
                        streamingMessageId = null
                        streamingAssistantText = ''
                      }
                    } catch (error) {
                      console.error('[CHAT PAGE] Error reloading messages:', error)
                    }
                  }, 500)
                  break

                case 'error':
                  console.error('❌ Error:', event.data.error)
                  setAssistantLoading(false)
                  unsubscribe()
                  break
              }
            }
          })
        },
        (error) => {
          console.error('[CHAT PAGE] Error listening to job updates:', error)
          // Fallback to polling if real-time listener fails
          console.log('[CHAT PAGE] Falling back to polling...')
          startPollingFallback()
        }
      )

      // Store the listener so we can clean it up when switching chats
      activeListenersRef.current.push({ unsubscribe, chatId: currentActiveChat.id })

      // Fallback polling function (in case real-time listener fails)
      const startPollingFallback = () => {
        let pollCount = 0
        const maxPolls = 120
        const pollInterval = setInterval(async () => {
          pollCount++
          
          try {
            const messagesResponse = await fetch(
              `/api/chat/${currentActiveChat.id}/messages/list?companyId=${selectedCompany}&page=1&limit=100`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            )

            if (messagesResponse.ok) {
              const data = await messagesResponse.json()
              const { convertMessagesToItems, convertMessagesToConversationHistory } = await import('@/lib/chat/message-converter')
              const items = convertMessagesToItems(data.messages)
              const conversationHistory = convertMessagesToConversationHistory(data.messages)

              const { setConversationItems } = useConversationStore.getState()
              setChatMessages(items)
              setConversationItems(conversationHistory)

              // Check if job is complete
              if (conversationHistory.length > 0) {
                const lastMessage = conversationHistory[conversationHistory.length - 1]
                if (lastMessage.role === 'assistant' && pollCount > 3) {
                  clearInterval(pollInterval)
                  setAssistantLoading(false)
                }
              }
            }
          } catch (error) {
            console.error('[CHAT PAGE] Error polling:', error)
          }

          if (pollCount >= maxPolls) {
            clearInterval(pollInterval)
            setAssistantLoading(false)
          }
        }, 1000)
      }

      // Also set up a listener to check when job is completed
      // This will stop the loading state and cleanup
      const jobRef = doc(db, `Users/${userId}/knowledgebases/${selectedCompany}/chatJobs/${jobId}`)
      const jobUnsubscribe = onSnapshot(jobRef, (jobDoc) => {
        // Only process if this is still the active chat
        const currentActiveChatId = useChatListStore.getState().activeChat?.id
        if (currentActiveChat?.id !== currentActiveChatId) {
          console.log(`[CHAT PAGE] Ignoring job completion - chat switched`)
          jobUnsubscribe()
          return
        }

        if (jobDoc.exists()) {
          const jobData = jobDoc.data()
          if (jobData.status === 'completed' || jobData.status === 'failed') {
            console.log(`[CHAT PAGE] Job ${jobData.status}, cleaning up...`)
            setAssistantLoading(false)
            unsubscribe()
            jobUnsubscribe()
            
            // Remove from active listeners
            activeListenersRef.current = activeListenersRef.current.filter(l => l.chatId !== currentActiveChat.id)
            
            // Final reload of messages
            setTimeout(async () => {
              try {
                const messagesResponse = await fetch(
                  `/api/chat/${currentActiveChat.id}/messages/list?companyId=${selectedCompany}&page=1&limit=100`,
                  {
                    headers: {
                      Authorization: `Bearer ${token}`,
                    },
                  }
                )

                if (messagesResponse.ok) {
                  const data = await messagesResponse.json()
                  const { convertMessagesToItems, convertMessagesToConversationHistory } = await import('@/lib/chat/message-converter')
                  const items = convertMessagesToItems(data.messages)
                  const conversationHistory = convertMessagesToConversationHistory(data.messages)

                  const { setConversationItems } = useConversationStore.getState()
                  setChatMessages(items)
                  setConversationItems(conversationHistory)
                }
              } catch (error) {
                console.error('[CHAT PAGE] Error in final reload:', error)
              }
            }, 1000)
          }
        }
      })

      console.log('🏁 === SEND MESSAGE END ===')
    } catch (error) {
      console.error('❌ Error processing message:', error)
      setAssistantLoading(false)
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
    <div data-chat-page className="flex h-full bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Chat List Sidebar with Employee Card */}
      <ChatListSidebar
        employee={employee}
        onSelectChat={loadChatMessages}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        onChangeAssistant={handleChangeAssistant}
        personalityLevel={personalityLevel}
        onPersonalityChange={setPersonalityLevel}
      />

      {/* Main Chat Area - Center */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {isLoadingMessages ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-gray-500 dark:text-gray-400">Loading messages...</div>
          </div>
        ) : !activeChat ? (
          <div className="flex-1 flex items-center justify-center p-6 overflow-hidden bg-gray-50 dark:bg-gray-900 relative">
            {/* Subtle radial gradient splash based on employee theme */}
            <div 
              className="absolute inset-0 pointer-events-none"
              style={getEmployeeGradientStyle(employeeId, isDarkMode)}
            />
            
            {/* Centered Input Card */}
            <div className="w-full max-w-2xl relative z-10">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-8">
                  What can I help with?
                </h2>
              </div>
              <ChatInput
                onSendMessage={handleSendMessage}
                isDisabled={isAssistantLoading}
                onToggleAIOptions={() => setIsAIOptionsPanelOpen(!isAIOptionsPanelOpen)}
                isAIOptionsPanelOpen={isAIOptionsPanelOpen}
                employee={employee}
                centered={true}
                mode={mode}
                onModeChange={setMode}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Chat Messages - Scrollable */}
            <div className="flex-1 overflow-hidden">
              <ChatMessages
                messages={chatMessages}
                isLoading={isAssistantLoading}
                employee={employee}
              />
            </div>

            {/* Chat Input - Sticky at Bottom */}
            <ChatInput
              onSendMessage={handleSendMessage}
              isDisabled={isAssistantLoading || !activeChat}
              onToggleAIOptions={() => setIsAIOptionsPanelOpen(!isAIOptionsPanelOpen)}
              isAIOptionsPanelOpen={isAIOptionsPanelOpen}
              employee={employee}
              mode={mode}
              onModeChange={setMode}
            />
          </div>
        )}
      </div>

      {/* AI Options Panel - Right (Hidden by default with animation) */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isAIOptionsPanelOpen ? 'w-[350px]' : 'w-0'
        }`}
      >
        <div className="w-[350px] h-full border-l border-gray-200 dark:border-gray-700">
          <ToolsPanel />
        </div>
      </div>
    </div>
  )
}

