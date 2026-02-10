export const CACHE_TAGS = {
  chatList: "chat-list",
  chat: (chatId: string) => `chat:${chatId}`,
  models: "chat-models",
  mcpServers: "mcp-servers",
} as const;

