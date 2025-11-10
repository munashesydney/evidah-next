'use client'

import React, { useState } from 'react'
import { MessageSquare, Plus, Trash2, Settings } from 'lucide-react'
import useChatListStore, { Chat } from '@/stores/chat/useChatListStore'
import { formatDistanceToNow } from 'date-fns'

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

interface ChatListSidebarProps {
  employee: Employee
  onSelectChat: (chat: Chat) => void
  onNewChat: () => void
  onDeleteChat: (chatId: string) => void
  onChangeAssistant: () => void
  personalityLevel: number
  onPersonalityChange: (level: number) => void
}

export default function ChatListSidebar({
  employee,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onChangeAssistant,
  personalityLevel,
  onPersonalityChange,
}: ChatListSidebarProps) {
  const { chats, activeChat, isLoading } = useChatListStore()
  const [showPersonalitySettings, setShowPersonalitySettings] = useState(false)

  const personalityDescriptions = [
    'Very Playful - Casual, fun, and relaxed communication style',
    'Balanced - Friendly yet professional approach',
    'Professional - Formal and business-focused communication',
    'Very Professional - Strictly formal and corporate tone',
  ]

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return ''
    
    try {
      // Handle Firestore Timestamp
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return formatDistanceToNow(date, { addSuffix: true })
    } catch (error) {
      return ''
    }
  }

  // Get color classes based on employee theme
  const getActiveClasses = () => {
    const id = employee.id
    switch (id) {
      case 'emma':
        return 'bg-pink-50 dark:bg-pink-900/20 border-pink-500'
      case 'marquavious':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
      case 'charlie':
        return 'bg-amber-50 dark:bg-amber-900/20 border-amber-500'
      case 'sung-wen':
        return 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500'
      default:
        return 'bg-violet-50 dark:bg-violet-900/20 border-violet-500'
    }
  }

  return (
    <div className="w-80 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col h-full">
      {/* Employee Card at Top - with padding to match button width */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className={`relative overflow-hidden bg-gradient-to-br ${employee.theme.gradient} rounded-2xl p-4`}>
          <div className="absolute inset-0 bg-black/10"></div>
          
          <div className="relative z-10 flex flex-col items-center text-center">
            {/* Employee Image */}
            <div className="w-30 h-30 rounded-full overflow-hidden bg-white/20 backdrop-blur-sm border-2 border-white/30 shadow-md mb-2">
              <img 
                src={employee.avatar} 
                alt={employee.name}
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Employee Info */}
            <div className="text-white mb-2">
              <h3 className="text-lg font-bold mb-0.5 drop-shadow-sm">
                {employee.name}
              </h3>
              <p className="text-xs font-medium opacity-90 drop-shadow-sm">
                {employee.role}
              </p>
            </div>

            {/* Personality Settings */}
            <div className="mb-2">
              <button
                onClick={() => setShowPersonalitySettings(!showPersonalitySettings)}
                className="inline-flex items-center gap-2 px-3 py-2 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 hover:bg-white/20 transition-colors cursor-pointer"
                aria-label="Toggle personality settings"
              >
                <span className="text-xs font-medium text-white/90">Personality</span>
                <Settings size={12} className="text-white/70" />
              </button>
              
              {showPersonalitySettings && (
                <div className="mt-3 p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                  <div className="space-y-3">
                    {/* Personality Slider */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-white/80">
                        <span>Playful</span>
                        <span>Professional</span>
                      </div>
                      <div className="relative">
                        <input
                          type="range"
                          min="0"
                          max="3"
                          value={personalityLevel}
                          onChange={(e) => onPersonalityChange(parseInt(e.target.value))}
                          className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                          style={{
                            background: `linear-gradient(to right, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.3) ${(personalityLevel) * 33.33}%, rgba(255,255,255,0.1) ${(personalityLevel) * 33.33}%, rgba(255,255,255,0.1) 100%)`
                          }}
                        />
                        <style jsx>{`
                          .slider::-webkit-slider-thumb {
                            appearance: none;
                            height: 16px;
                            width: 16px;
                            border-radius: 50%;
                            background: white;
                            cursor: pointer;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                          }
                          
                          .slider::-moz-range-thumb {
                            height: 16px;
                            width: 16px;
                            border-radius: 50%;
                            background: white;
                            cursor: pointer;
                            border: none;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                          }
                          
                          .slider:focus {
                            outline: none;
                          }
                        `}</style>
                      </div>
                    </div>
                    
                    {/* Current Personality Description */}
                    <div className="text-xs text-white/90 bg-white/5 rounded-lg p-2">
                      {personalityDescriptions[personalityLevel]}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Change Assistant Button */}
            <button
              onClick={onChangeAssistant}
              className="text-xs font-medium bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 border border-white/30 text-white hover:bg-white/30 transition-colors cursor-pointer"
              aria-label="Change assistant"
            >
              Change Assistant
            </button>
          </div>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={onNewChat}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r ${employee.theme.gradient} hover:opacity-90 hover:scale-105 text-white rounded-lg transition-all shadow-md cursor-pointer`}
        >
          <Plus size={18} />
          <span className="font-medium">New Chat</span>
        </button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-gray-500">
        {isLoading ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            Loading chats...
          </div>
        ) : chats.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No chats yet</p>
            <p className="text-xs mt-1">Start a new conversation</p>
          </div>
        ) : (
          <div className="py-2">
            {chats.map((chat) => (
              <div
                key={chat.id}
                className={`group relative px-4 py-3 cursor-pointer transition-colors ${
                  activeChat?.id === chat.id
                    ? `${getActiveClasses()} border-l-4`
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
                onClick={() => onSelectChat(chat)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {chat.title}
                    </h3>
                    {chat.preview && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                        {chat.preview}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {formatTimestamp(chat.updatedAt)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteChat(chat.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-opacity"
                    title="Delete chat"
                  >
                    <Trash2 size={14} className="text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
