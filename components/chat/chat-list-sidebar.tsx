'use client'

import React from 'react'
import { MessageSquare, Plus, Trash2 } from 'lucide-react'
import useChatListStore, { Chat } from '@/stores/chat/useChatListStore'
import { formatDistanceToNow } from 'date-fns'

interface ChatListSidebarProps {
  onSelectChat: (chat: Chat) => void
  onNewChat: () => void
  onDeleteChat: (chatId: string) => void
}

export default function ChatListSidebar({
  onSelectChat,
  onNewChat,
  onDeleteChat,
}: ChatListSidebarProps) {
  const { chats, activeChat, isLoading } = useChatListStore()

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

  return (
    <div className="w-64 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white rounded-lg transition-colors"
        >
          <Plus size={18} />
          <span className="font-medium">New Chat</span>
        </button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
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
                    ? 'bg-violet-50 dark:bg-violet-900/20 border-l-4 border-violet-500'
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
