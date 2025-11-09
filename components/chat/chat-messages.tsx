'use client'

import React, { useEffect, useRef } from 'react'
import Message from './message'
import LoadingMessage from './loading-message'
import ToolCall from './tool-call'
import { Item } from '@/lib/chat/assistant'

interface ChatMessagesProps {
  messages: Item[]
  isLoading: boolean
}

export default function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isLoading])

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {messages.length === 0 && !isLoading && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <p className="text-lg font-medium mb-2">Start a conversation</p>
            <p className="text-sm">Send a message to begin chatting with your AI assistant</p>
          </div>
        </div>
      )}

      {messages.map((item, index) => {
        if (item.type === 'message') {
          return <Message key={item.id || index} message={item} />
        } else if (item.type === 'tool_call') {
          return <ToolCall key={item.id || index} toolCall={item} />
        }
        return null
      })}

      {isLoading && <LoadingMessage />}

      <div ref={messagesEndRef} />
    </div>
  )
}
