import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { McpClient } from "./mcp-client";
import { SettingsSkeleton } from "../components/settings-skeleton";
import { SettingsError } from "../components/settings-error";

interface GoogleIntegrationStatus {
  connected: boolean;
  message: string;
  provider_email?: string;
  connected_by?: string;
  connected_at?: string;
  scopes?: string[];
}

interface MCPServerSettingsSchema {
  key: string;
  label: string;
  type: "string" | "number" | "boolean" | "folder_id" | "spreadsheet_id" | "text";
  required: boolean;
  default?: string | number | boolean;
}

interface MCPServerInfo {
  id: string;
  name: string;
  description: string;
  tools: string[];
  default_enabled: boolean;
  enabled: boolean;
  source: "builtin" | "custom" | string;
  requires_connection: string | null;
  settings_schema: MCPServerSettingsSchema[] | null;
  settings: Record<string, unknown> | null;
  editable: boolean;
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

  const data = await response.json();
  return data.servers || [];
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
