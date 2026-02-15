import { NextRequest } from "next/server";

import { CACHE_TAGS } from "@/app/api/agent/_utils/cache-tags";
import { handleRequest } from "@/app/api/agent/_utils/handle-request";

export async function GET(request: NextRequest) {
  return handleRequest({
    request,
    backendPath: "/mcp/servers",
    init: {
      method: "GET",
      cache: "no-store",
    },
    fallbackError: "Could not load MCP servers.",
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  return handleRequest({
    request,
    backendPath: "/mcp/servers/enabled",
    init: {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    revalidateTags: [CACHE_TAGS.mcpServers],
    fallbackError: "Could not update MCP servers.",
  });
}
