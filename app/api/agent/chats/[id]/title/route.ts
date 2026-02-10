import { NextRequest } from "next/server";

import { CACHE_TAGS } from "@/app/api/agent/_utils/cache-tags";
import { handleRequest } from "@/app/api/agent/_utils/handle-request";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  return handleRequest({
    request,
    backendPath: `/chats/${id}/title`,
    init: {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    revalidateTags: [CACHE_TAGS.chatList, CACHE_TAGS.chat(id)],
    fallbackError: "Could not update chat title.",
  });
}

