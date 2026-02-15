import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ConnectionsClient } from "./connections-client";
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

async function fetchGoogleStatus(): Promise<GoogleIntegrationStatus> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/agent/integrations/google/status`,
    {
      headers: { Cookie: cookieHeader },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      redirect("/login?next=/settings/connections");
    }
    throw new Error("Failed to load Google connection status");
  }

  return response.json();
}

async function ConnectionsContent() {
  try {
    const googleStatus = await fetchGoogleStatus();
    
    return (
      <ConnectionsClient
        initialGoogleStatus={googleStatus}
        apiUrl={process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:8000/api/v1"}
        wsUrl={process.env.NEXT_PUBLIC_AGENT_WS_URL || "ws://localhost:8000/api/v1/chat/ws"}
      />
    );
  } catch (error) {
    return (
      <SettingsError
        error={error instanceof Error ? error : new Error("Unknown error")}
        title="Failed to load connections"
      />
    );
  }
}

export default function ConnectionsPage() {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <ConnectionsContent />
    </Suspense>
  );
}
