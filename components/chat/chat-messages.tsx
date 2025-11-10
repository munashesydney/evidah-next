'use client'

import React, { useEffect, useRef } from 'react'
import Message from './message'
import LoadingMessage from './loading-message'
import ToolCall from './tool-call'
import { Item } from '@/lib/chat/assistant'

interface Employee {
  id: string
  name: string
  role: string
  avatar: string
  theme: {
    primary: string
    gradient: string
  }
  capabilities?: string[]
}

interface ChatMessagesProps {
  messages: Item[]
  isLoading: boolean
  employee: Employee
}

export default function ChatMessages({ messages, isLoading, employee }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isLoading])

  // Scroll to bottom on initial mount
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [])

  return (
    <div 
      ref={containerRef}
      className="h-full overflow-y-auto px-4 sm:px-6 py-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-gray-500"
    >
      <div className="max-w-4xl mx-auto flex flex-col justify-end min-h-full">
        <div className="space-y-6">
          {messages.length === 0 && !isLoading && (
            <div className="flex items-center justify-center min-h-[200px]">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <p className="text-lg font-medium mb-2">Start a conversation</p>
                <p className="text-sm">Send a message to begin chatting</p>
              </div>
            </div>
          )}

          {messages.map((item, index) => {
            if (item.type === 'message') {
              return <Message key={item.id || index} message={item} employee={employee} />
            } else if (item.type === 'tool_call') {
              return <ToolCall key={item.id || index} toolCall={item} />
            }
            return null
          })}

          {isLoading && <LoadingMessage employee={employee} />}

          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  )
}
