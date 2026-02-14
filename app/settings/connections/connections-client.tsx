"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle } from "lucide-react";

interface GoogleIntegrationStatus {
  connected: boolean;
  message: string;
  provider_email?: string;
  connected_by?: string;
  connected_at?: string;
  scopes?: string[];
}

interface ConnectionsClientProps {
  initialGoogleStatus: GoogleIntegrationStatus;
  apiUrl: string;
  wsUrl: string;
}

export function ConnectionsClient({
  initialGoogleStatus,
  apiUrl,
  wsUrl,
}: ConnectionsClientProps) {
  const [googleStatus, setGoogleStatus] = useState(initialGoogleStatus);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    setError(null);

    try {
      const response = await fetch("/api/agent/integrations/google/disconnect", {
        method: "POST",
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.detail || payload.error || "Disconnect failed");
      }

      // Optimistic update
      setGoogleStatus({
        ...googleStatus,
        connected: false,
        message: "Not connected",
        provider_email: undefined,
        connected_by: undefined,
        connected_at: undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Disconnect failed");
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleConnect = () => {
    const returnTo = encodeURIComponent(window.location.href);
    window.location.href = `/api/agent/integrations/google/oauth/start?return_to=${returnTo}`;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Google Drive/Sheets
            {googleStatus.connected ? (
              <CheckCircle2 className="w-5 h-5 text-[var(--success-600)]" />
            ) : (
              <XCircle className="w-5 h-5 text-[var(--error-600)]" />
            )}
          </CardTitle>
          <CardDescription>
            {googleStatus.connected
              ? "Connected to Google for file storage and spreadsheets."
              : "Connect your Google account to enable file storage and spreadsheets."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {googleStatus.connected ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status</span>
                <span className="text-sm text-[var(--success-600)]">Connected</span>
              </div>
              {googleStatus.provider_email && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Account</span>
                  <span className="text-sm text-muted-foreground">
                    {googleStatus.provider_email}
                  </span>
                </div>
              )}
              {googleStatus.connected_by && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Connected by</span>
                  <span className="text-sm text-muted-foreground">
                    {googleStatus.connected_by}
                  </span>
                </div>
              )}
              {googleStatus.connected_at && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Connected at</span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(googleStatus.connected_at).toLocaleDateString()}
                  </span>
                </div>
              )}
              {googleStatus.scopes && googleStatus.scopes.length > 0 && (
                <div className="space-y-1">
                  <span className="text-sm font-medium">Scopes</span>
                  <p className="text-xs text-muted-foreground">
                    {googleStatus.scopes.join(", ")}
                  </p>
                </div>
              )}
              <Button
                variant="outline"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="mt-2"
              >
                {isDisconnecting ? "Disconnecting..." : "Disconnect Google"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Connect your Google account to enable file uploads, Google Sheets integration, and
                Drive folder access.
              </p>
              <Button onClick={handleConnect}>Connect Google Account</Button>
            </div>
          )}
          {error && <p className="text-sm text-[var(--error-700)]">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Backend Connection</CardTitle>
          <CardDescription>Runtime connection values for this client.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">API URL</label>
            <Input value={apiUrl} disabled className="bg-secondary" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">
              WebSocket URL
            </label>
            <Input value={wsUrl} disabled className="bg-secondary" />
          </div>
        </CardContent>
      </Card>
    </>
  );
}
