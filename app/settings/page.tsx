"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Globe, Link2, Server, XCircle } from "lucide-react";
import Link from "next/link";
import { useChatStore } from "@/lib/stores/chat";
import { runMcpAdditionTest, updateEnabledMcpServers } from "@/lib/api/client";

type GoogleStatus = {
  connected: boolean;
  outdated: boolean;
  has_required_targets: boolean;
  last_connected_at?: string | null;
  updated_at: string;
  message: string;
};

const GOOGLE_STATUS_PROXY_URL = "/api/agent/integrations/google/status";
const GOOGLE_DISCONNECT_PROXY_URL = "/api/agent/integrations/google/disconnect";
const GOOGLE_OAUTH_START_PROXY_URL = "/api/agent/integrations/google/oauth/start";

export default function SettingsPage() {
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [testA, setTestA] = useState("2");
  const [testB, setTestB] = useState("3");
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [runningTest, setRunningTest] = useState(false);

  const { mcpServers, fetchMcpServers, setMcpServerEnabled } = useChatStore();

  const settingsBaseUrl = useMemo(() => {
    if (typeof window === "undefined") return "http://localhost:3000/settings";
    return `${window.location.origin}/settings`;
  }, []);

  const fetchGoogleStatus = useCallback(async () => {
    setLoadingStatus(true);
    setStatusError(null);
    try {
      const response = await fetch(GOOGLE_STATUS_PROXY_URL, { cache: "no-store" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as {
          detail?: string;
          error?: string;
          message?: string;
        };
        throw new Error(
          payload.detail ||
          payload.error ||
          payload.message ||
          `Status API failed (${response.status})`
        );
      }
      const data = (await response.json()) as GoogleStatus;
      setGoogleStatus(data);
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "Could not load Google status");
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    fetchGoogleStatus();
  }, [fetchGoogleStatus]);

  useEffect(() => {
    fetchMcpServers();
  }, [fetchMcpServers]);

  const connectUrl = useMemo(() => {
    const returnTo = encodeURIComponent(settingsBaseUrl);
    return `${GOOGLE_OAUTH_START_PROXY_URL}?return_to=${returnTo}`;
  }, [settingsBaseUrl]);

  const handleDisconnect = async () => {
    setDisconnecting(true);
    setStatusError(null);
    try {
      const response = await fetch(GOOGLE_DISCONNECT_PROXY_URL, {
        method: "POST",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as {
          detail?: string;
          error?: string;
          message?: string;
        };
        throw new Error(
          payload.detail ||
          payload.error ||
          payload.message ||
          "Disconnect failed"
        );
      }
      await fetchGoogleStatus();
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "Disconnect failed");
    } finally {
      setDisconnecting(false);
    }
  };

  const handleToggleMcpServer = async (serverId: string) => {
    const nextServers = mcpServers.map((server) =>
      server.id === serverId ? { ...server, enabled: !server.enabled } : server
    );
    const nextEnabled = nextServers.filter((server) => server.enabled).map((server) => server.id);
    const nextEnabledForServer = !!nextServers.find((server) => server.id === serverId)?.enabled;

    setMcpServerEnabled(serverId, nextEnabledForServer);
    try {
      await updateEnabledMcpServers(nextEnabled);
    } catch (error) {
      console.error("Failed to persist MCP server settings:", error);
      setStatusError(error instanceof Error ? error.message : "Could not update MCP servers");
    }
  };

  const handleRunAdditionTest = async () => {
    setRunningTest(true);
    setTestError(null);
    setTestResult(null);
    try {
      const a = Number(testA);
      const b = Number(testB);
      if (Number.isNaN(a) || Number.isNaN(b)) {
        throw new Error("Enter valid numbers for A and B.");
      }
      const result = await runMcpAdditionTest(a, b);
      setTestResult(`${result.a} + ${result.b} = ${result.sum}`);
    } catch (error) {
      setTestError(error instanceof Error ? error.message : "Addition test failed");
    } finally {
      setRunningTest(false);
    }
  };

  const statusTone = googleStatus?.connected ? "text-[var(--success-600)]" : "text-[var(--error-700)]";
  const statusIcon = googleStatus?.connected ? (
    <CheckCircle2 className="w-4 h-4 text-[var(--success-600)]" />
  ) : (
    <XCircle className="w-4 h-4 text-[var(--error-700)]" />
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-semibold">Settings</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-muted-foreground" />
              <CardTitle>API Configuration</CardTitle>
            </div>
            <CardDescription>Configure the connection to your Vivian backend</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">API URL</label>
              <Input
                value={process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:8000/api/v1"}
                disabled
                className="bg-secondary"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Set via NEXT_PUBLIC_AGENT_API_URL environment variable
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-2">WebSocket URL</label>
              <Input
                value={process.env.NEXT_PUBLIC_AGENT_WS_URL || "ws://localhost:8000/api/v1/chat/ws"}
                disabled
                className="bg-secondary"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Set via NEXT_PUBLIC_AGENT_WS_URL environment variable
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-muted-foreground" />
              <CardTitle>Integrations</CardTitle>
            </div>
            <CardDescription>Connect Google Drive and Google Sheets for receipt automation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border border-border p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {statusIcon}
                  <span className="font-medium">Google Drive</span>
                </div>
                {loadingStatus ? (
                  <span className="text-sm text-muted-foreground">Checking...</span>
                ) : (
                  <span className={`text-sm ${statusTone}`}>
                    {googleStatus?.connected ? "Connected" : "Not connected"}
                  </span>
                )}
              </div>

              {googleStatus && (
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>{googleStatus.message}</p>
                  {googleStatus.last_connected_at && (
                    <p>Last connected: {new Date(googleStatus.last_connected_at).toLocaleString()}</p>
                  )}
                  {!googleStatus.has_required_targets && (
                    <p>
                      Folder IDs or spreadsheet ID are incomplete. Set
                      `VIVIAN_API_MCP_REIMBURSED_FOLDER_ID`, `VIVIAN_API_MCP_UNREIMBURSED_FOLDER_ID`,
                      and `VIVIAN_API_MCP_SHEETS_SPREADSHEET_ID` in API env.
                    </p>
                  )}
                </div>
              )}

              {statusError && <p className="text-sm text-[var(--error-700)]">{statusError}</p>}

              <div className="flex flex-wrap gap-2">
                <a href={connectUrl}>
                  <Button variant={googleStatus?.connected ? "outline" : "default"}>
                    {googleStatus?.connected ? "Reconnect Google" : "Connect Google"}
                  </Button>
                </a>
                <Button variant="ghost" onClick={fetchGoogleStatus} disabled={loadingStatus}>
                  Refresh status
                </Button>
                {googleStatus?.connected && (
                  <Button variant="destructive" onClick={handleDisconnect} disabled={disconnecting}>
                    {disconnecting ? "Disconnecting..." : "Disconnect"}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-muted-foreground" />
              <CardTitle>MCP Servers</CardTitle>
            </div>
            <CardDescription>Enable tools that can be used during chat and backend workflows</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {mcpServers.length === 0 && (
                <p className="text-sm text-muted-foreground">No MCP servers discovered yet.</p>
              )}
              {mcpServers.map((server) => (
                <div
                  key={server.id}
                  className="rounded-md border border-border p-3 flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="font-medium text-sm">{server.name}</p>
                    <p className="text-xs text-muted-foreground">{server.description}</p>
                    <p className="text-[11px] text-[var(--neutral-500)] mt-1">
                      {server.source === "builtin" ? "Built-in" : "Custom"} · Tools: {server.tools.join(", ")}
                    </p>
                  </div>
                  <Button
                    variant={server.enabled ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleToggleMcpServer(server.id)}
                  >
                    {server.enabled ? "Enabled" : "Disabled"}
                  </Button>
                </div>
              ))}
            </div>

            <div className="rounded-md border border-border p-4 space-y-3">
              <p className="text-sm font-medium">Test MCP addition server</p>
              <div className="grid grid-cols-2 gap-2">
                <Input value={testA} onChange={(e) => setTestA(e.target.value)} placeholder="A" />
                <Input value={testB} onChange={(e) => setTestB(e.target.value)} placeholder="B" />
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={handleRunAdditionTest} disabled={runningTest}>
                  {runningTest ? "Running..." : "Run addition test"}
                </Button>
                {testResult && <span className="text-sm text-[var(--success-600)]">{testResult}</span>}
              </div>
              {testError && <p className="text-sm text-[var(--error-700)]">{testError}</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-muted-foreground" />
              <CardTitle>About</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong>Version:</strong> 0.1.0
              </p>
              <p>
                <strong>Client:</strong> Vivian Household Agent
              </p>
              <p className="text-xs text-[var(--neutral-400)] mt-4">
                Built with Next.js, TypeScript, and Tailwind CSS
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
