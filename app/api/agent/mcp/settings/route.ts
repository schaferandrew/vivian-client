import { NextRequest } from "next/server";

import { handleRequest } from "@/app/api/agent/_utils/handle-request";

export async function GET(request: NextRequest) {
  return handleRequest({
    request,
    backendPath: "/mcp/settings",
    init: {
      method: "GET",
      cache: "no-store",
    },
    fallbackError: "Could not load MCP settings.",
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  return handleRequest({
    request,
    backendPath: "/mcp/settings",
    init: {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    fallbackError: "Could not save MCP settings.",
  });
}
