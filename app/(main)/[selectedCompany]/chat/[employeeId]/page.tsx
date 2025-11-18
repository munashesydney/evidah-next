'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import ChatMessages from '@/components/chat/chat-messages'
import ChatInput from '@/components/chat/chat-input'
import ToolsPanel from '@/components/chat/tools-panel'
import ChatListSidebar from '@/components/chat/chat-list-sidebar'
import useConversationStore from '@/stores/chat/useConversationStore'
import useChatListStore, { Chat } from '@/stores/chat/useChatListStore'
import { convertMessagesToItems } from '@/lib/chat/message-converter'
import { Message } from '@/lib/services/message-service'
import type { Item } from '@/lib/chat/assistant'

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
  const [isAIOptionsPanelOpen, setIsAIOptionsPanelOpen] = useState(false)
  const [personalityLevel, setPersonalityLevel] = useState(2)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  
  const { chatMessages, setChatMessages, resetConversation, isAssistantLoading } = useConversationStore()
  const { chats, activeChat, setChats, setActiveChat, addChat, removeChat, setLoading: setChatListLoading } = useChatListStore()
  
  const isDarkMode = resolvedTheme === 'dark' || theme === 'dark'

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

  // Cleanup when employee changes
  useEffect(() => {
    return () => {
      // Reset stores when navigating away
      const { reset: resetChatList } = useChatListStore.getState()
      resetChatList()
    }
  }, [employeeId])

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
      
      // Save active chat to localStorage for persistence
      localStorage.setItem(`activeChat_${selectedCompany}_${employeeId}`, chat.id)
      
      const token = await auth.currentUser?.getIdToken()
      if (!token) {
        throw new Error('Not authenticated')
      }

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
      console.log('📋 Messages detail:', JSON.stringify(messages.map(m => ({
        id: m.id,
        role: m.role,
        contentLength: m.content?.length,
        hasToolCalls: !!m.toolCalls,
        toolCallsCount: m.toolCalls?.length || 0,
        toolCalls: m.toolCalls?.map(tc => ({
          name: tc.name,
          type: tc.type,
          status: tc.status,
          hasOutput: !!tc.output
        }))
      })), null, 2))
      
      // Convert API messages to UI items
      const items = convertMessagesToItems(messages)
      console.log('📊 Converted to', items.length, 'UI items')
      console.log('📋 UI items detail:', JSON.stringify(items.map(i => ({
        type: i.type,
        role: i.type === 'message' ? i.role : undefined,
        tool_type: i.type === 'tool_call' ? i.tool_type : undefined,
        name: i.type === 'tool_call' ? i.name : undefined,
        status: i.type === 'tool_call' ? i.status : undefined,
        hasOutput: i.type === 'tool_call' ? !!i.output : undefined
      })), null, 2))
      
      // Convert messages to conversation history format for API calls
      const { convertMessagesToConversationHistory } = await import('@/lib/chat/message-converter')
      const conversationHistory = convertMessagesToConversationHistory(messages)
      console.log('💬 Conversation history items:', conversationHistory.length)
      console.log('📋 Conversation history:', JSON.stringify(conversationHistory.map(h => ({
        role: h.role,
        contentLength: h.content.length
      })), null, 2))
      console.log('🏁 === LOADING COMPLETE ===')
      
      // Update both UI items and conversation history
      const { setConversationItems } = useConversationStore.getState()
      setChatMessages(items)
      setConversationItems(conversationHistory)
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

      // Call the new server-side API that handles everything
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
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to process message')
      }

      // Helpers for streaming assistant message into the UI
      let streamingMessageId: string | null = null
      let streamingAssistantText = ''

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
        const updated = chatMessages.map((item: Item) => {
          if (item.id === streamingMessageId && item.type === 'message') {
            const existingContent = item.content?.[0]
            const contentItem =
              existingContent && existingContent.type === 'output_text'
                ? existingContent
                : { type: 'output_text', text: '' }
            return {
              ...item,
              content: [
                {
                  ...contentItem,
                  type: 'output_text',
                  text,
                },
              ],
            }
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
          const updated = chatMessages.map(item => {
            if (item.type === 'tool_call' && item.id === data.id) {
              return {
                ...item,
                status: 'in_progress',
                name: data.name ?? item.name,
                arguments:
                  typeof data.arguments === 'string'
                    ? data.arguments
                    : data.arguments
                      ? JSON.stringify(data.arguments)
                      : item.arguments,
              }
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
        const updated = chatMessages.map(item => {
          if (item.type === 'tool_call' && item.id === data.id) {
            changed = true
            return {
              ...item,
              status: 'completed',
              output: data.result ? JSON.stringify(data.result) : item.output,
            }
          }
          return item
        })
        if (changed) {
          setMessages(updated)
        }
      }

      // Stream the response
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6)
            try {
              const event = JSON.parse(dataStr)
              
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
                  break
                
                case 'done':
                  console.log('🏁 Processing complete:', event.data)
                  break
                
                case 'error':
                  console.error('❌ Error:', event.data.error)
                  throw new Error(event.data.error)
              }
            } catch (parseError) {
              console.error('Failed to parse event:', parseError)
            }
          }
        }
      }

      console.log('✅ Stream complete - reloading messages...')

      // Reload messages from database to get the saved assistant responses
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
        
        // Update both UI items and conversation history
        const { setConversationItems } = useConversationStore.getState()
        setChatMessages(items)
        setConversationItems(conversationHistory)
        console.log('✅ Messages reloaded from database - UI items:', items.length, 'Conversation items:', conversationHistory.length)
      }

      setAssistantLoading(false)
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

