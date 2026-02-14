import { NextRequest } from "next/server";

import { handleRequest } from "@/app/api/agent/_utils/handle-request";

export async function GET(request: NextRequest) {
  return handleRequest({
    request,
    backendPath: "/chat/models",
    init: {
      method: "GET",
      cache: "no-store",
    },
    fallbackError: "Could not reach the chat server. Is the backend running?",
  });
}
