'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Send, Settings } from 'lucide-react'

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

interface ChatInputProps {
  onSendMessage: (message: string) => Promise<void>
  isDisabled: boolean
  onToggleAIOptions: () => void
  isAIOptionsPanelOpen: boolean
  employee: Employee
}

export default function ChatInput({
  onSendMessage,
  isDisabled,
  onToggleAIOptions,
  isAIOptionsPanelOpen,
  employee,
}: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [message])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || isDisabled || isSending) return

    setIsSending(true)
    try {
      await onSendMessage(message.trim())
      setMessage('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter to send, Shift+Enter for new line
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  // Check if send button should be enabled
  const isSendEnabled = message.trim().length > 0 && !isDisabled && !isSending

  return (
    <div className="flex-shrink-0 p-4 sm:p-6 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
      <div className="max-w-4xl mx-auto">
        {/* Modern card design matching old React app */}
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-4">
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            {/* Input area with AI options toggle */}
            <div className="flex-1 relative">
              <div className={`flex items-center bg-gray-50/50 dark:bg-gray-700/50 rounded-xl border border-gray-200/50 dark:border-gray-600/50 transition-colors ${
                employee.id === 'emma' ? 'focus-within:border-pink-500 dark:focus-within:border-pink-400' :
                employee.id === 'marquavious' ? 'focus-within:border-blue-500 dark:focus-within:border-blue-400' :
                employee.id === 'charlie' ? 'focus-within:border-amber-500 dark:focus-within:border-amber-400' :
                employee.id === 'sung-wen' ? 'focus-within:border-emerald-500 dark:focus-within:border-emerald-400' :
                'focus-within:border-violet-500 dark:focus-within:border-violet-400'
              }`}>
                {/* AI Options Toggle Button */}
                <button
                  type="button"
                  onClick={onToggleAIOptions}
                  className={`p-3 transition-colors ${
                    isAIOptionsPanelOpen
                      ? employee.id === 'emma' ? 'text-pink-500 dark:text-pink-400' :
                        employee.id === 'marquavious' ? 'text-blue-500 dark:text-blue-400' :
                        employee.id === 'charlie' ? 'text-amber-500 dark:text-amber-400' :
                        employee.id === 'sung-wen' ? 'text-emerald-500 dark:text-emerald-400' :
                        'text-violet-500 dark:text-violet-400'
                      : employee.id === 'emma' ? 'text-gray-400 hover:text-pink-500 dark:hover:text-pink-400' :
                        employee.id === 'marquavious' ? 'text-gray-400 hover:text-blue-500 dark:hover:text-blue-400' :
                        employee.id === 'charlie' ? 'text-gray-400 hover:text-amber-500 dark:hover:text-amber-400' :
                        employee.id === 'sung-wen' ? 'text-gray-400 hover:text-emerald-500 dark:hover:text-emerald-400' :
                        'text-gray-400 hover:text-violet-500 dark:hover:text-violet-400'
                  }`}
                  aria-label="AI Options"
                  title="Toggle AI Options"
                >
                  <Settings size={20} />
                </button>

                {/* Text input */}
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isDisabled ? "Select or create a chat to start..." : "Type your message..."}
                  disabled={isDisabled || isSending}
                  rows={1}
                  className="flex-1 bg-transparent border-0 focus:ring-0 text-gray-800 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 py-3 px-2 text-base disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                  style={{ maxHeight: '200px', minHeight: '48px' }}
                />
              </div>
            </div>

            {/* Send button - only enabled when text is present */}
            <button
              type="submit"
              disabled={!isSendEnabled}
              className={`self-end bg-gradient-to-r ${employee.theme.gradient} hover:opacity-90 text-white rounded-xl p-3 shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
              aria-label="Send message"
              title={isSendEnabled ? 'Send message' : 'Type a message to send'}
            >
              <Send size={20} />
            </button>
          </form>

          {/* Helper text */}
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
            Press Enter to send, Shift+Enter for new line
          </div>
        </div>
      </div>
    </div>
  )
}
