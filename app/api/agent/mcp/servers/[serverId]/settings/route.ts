import { NextRequest } from "next/server";

import { CACHE_TAGS } from "@/app/api/agent/_utils/cache-tags";
import { handleRequest } from "@/app/api/agent/_utils/handle-request";

export async function GET(request: NextRequest, { params }: { params: { serverId: string } }) {
  return handleRequest({
    request,
    backendPath: `/mcp/servers/${params.serverId}/settings`,
    init: {
      method: "GET",
      cache: "force-cache",
      next: { tags: [`${CACHE_TAGS.mcpServers}:${params.serverId}`] },
    },
    fallbackError: `Could not load settings for MCP server: ${params.serverId}`,
  });
}

export async function PUT(request: NextRequest, { params }: { params: { serverId: string } }) {
  const body = await request.json().catch(() => ({ settings: {} }));

  return handleRequest({
    request,
    backendPath: `/mcp/servers/${params.serverId}/settings`,
    init: {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    revalidateTags: [CACHE_TAGS.mcpServers, `${CACHE_TAGS.mcpServers}:${params.serverId}`],
    fallbackError: `Could not update settings for MCP server: ${params.serverId}`,
  });
}
