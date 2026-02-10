import { NextRequest } from "next/server";

import { CACHE_TAGS } from "@/app/api/agent/_utils/cache-tags";
import { handleRequest } from "@/app/api/agent/_utils/handle-request";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  return handleRequest({
    request,
    backendPath: `/chats/${id}/generate-summary`,
    init: { method: "POST" },
    revalidateTags: [CACHE_TAGS.chatList, CACHE_TAGS.chat(id)],
    fallbackError: "Could not generate chat summary.",
  });
}

