"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Camera, Tv, UtensilsCrossed } from "lucide-react";

export interface LinkSetting {
  id: string;
  home_id: string;
  key: string;
  label: string;
  url: string | null;
  port: number | null;
  icon: string | null;
  created_at: string;
  updated_at: string;
}

const APPS = [
  {
    key: "mealie",
    label: "Mealie",
    description: "Recipe management and meal planning",
    defaultPort: "9000",
    Icon: UtensilsCrossed,
    iconBg: "bg-[var(--success-100)] dark:bg-[var(--success-900)]",
    iconColor: "text-[var(--success-700)] dark:text-[var(--success-200)]",
  },
  {
    key: "jellyfin",
    label: "Jellyfin",
    description: "Media server and streaming",
    defaultPort: "8096",
    Icon: Tv,
    iconBg: "bg-[var(--primary-100)] dark:bg-[var(--primary-900)]",
    iconColor: "text-[var(--primary-700)] dark:text-[var(--primary-200)]",
  },
  {
    key: "immich",
    label: "Immich",
    description: "Photo and image management",
    defaultPort: "2283",
    Icon: Camera,
    iconBg: "bg-[var(--warning-100)] dark:bg-[var(--warning-900)]",
    iconColor: "text-[var(--warning-700)] dark:text-[var(--warning-200)]",
  },
] as const;

type AppKey = (typeof APPS)[number]["key"];

interface AppDraft {
  enabled: boolean;
  url: string;
  port: string;
}

function buildInitialDrafts(existing: LinkSetting[]): Record<AppKey, AppDraft> {
  const byKey = Object.fromEntries(existing.map((s) => [s.key, s]));
  return Object.fromEntries(
    APPS.map(({ key, defaultPort }) => {
      const record = byKey[key] as LinkSetting | undefined;
      return [
        key,
        {
          enabled: !!record,
          url: record?.url ?? "",
          port: record?.port?.toString() ?? defaultPort,
        },
      ];
    })
  ) as Record<AppKey, AppDraft>;
}

interface ConnectedAppsClientProps {
  initialSettings: LinkSetting[];
}

export function ConnectedAppsClient({ initialSettings }: ConnectedAppsClientProps) {
  const [drafts, setDrafts] = useState<Record<AppKey, AppDraft>>(() =>
    buildInitialDrafts(initialSettings)
  );
  const [existingByKey, setExistingByKey] = useState<Record<string, LinkSetting>>(() =>
    Object.fromEntries(initialSettings.map((s) => [s.key, s]))
  );
  const [saving, setSaving] = useState<Record<AppKey, boolean>>({
    mealie: false,
    jellyfin: false,
    immich: false,
  });
  const [errors, setErrors] = useState<Record<AppKey, string | null>>({
    mealie: null,
    jellyfin: null,
    immich: null,
  });
  const [successes, setSuccesses] = useState<Record<AppKey, string | null>>({
    mealie: null,
    jellyfin: null,
    immich: null,
  });

  const updateDraft = (key: AppKey, patch: Partial<AppDraft>) => {
    setDrafts((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  const setAppStatus = (key: AppKey, error: string | null, success: string | null) => {
    setErrors((prev) => ({ ...prev, [key]: error }));
    setSuccesses((prev) => ({ ...prev, [key]: success }));
  };

  const handleSave = async (key: AppKey, appLabel: string) => {
    const draft = drafts[key];
    const existing = existingByKey[key];

    setSaving((prev) => ({ ...prev, [key]: true }));
    setAppStatus(key, null, null);

    try {
      if (!draft.enabled) {
        // DELETE if a record exists
        if (existing) {
          const res = await fetch(`/api/agent/link-settings/${key}`, { method: "DELETE" });
          if (!res.ok && res.status !== 404) {
            const payload = await res.json().catch(() => ({}));
            throw new Error(payload.detail || "Failed to remove");
          }
          setExistingByKey((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
        }
        setAppStatus(key, null, `${appLabel} removed.`);
        return;
      }

      const portNum = draft.port.trim() ? parseInt(draft.port, 10) : null;
      const urlVal = draft.url.trim() || null;

      if (existing) {
        // PUT to update
        const res = await fetch(`/api/agent/link-settings/${key}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: urlVal, port: portNum }),
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload.detail || "Failed to update");
        }
        const updated: LinkSetting = await res.json();
        setExistingByKey((prev) => ({ ...prev, [key]: updated }));
      } else {
        // POST to create
        const res = await fetch("/api/agent/link-settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, label: appLabel, url: urlVal, port: portNum }),
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload.detail || "Failed to create");
        }
        const created: LinkSetting = await res.json();
        setExistingByKey((prev) => ({ ...prev, [key]: created }));
      }

      setAppStatus(key, null, `${appLabel} saved.`);
    } catch (err) {
      setAppStatus(key, err instanceof Error ? err.message : "Failed to save", null);
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Connected Apps</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Enable self-hosted services to add quick-launch links to the dashboard.
          Enter the base URL (e.g. <span className="font-mono">http://192.168.1.10</span>) and port for each app.
        </p>
      </div>

      {APPS.map(({ key, label, description, defaultPort, Icon, iconBg, iconColor }) => {
        const draft = drafts[key];
        const resolvedUrl =
          draft.enabled && draft.url
            ? draft.port
              ? `${draft.url.replace(/\/$/, "")}:${draft.port}`
              : draft.url
            : null;

        return (
          <Card key={key} className={!draft.enabled ? "opacity-60" : undefined}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconBg}`}>
                    <Icon className={`h-4 w-4 ${iconColor}`} />
                  </div>
                  <div>
                    <CardTitle className="text-base">{label}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={draft.enabled}
                  onClick={() =>
                    updateDraft(key, {
                      enabled: !draft.enabled,
                      port: draft.port || defaultPort,
                    })
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    draft.enabled ? "bg-[var(--primary-600)]" : "bg-secondary border border-border"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform ${
                      draft.enabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </CardHeader>

            {draft.enabled && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
                  <FormField htmlFor={`${key}-url`} label="Base URL">
                    <Input
                      id={`${key}-url`}
                      value={draft.url}
                      onChange={(e) => updateDraft(key, { url: e.target.value })}
                      placeholder="http://192.168.1.10"
                    />
                  </FormField>
                  <FormField htmlFor={`${key}-port`} label="Port">
                    <Input
                      id={`${key}-port`}
                      value={draft.port}
                      onChange={(e) => updateDraft(key, { port: e.target.value })}
                      placeholder={defaultPort}
                      className="w-[110px]"
                    />
                  </FormField>
                </div>

                {resolvedUrl && (
                  <p className="text-xs text-muted-foreground font-mono">{resolvedUrl}</p>
                )}

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => handleSave(key, label)}
                    loading={saving[key]}
                    loadingText="Saving..."
                  >
                    Save
                  </Button>
                </div>

                {errors[key] && (
                  <p className="text-sm text-[var(--error-700)]">{errors[key]}</p>
                )}
                {successes[key] && (
                  <p className="text-sm text-[var(--success-700)]">{successes[key]}</p>
                )}
              </CardContent>
            )}

            {!draft.enabled && existingByKey[key] && (
              <CardContent>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleSave(key, label)}
                    loading={saving[key]}
                    loadingText="Removing..."
                  >
                    Remove
                  </Button>
                </div>
                {errors[key] && (
                  <p className="mt-2 text-sm text-[var(--error-700)]">{errors[key]}</p>
                )}
                {successes[key] && (
                  <p className="mt-2 text-sm text-[var(--success-700)]">{successes[key]}</p>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
