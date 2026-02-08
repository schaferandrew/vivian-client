import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ChatMessage, Chat } from "@/types";
import {
  getChats,
  getChat,
  deleteChat as apiDeleteChat,
} from "@/lib/api/client";

interface ChatState {
  // Messages
  messages: ChatMessage[];

  // Chat history
  chats: Chat[];
  currentChatId: string | null;

  // Session (legacy)
  sessionId: string | null;

  // UI state
  isLoading: boolean;
  sidebarCollapsed: boolean;

  // Web search toggle (costs ~$0.02 per query, default OFF)
  webSearchEnabled: boolean;

  // Actions
  addMessage: (message: ChatMessage) => void;
  setLoading: (loading: boolean) => void;
  clearMessages: () => void;
  setWebSearchEnabled: (enabled: boolean) => void;
  setSessionId: (sessionId: string | null) => void;
  toggleSidebar: () => void;

  // Chat history actions
  fetchChats: () => Promise<void>;
  loadChat: (chatId: string | null) => Promise<void>;
  createNewChat: () => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      messages: [],
      chats: [],
      currentChatId: null,
      sessionId: null,
      isLoading: false,
      sidebarCollapsed: false,
      webSearchEnabled: false,

      addMessage: (message) =>
        set((state) => ({
          messages: [...state.messages, message],
        })),

      setLoading: (loading) => set({ isLoading: loading }),

      clearMessages: () => set({ messages: [] }),

      setWebSearchEnabled: (enabled) => set({ webSearchEnabled: enabled }),

      setSessionId: (sessionId) => set({ sessionId }),

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      fetchChats: async () => {
        try {
          const { chats } = await getChats();
          set({ chats });
        } catch (error) {
          console.error("Failed to fetch chats:", error);
        }
      },

      loadChat: async (chatId: string | null) => {
        if (!chatId) {
          set({ currentChatId: null, messages: [] });
          return;
        }

        try {
          const chatData = await getChat(chatId);
          if (chatData) {
            const messages: ChatMessage[] = chatData.messages.map((msg) => ({
              id: msg.id,
              role: msg.role as "user" | "agent" | "system",
              content: msg.content,
              timestamp: new Date(msg.timestamp),
            }));
            set({
              currentChatId: chatId,
              messages,
            });
          }
        } catch (error) {
          console.error("Failed to load chat:", error);
        }
      },

      createNewChat: async () => {
        set({
          currentChatId: null,
          messages: [],
        });
      },

      deleteChat: async (chatId: string) => {
        try {
          await apiDeleteChat(chatId);
          set((state) => ({
            chats: state.chats.filter((c) => c.id !== chatId),
            currentChatId: state.currentChatId === chatId ? null : state.currentChatId,
            messages: state.currentChatId === chatId ? [] : state.messages,
          }));
        } catch (error) {
          console.error("Failed to delete chat:", error);
        }
      },
    }),
    {
      name: "chat-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        messages: state.messages,
        sessionId: state.sessionId,
        webSearchEnabled: state.webSearchEnabled,
        sidebarCollapsed: state.sidebarCollapsed,
        currentChatId: state.currentChatId,
      }),
    }
  )
);
