import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ChatMessage, Chat, MCPServerInfo, ToolCallInfo } from "@/types";
import {
  getChats,
  getChat,
  deleteChat as apiDeleteChat,
  getMcpServers,
} from "@/lib/api/client";

function parseToolsCalled(metadata: unknown): ToolCallInfo[] {
  if (!metadata || typeof metadata !== "object") {
    return [];
  }

  const rawTools = (metadata as { tools_called?: unknown }).tools_called;
  if (!Array.isArray(rawTools)) {
    return [];
  }

  return rawTools
    .filter((tool): tool is Record<string, unknown> => !!tool && typeof tool === "object")
    .map((tool) => ({
      server_id: String(tool.server_id ?? ""),
      tool_name: String(tool.tool_name ?? ""),
      input: typeof tool.input === "string" ? tool.input : undefined,
      output: typeof tool.output === "string" ? tool.output : undefined,
    }))
    .filter((tool) => tool.server_id && tool.tool_name);
}

interface ChatState {
  messages: ChatMessage[];
  chats: Chat[];
  currentChatId: string | null;
  sessionId: string | null;
  isLoading: boolean;
  sidebarCollapsed: boolean;
  webSearchEnabled: boolean;
  mcpServers: MCPServerInfo[];

  addMessage: (message: ChatMessage) => void;
  setLoading: (loading: boolean) => void;
  clearMessages: () => void;
  setWebSearchEnabled: (enabled: boolean) => void;
  setMcpServers: (servers: MCPServerInfo[]) => void;
  setMcpServerEnabled: (serverId: string, enabled: boolean) => void;
  setSessionId: (sessionId: string | null) => void;
  toggleSidebar: () => void;

  fetchChats: () => Promise<void>;
  fetchMcpServers: () => Promise<void>;
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
      mcpServers: [],

      addMessage: (message) =>
        set((state) => ({
          messages: [...state.messages, message],
        })),

      setLoading: (loading) => set({ isLoading: loading }),

      clearMessages: () => set({ messages: [] }),

      setWebSearchEnabled: (enabled) => set({ webSearchEnabled: enabled }),
      setMcpServers: (servers) => set({ mcpServers: servers }),
      setMcpServerEnabled: (serverId, enabled) =>
        set((state) => ({
          mcpServers: state.mcpServers.map((server) =>
            server.id === serverId ? { ...server, enabled } : server
          ),
        })),

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

      fetchMcpServers: async () => {
        try {
          const { servers, enabled_server_ids } = await getMcpServers();
          const enabledSet = new Set(enabled_server_ids);
          set({
            mcpServers: servers.map((server) => ({
              ...server,
              enabled: enabledSet.has(server.id),
            })),
          });
        } catch (error) {
          console.error("Failed to fetch MCP servers:", error);
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
              toolsCalled: parseToolsCalled(msg.metadata),
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
        mcpServers: state.mcpServers,
        sidebarCollapsed: state.sidebarCollapsed,
        currentChatId: state.currentChatId,
      }),
    }
  )
);
