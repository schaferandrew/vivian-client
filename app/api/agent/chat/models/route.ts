import { NextRequest } from "next/server";

import { CACHE_TAGS } from "@/app/api/agent/_utils/cache-tags";
import { handleRequest } from "@/app/api/agent/_utils/handle-request";

export async function GET(request: NextRequest) {
  return handleRequest({
    request,
    backendPath: "/chat/models",
    init: {
      method: "GET",
      cache: "force-cache",
      next: { tags: [CACHE_TAGS.models] },
    },
    fallbackError: "Could not reach the chat server. Is the backend running?",
  });
}
