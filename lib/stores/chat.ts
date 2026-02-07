import { create } from "zustand";
import type { ChatMessage } from "@/types";

interface ChatState {
  // Messages
  messages: ChatMessage[];

  // UI state
  isLoading: boolean;

  // Web search toggle (costs ~$0.02 per query, default OFF)
  webSearchEnabled: boolean;

  // Actions
  addMessage: (message: ChatMessage) => void;
  setLoading: (loading: boolean) => void;
  clearMessages: () => void;
  setWebSearchEnabled: (enabled: boolean) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isLoading: false,
  webSearchEnabled: false, // Default OFF to avoid unexpected costs

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  setLoading: (loading) => set({ isLoading: loading }),

  clearMessages: () => set({ messages: [] }),

  setWebSearchEnabled: (enabled) => set({ webSearchEnabled: enabled }),
}));
