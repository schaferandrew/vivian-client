import { NextRequest } from "next/server";

import { CACHE_TAGS } from "@/app/api/agent/_utils/cache-tags";
import { handleRequest } from "@/app/api/agent/_utils/handle-request";

function extractChatId(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return null;
  }
  const chatId = (payload as { chat_id?: unknown }).chat_id;
  return typeof chatId === "string" && chatId ? chatId : null;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  return handleRequest({
    request,
    backendPath: "/chat/message",
    init: {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    revalidateTags: (payload) => {
      const chatId = extractChatId(payload);
      return chatId ? [CACHE_TAGS.chatList, CACHE_TAGS.chat(chatId)] : [CACHE_TAGS.chatList];
    },
    fallbackError: "Could not reach the chat server. Is the backend running?",
  });
}
