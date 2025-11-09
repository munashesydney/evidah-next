import { create } from 'zustand'
import { Timestamp } from 'firebase/firestore'

export interface Chat {
  id: string
  title: string
  agentId: string
  createdAt: Timestamp
  updatedAt: Timestamp
  preview?: string
  threadId?: string
  metadata?: Record<string, any>
}

interface ChatListState {
  chats: Chat[]
  activeChat: Chat | null
  isLoading: boolean
  pagination: {
    page: number
    limit: number
    total: number
    hasMore: boolean
  }

  // Actions
  setChats: (chats: Chat[]) => void
  addChat: (chat: Chat) => void
  updateChat: (chatId: string, updates: Partial<Chat>) => void
  removeChat: (chatId: string) => void
  setActiveChat: (chat: Chat | null) => void
  setLoading: (loading: boolean) => void
  setPagination: (pagination: Partial<ChatListState['pagination']>) => void
  reset: () => void
}

const initialState = {
  chats: [],
  activeChat: null,
  isLoading: false,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    hasMore: false,
  },
}

const useChatListStore = create<ChatListState>((set) => ({
  ...initialState,

  setChats: (chats) => set({ chats }),
  
  addChat: (chat) =>
    set((state) => ({
      chats: [chat, ...state.chats],
    })),
  
  updateChat: (chatId, updates) =>
    set((state) => ({
      chats: state.chats.map((chat) =>
        chat.id === chatId ? { ...chat, ...updates } : chat
      ),
      activeChat:
        state.activeChat?.id === chatId
          ? { ...state.activeChat, ...updates }
          : state.activeChat,
    })),
  
  removeChat: (chatId) =>
    set((state) => ({
      chats: state.chats.filter((chat) => chat.id !== chatId),
      activeChat: state.activeChat?.id === chatId ? null : state.activeChat,
    })),
  
  setActiveChat: (chat) => set({ activeChat: chat }),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  setPagination: (pagination) =>
    set((state) => ({
      pagination: { ...state.pagination, ...pagination },
    })),
  
  reset: () => set(initialState),
}))

export default useChatListStore
