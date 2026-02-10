import { NextRequest } from "next/server";
import { CACHE_TAGS } from "@/app/api/agent/_utils/cache-tags";
import { handleRequest } from "@/app/api/agent/_utils/handle-request";

function extractChatId(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return null;
  }
  const chatId = (payload as { id?: unknown }).id;
  return typeof chatId === "string" && chatId ? chatId : null;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = searchParams.get("limit") || "50";
  const offset = searchParams.get("offset") || "0";
  const query = new URLSearchParams({ limit, offset }).toString();

  return handleRequest({
    request,
    backendPath: `/chats/?${query}`,
    init: {
      method: "GET",
      cache: "force-cache",
      next: { tags: [CACHE_TAGS.chatList] },
    },
    fallbackError: "Could not load chats.",
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  return handleRequest({
    request,
    backendPath: "/chats/",
    init: {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    revalidateTags: (payload) => {
      const chatId = extractChatId(payload);
      return chatId ? [CACHE_TAGS.chatList, CACHE_TAGS.chat(chatId)] : [CACHE_TAGS.chatList];
    },
    fallbackError: "Could not create chat.",
  });
}
