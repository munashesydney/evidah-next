'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Bot, Globe, Paperclip, ChevronDown, ArrowUp } from 'lucide-react'

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
  centered?: boolean
}

export default function ChatInput({
  onSendMessage,
  isDisabled,
  onToggleAIOptions,
  isAIOptionsPanelOpen,
  employee,
  centered = false,
}: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [selectedModel, setSelectedModel] = useState('o3-mini')
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [message])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false)
      }
    }

    if (isModelDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isModelDropdownOpen])

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

  const models = ['o3-mini', 'gpt-4o', 'gpt-4o-mini']

  return (
    <div className={`flex-shrink-0 ${centered ? '' : 'p-4 sm:p-6'} bg-transparent`}>
      <div className={centered ? 'w-full' : 'max-w-4xl mx-auto'}>
        {/* Modern card design */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
          <form onSubmit={handleSubmit} className="flex flex-col">
            {/* Text input area */}
            <div className="p-4 pb-2">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isDisabled ? "Select or create a chat to start..." : `Ask ${employee.name} anything`}
                disabled={isDisabled || isSending}
                rows={1}
                className="w-full bg-transparent border-0 focus:ring-0 focus:outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-base disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                style={{ maxHeight: '200px', minHeight: '48px' }}
              />
            </div>

            {/* Bottom row with controls */}
            <div className="flex items-center justify-between px-4 pb-4 gap-2">
              {/* Left side: Model dropdown, Globe, Attachment */}
              <div className="flex items-center gap-2">
                {/* Model Selection Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm text-gray-700 dark:text-gray-300"
                  >
                    <Bot size={16} className="text-gray-600 dark:text-gray-400" />
                    <span>{selectedModel}</span>
                    <ChevronDown size={14} className="text-gray-500 dark:text-gray-400" />
                  </button>

                  {/* Dropdown menu */}
                  {isModelDropdownOpen && (
                    <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[140px] z-50">
                      {models.map((model) => (
                        <button
                          key={model}
                          type="button"
                          onClick={() => {
                            setSelectedModel(model)
                            setIsModelDropdownOpen(false)
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                            selectedModel === model
                              ? 'text-gray-900 dark:text-gray-100 font-medium'
                              : 'text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {model}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Globe Icon */}
                <button
                  type="button"
                  onClick={onToggleAIOptions}
                  className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-gray-600 dark:text-gray-400"
                  aria-label="Web search"
                  title="Toggle web search"
                >
                  <Globe size={18} />
                </button>

                {/* Attachment Icon */}
                <button
                  type="button"
                  className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-gray-600 dark:text-gray-400"
                  aria-label="Attach file"
                  title="Attach file"
                >
                  <Paperclip size={18} />
                </button>
              </div>

              {/* Right side: Send button */}
              <button
                type="submit"
                disabled={!isSendEnabled}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-black dark:bg-white text-white dark:text-black hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:opacity-40"
                aria-label="Send message"
                title={isSendEnabled ? 'Send message' : 'Type a message to send'}
              >
                <ArrowUp size={18} />
              </button>
            </div>
            
            {/* Keyboard shortcut hint - only show when user is typing */}
            {message.trim().length > 0 && (
              <div className="px-4 pb-3">
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                  <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded">Shift</kbd> + <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded">Enter</kbd> for new line
                </p>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
