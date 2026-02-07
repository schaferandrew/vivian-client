import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ChatMessage } from "@/types";
import { createSession, sendChatMessage as apiSendChatMessage } from "@/lib/api/client";

interface ChatState {
  // Messages
  messages: ChatMessage[];

  // Session
  sessionId: string | null;

  // UI state
  isLoading: boolean;

  // Web search toggle (costs ~$0.02 per query, default OFF)
  webSearchEnabled: boolean;

  // Actions
  addMessage: (message: ChatMessage) => void;
  setLoading: (loading: boolean) => void;
  clearMessages: () => void;
  setWebSearchEnabled: (enabled: boolean) => void;
  setSessionId: (sessionId: string | null) => void;
  startNewChat: () => Promise<void>;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      messages: [],
      sessionId: null,
      isLoading: false,
      webSearchEnabled: false,

      addMessage: (message) =>
        set((state) => ({
          messages: [...state.messages, message],
        })),

      setLoading: (loading) => set({ isLoading: loading }),

      clearMessages: () => set({ messages: [] }),

      setWebSearchEnabled: (enabled) => set({ webSearchEnabled: enabled }),

      setSessionId: (sessionId) => set({ sessionId }),

      startNewChat: async () => {
        try {
          const { session_id } = await createSession();
          set({ sessionId: session_id, messages: [] });
        } catch (error) {
          console.error("Failed to create new session:", error);
          set({ sessionId: null, messages: [] });
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
      }),
    }
  )
);
