import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { McpClient } from "./mcp-client";
import { mcpServersResponseSchema } from "@/lib/schemas/mcp";
import { SettingsSkeleton } from "../components/settings-skeleton";
import { SettingsError } from "../components/settings-error";
import type { MCPServerInfo } from "@/types";

interface GoogleIntegrationStatus {
  connected: boolean;
  message: string;
  provider_email?: string;
  connected_by?: string;
  connected_at?: string;
  scopes?: string[];
}

async function fetchGoogleStatus(): Promise<GoogleIntegrationStatus | null> {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/agent/integrations/google/status`,
      {
        headers: { Cookie: cookieHeader },
        cache: "no-store",
      }
    );

    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

async function fetchMcpServers(): Promise<MCPServerInfo[]> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/agent/mcp/servers`,
    {
      headers: { Cookie: cookieHeader },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      redirect("/login?next=/settings/mcp");
    }
    throw new Error("Failed to load MCP servers");
  }

  const payload = await response.json();
  const parsed = mcpServersResponseSchema.parse(payload);
  return parsed.servers;
}

async function McpContent() {
  try {
    const [googleStatus, servers] = await Promise.all([
      fetchGoogleStatus(),
      fetchMcpServers(),
    ]);

    return (
      <McpClient
        initialServers={servers}
        googleConnected={googleStatus?.connected ?? false}
      />
    );
  } catch (error) {
    return (
      <SettingsError
        error={error instanceof Error ? error : new Error("Unknown error")}
        title="Failed to load MCP servers"
      />
    );
  }
}

export default function McpPage() {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <McpContent />
    </Suspense>
  );
}
