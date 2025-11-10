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

import { employees, type Employee } from '@/lib/services/employee-helpers'

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
        
        // Don't auto-select any chat - let user choose
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
      console.log('🏁 === LOADING COMPLETE ===')
      
      setChatMessages(items)
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

    const { addConversationItem, addChatMessage, setAssistantLoading, chatMessages: currentMessages } = useConversationStore.getState()
    const { processMessages } = await import('@/lib/chat/assistant')

    console.log('🚀 === SEND MESSAGE START ===')
    console.log('📊 Current messages count:', currentMessages.length)

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

      // Save user message to database via API
      const token = await auth.currentUser?.getIdToken()
      if (!token) {
        throw new Error('Not authenticated')
      }

      console.log('💾 Saving user message...')
      const response = await fetch(`/api/chat/${currentActiveChat.id}/messages/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: message.trim(),
          role: 'user',
          companyId: selectedCompany,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to save message')
      }
      console.log('✅ User message saved')

      // Process AI response
      console.log('🤖 Starting AI response...')
      await processMessages(userId, selectedCompany, employeeId, personalityLevel)
      console.log('✅ AI response completed')
      
      // Wait for ALL processing to complete, including recursive turns
      // When a tool is called, processMessages is called recursively to get the assistant's response
      console.log('⏳ Waiting for all processing to complete...')
      console.log('📊 Starting message count:', currentMessages.length)
      
      let attempts = 0
      let lastMessageCount = useConversationStore.getState().chatMessages.length
      let stableCount = 0
      
      while (attempts < 150) {
        await new Promise(resolve => setTimeout(resolve, 200))
        attempts++
        
        const allMessages = useConversationStore.getState().chatMessages
        const currentCount = allMessages.length
        const isLoading = useConversationStore.getState().isAssistantLoading
        
        // Check if we have an assistant message in the NEW messages (after the original count)
        const newMsgs = allMessages.slice(currentMessages.length + 1) // Skip user message we already saved
        const hasAssistantMessage = newMsgs.some(m => m.type === 'message' && m.role === 'assistant')
        const hasToolCalls = newMsgs.some(m => m.type === 'tool_call')
        
        console.log(`⏳ Attempt ${attempts}: total=${currentCount}, new=${newMsgs.length}, loading=${isLoading}, toolCalls=${hasToolCalls}, assistant=${hasAssistantMessage}, stable=${stableCount}`)
        
        // We're done when:
        // 1. Not loading
        // 2. Messages are stable for multiple checks
        // 3. If there are tool calls, we must have an assistant message too
        if (currentCount === lastMessageCount && !isLoading) {
          stableCount++
          // If we have tool calls but no assistant message yet, keep waiting
          const hasPendingToolCalls = hasToolCalls && !hasAssistantMessage
          
          if (stableCount >= 5 && !hasPendingToolCalls) {
            console.log('✅ Messages stabilized, processing complete')
            break
          }
          
          if (hasPendingToolCalls && stableCount < 20) {
            console.log('⏳ Tool calls found, waiting for assistant response...')
          }
        } else {
          stableCount = 0
          lastMessageCount = currentCount
        }
      }
      console.log(`✅ Processing finished after ${attempts} attempts with ${useConversationStore.getState().chatMessages.length} total messages`)
      
      // After AI response, save assistant message with tool calls
      const updatedMessages = useConversationStore.getState().chatMessages
      console.log('📊 Total messages after AI:', updatedMessages.length)
      
      const newMessages = updatedMessages.slice(currentMessages.length + 1) // Skip the user message we already saved
      console.log('📊 New messages to process:', newMessages.length)
      console.log('📋 New messages detail:', JSON.stringify(newMessages.map(m => ({
        type: m.type,
        role: m.type === 'message' ? m.role : undefined,
        tool_type: m.type === 'tool_call' ? m.tool_type : undefined,
        name: m.type === 'tool_call' ? m.name : undefined,
        status: m.type === 'tool_call' ? m.status : undefined,
        hasOutput: m.type === 'tool_call' ? !!m.output : undefined,
        contentLength: m.type === 'message' ? m.content[0]?.text?.length : undefined
      })), null, 2))
      
      // Find assistant messages and their tool calls
      let assistantContent = ''
      const toolCalls: any[] = []
      
      for (const item of newMessages) {
        if (item.type === 'message' && item.role === 'assistant') {
          // Get the actual text content
          const text = item.content[0]?.text || ''
          console.log('📝 Found assistant message, length:', text.length)
          if (text) {
            assistantContent = text
          }
        } else if (item.type === 'tool_call') {
          console.log(`🔧 Found tool call: ${item.name}, status: ${item.status}, has output: ${!!item.output}`)
          // Only save completed tool calls
          if (item.status === 'completed') {
            console.log(`✅ Adding completed tool call: ${item.name}`)
            toolCalls.push({
              id: item.id,
              type: item.tool_type,
              name: item.name,
              arguments: item.arguments,
              parsedArguments: item.parsedArguments,
              output: item.output,
              status: item.status,
              code: item.code,
              files: item.files?.map((f: any) => ({
                file_id: f.file_id,
                filename: f.filename,
                container_id: f.container_id,
              })),
            })
          } else {
            console.log(`⚠️ Skipping non-completed tool call: ${item.name} (status: ${item.status})`)
          }
        }
      }
      
      console.log('📊 Summary - Assistant content length:', assistantContent.length, 'Tool calls:', toolCalls.length)
      console.log('🔧 Tool calls to save:', JSON.stringify(toolCalls.map(tc => ({
        name: tc.name,
        status: tc.status,
        hasOutput: !!tc.output,
        outputPreview: tc.output?.substring(0, 100)
      })), null, 2))
      
      // Save assistant message with tool calls only if we have content
      if (assistantContent) {
        console.log('💾 Saving assistant message with', toolCalls.length, 'tool calls...')
        const saveResponse = await fetch(`/api/chat/${currentActiveChat.id}/messages/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            content: assistantContent,
            role: 'assistant',
            companyId: selectedCompany,
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          }),
        })
        
        if (!saveResponse.ok) {
          const errorData = await saveResponse.json()
          console.error('❌ Failed to save assistant message:', errorData)
        } else {
          const savedData = await saveResponse.json()
          console.log('✅ Assistant message saved:', savedData)
        }
      } else {
        console.log('⚠️ No assistant content to save')
      }
      
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

