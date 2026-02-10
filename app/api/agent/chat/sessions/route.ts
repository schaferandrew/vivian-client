import { NextRequest } from "next/server";

import { handleRequest } from "@/app/api/agent/_utils/handle-request";

export async function POST(request: NextRequest) {
  return handleRequest({
    request,
    backendPath: "/chat/sessions",
    init: { method: "POST" },
    fallbackError: "Could not create chat session.",
  });
}

