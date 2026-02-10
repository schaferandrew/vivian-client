import { NextRequest } from "next/server";

import { CACHE_TAGS } from "@/app/api/agent/_utils/cache-tags";
import { handleRequest } from "@/app/api/agent/_utils/handle-request";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  return handleRequest({
    request,
    backendPath: `/chats/${id}`,
    init: {
      method: "GET",
      cache: "force-cache",
      next: { tags: [CACHE_TAGS.chat(id)] },
    },
    fallbackError: "Could not load chat.",
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  return handleRequest({
    request,
    backendPath: `/chats/${id}`,
    init: {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    revalidateTags: [CACHE_TAGS.chatList, CACHE_TAGS.chat(id)],
    fallbackError: "Could not update chat.",
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  return handleRequest({
    request,
    backendPath: `/chats/${id}`,
    init: { method: "DELETE" },
    revalidateTags: [CACHE_TAGS.chatList, CACHE_TAGS.chat(id)],
    fallbackError: "Could not delete chat.",
  });
}
