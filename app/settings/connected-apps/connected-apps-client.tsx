"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Camera, Tv, UtensilsCrossed } from "lucide-react";

export interface ConnectedAppsSettings {
  base_url?: string;
  mealie_enabled?: boolean;
  mealie_port?: string;
  jellyfin_enabled?: boolean;
  jellyfin_port?: string;
  immich_enabled?: boolean;
  immich_port?: string;
}

interface ConnectedAppsClientProps {
  initialSettings: ConnectedAppsSettings;
}

const APP_DEFAULTS = {
  mealie: { label: "Mealie", port: "9000", description: "Recipe management and meal planning", Icon: UtensilsCrossed },
  jellyfin: { label: "Jellyfin", port: "8096", description: "Media server and streaming", Icon: Tv },
  immich: { label: "Immich", port: "2283", description: "Photo and image management", Icon: Camera },
} as const;

type AppKey = keyof typeof APP_DEFAULTS;

export function ConnectedAppsClient({ initialSettings }: ConnectedAppsClientProps) {
  const [settings, setSettings] = useState<ConnectedAppsSettings>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/agent/services/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail || "Failed to save settings");
      }

      setSuccess("Connected apps saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleApp = (app: AppKey) => {
    setSettings((prev) => ({
      ...prev,
      [`${app}_enabled`]: !prev[`${app}_enabled`],
      [`${app}_port`]: prev[`${app}_port`] ?? APP_DEFAULTS[app].port,
    }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Connected Apps</CardTitle>
          <CardDescription>
            Set the base URL for your household server, then enable each app and configure its port.
            The dashboard will link to <span className="font-mono text-xs">base-url:port</span> for each enabled app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField htmlFor="base-url" label="Base URL">
            <Input
              id="base-url"
              value={settings.base_url ?? ""}
              onChange={(e) => setSettings((prev) => ({ ...prev, base_url: e.target.value }))}
              placeholder="http://192.168.1.10"
            />
          </FormField>
        </CardContent>
      </Card>

      {(["mealie", "jellyfin", "immich"] as AppKey[]).map((app) => {
        const { label, description, Icon } = APP_DEFAULTS[app];
        const enabled = settings[`${app}_enabled`] ?? false;
        const port = settings[`${app}_port`] ?? APP_DEFAULTS[app].port;

        return (
          <Card key={app} className={!enabled ? "opacity-60" : undefined}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-base">{label}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  onClick={() => toggleApp(app)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    enabled
                      ? "bg-[var(--primary-600)]"
                      : "bg-secondary border border-border"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform ${
                      enabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </CardHeader>
            {enabled && (
              <CardContent>
                <FormField htmlFor={`${app}-port`} label="Port">
                  <Input
                    id={`${app}-port`}
                    value={port}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, [`${app}_port`]: e.target.value }))
                    }
                    placeholder={APP_DEFAULTS[app].port}
                    className="max-w-[160px]"
                  />
                </FormField>
                {settings.base_url && port && (
                  <p className="mt-2 text-xs text-muted-foreground font-mono">
                    {settings.base_url}:{port}
                  </p>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}

      <div className="flex items-center gap-2">
        <Button onClick={handleSave} loading={isSaving} loadingText="Saving...">
          Save
        </Button>
      </div>
      {error && <p className="text-sm text-[var(--error-700)]">{error}</p>}
      {success && <p className="text-sm text-[var(--success-700)]">{success}</p>}
    </div>
  );
}
