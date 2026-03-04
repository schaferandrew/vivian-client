"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronRight, Settings2 } from "lucide-react";
import { useChatStore } from "@/lib/stores/chat";
import type { MCPServerInfo, MCPServerSettingsSchema } from "@/types";

interface McpClientProps {
  initialServers: MCPServerInfo[];
  googleConnected: boolean;
}

export function McpClient({ initialServers, googleConnected }: McpClientProps) {
  const { mcpServers, setMcpServers, setMcpServerEnabled } = useChatStore();
  
  // Initialize store with server data
  useEffect(() => {
    setMcpServers(initialServers);
  }, [initialServers, setMcpServers]);

  const [expandedSettingsId, setExpandedSettingsId] = useState<string | null>(null);
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);
  const [settingsValues, setSettingsValues] = useState<Record<string, Record<string, unknown>>>({});
  const [settingsSchema, setSettingsSchema] = useState<Record<string, MCPServerSettingsSchema[]>>({});
  const [settingsLoading, setSettingsLoading] = useState<string | null>(null);
  const [settingsSaving, setSettingsSaving] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<Record<string, string | null>>({});
  const [settingsSuccess, setSettingsSuccess] = useState<Record<string, string | null>>({});
  const [testInputs, setTestInputs] = useState<Record<string, { a: string; b: string }>>({});
  const [testResults, setTestResults] = useState<Record<string, string>>({});
  const [testErrors, setTestErrors] = useState<Record<string, string>>({});
  const [testLoading, setTestLoading] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [customSettings, setCustomSettings] = useState<Record<string, unknown>>({});
  const [customSettingsLoading, setCustomSettingsLoading] = useState(true);
  const [customSettingsSaving, setCustomSettingsSaving] = useState(false);
  const [customSettingsError, setCustomSettingsError] = useState<string | null>(null);
  const [customSettingsSuccess, setCustomSettingsSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadCustomSettings = async () => {
      setCustomSettingsLoading(true);
      setCustomSettingsError(null);

      try {
        const response = await fetch("/api/agent/mcp/settings", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load custom MCP settings");

        const data = await response.json();
        const settingsCandidate =
          data && typeof data === "object" && data.settings && typeof data.settings === "object"
            ? (data.settings as Record<string, unknown>)
            : data;

        const typedCandidate =
          settingsCandidate && typeof settingsCandidate === "object"
            ? (settingsCandidate as Record<string, unknown>)
            : {};

        const explicitCustomSettings =
          (typedCandidate.custom_mcp_settings as Record<string, unknown> | undefined) ||
          (typedCandidate.custom_settings as Record<string, unknown> | undefined);

        const effectiveSettings = explicitCustomSettings || typedCandidate;

        const primitiveSettings = Object.entries(effectiveSettings).reduce<Record<string, unknown>>(
          (acc, [key, value]) => {
            if (
              typeof value === "string" ||
              typeof value === "number" ||
              typeof value === "boolean" ||
              value == null
            ) {
              acc[key] = value;
            }
            return acc;
          },
          {}
        );

        setCustomSettings(primitiveSettings);
      } catch (err) {
        setCustomSettingsError(
          err instanceof Error ? err.message : "Failed to load custom MCP settings"
        );
      } finally {
        setCustomSettingsLoading(false);
      }
    };

    void loadCustomSettings();
  }, []);

  const handleSaveCustomSettings = async () => {
    setCustomSettingsSaving(true);
    setCustomSettingsError(null);
    setCustomSettingsSuccess(null);

    try {
      const response = await fetch("/api/agent/mcp/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customSettings),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to save custom MCP settings");
      }

      setCustomSettingsSuccess("Custom MCP settings saved successfully");
    } catch (err) {
      setCustomSettingsError(
        err instanceof Error ? err.message : "Failed to save custom MCP settings"
      );
    } finally {
      setCustomSettingsSaving(false);
    }
  };

  const customSettingEntries = Object.entries(customSettings);

  const toLabel = (key: string) =>
    key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());

  const handleToggleServer = async (serverId: string) => {
    setGlobalError(null);
    
    const server = mcpServers.find((s) => s.id === serverId);
    if (!server) return;

    const newEnabled = !server.enabled;
    
    // Optimistic update
    setMcpServerEnabled(serverId, newEnabled);
    
    try {
      const enabledIds = mcpServers
        .map((s) => (s.id === serverId ? { ...s, enabled: newEnabled } : s))
        .filter((s) => s.enabled)
        .map((s) => s.id);

      const response = await fetch("/api/agent/mcp/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled_server_ids: enabledIds }),
      });

      if (!response.ok) {
        throw new Error("Failed to update MCP server");
      }
    } catch (err) {
      // Revert on error
      setMcpServerEnabled(serverId, !newEnabled);
      setGlobalError(err instanceof Error ? err.message : "Failed to update server");
    }
  };

  const handleExpandSettings = async (serverId: string) => {
    if (expandedSettingsId === serverId) {
      setExpandedSettingsId(null);
      return;
    }

    setExpandedSettingsId(serverId);
    setSettingsLoading(serverId);
    setSettingsError((prev) => ({ ...prev, [serverId]: null }));

    try {
      const response = await fetch(`/api/agent/mcp/servers/${serverId}/settings`);
      if (!response.ok) throw new Error("Failed to load settings");
      
      const data = await response.json();
      setSettingsValues((prev) => ({ ...prev, [serverId]: data.settings || {} }));
      setSettingsSchema((prev) => ({ ...prev, [serverId]: data.settings_schema || [] }));
    } catch (err) {
      setSettingsError((prev) => ({
        ...prev,
        [serverId]: err instanceof Error ? err.message : "Failed to load settings",
      }));
    } finally {
      setSettingsLoading(null);
    }
  };

  const handleSaveSettings = async (serverId: string) => {
    setSettingsSaving(serverId);
    setSettingsError((prev) => ({ ...prev, [serverId]: null }));
    setSettingsSuccess((prev) => ({ ...prev, [serverId]: null }));

    try {
      const response = await fetch(`/api/agent/mcp/servers/${serverId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: settingsValues[serverId] || {} }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to save settings");
      }

      setSettingsSuccess((prev) => ({ ...prev, [serverId]: "Settings saved successfully" }));
    } catch (err) {
      setSettingsError((prev) => ({
        ...prev,
        [serverId]: err instanceof Error ? err.message : "Failed to save settings",
      }));
    } finally {
      setSettingsSaving(null);
    }
  };

  const handleRunTest = async (serverId: string) => {
    const inputs = testInputs[serverId] || { a: "", b: "" };
    const a = Number(inputs.a);
    const b = Number(inputs.b);

    if (Number.isNaN(a) || Number.isNaN(b)) {
      setTestErrors((prev) => ({ ...prev, [serverId]: "Enter valid numbers" }));
      return;
    }

    setTestLoading(serverId);
    setTestErrors((prev) => ({ ...prev, [serverId]: "" }));
    setTestResults((prev) => ({ ...prev, [serverId]: "" }));

    try {
      const response = await fetch("/api/agent/mcp/test-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ a, b, server_id: serverId }),
      });

      if (!response.ok) throw new Error("Test failed");

      const data = await response.json();
      setTestResults((prev) => ({
        ...prev,
        [serverId]: `${data.a} + ${data.b} = ${data.sum}`,
      }));
    } catch (err) {
      setTestErrors((prev) => ({
        ...prev,
        [serverId]: err instanceof Error ? err.message : "Test failed",
      }));
    } finally {
      setTestLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Custom MCP Settings</CardTitle>
          <CardDescription>
            Configure custom MCP behavior and connection defaults.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {customSettingsLoading ? (
            <p className="text-sm text-muted-foreground">Loading custom MCP settings...</p>
          ) : customSettingEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No custom MCP settings are available for this workspace.
            </p>
          ) : (
            <div className="space-y-3">
              {customSettingEntries.map(([key, value]) => {
                const isBoolean = typeof value === "boolean";
                const isNumber = typeof value === "number";

                return (
                  <div key={key} className="grid gap-1.5">
                    <label className="text-sm font-medium text-foreground">{toLabel(key)}</label>

                    {isBoolean ? (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={(value as boolean) || false}
                          onCheckedChange={(checked) =>
                            setCustomSettings((prev) => ({
                              ...prev,
                              [key]: checked === true,
                            }))
                          }
                        />
                        <span className="text-sm text-muted-foreground">Enabled</span>
                      </div>
                    ) : (
                      <Input
                        type={isNumber ? "number" : "text"}
                        value={value == null ? "" : String(value)}
                        onChange={(e) =>
                          setCustomSettings((prev) => ({
                            ...prev,
                            [key]: isNumber
                              ? e.target.value === ""
                                ? null
                                : Number(e.target.value)
                              : e.target.value,
                          }))
                        }
                      />
                    )}
                  </div>
                );
              })}

              <div className="flex items-center gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={handleSaveCustomSettings}
                  loading={customSettingsSaving}
                  loadingText="Saving..."
                >
                  Save Custom Settings
                </Button>
                {customSettingsSuccess && (
                  <span className="text-sm text-[var(--success-600)]">{customSettingsSuccess}</span>
                )}
              </div>

              {customSettingsError && (
                <p className="text-sm text-[var(--error-700)]">{customSettingsError}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>MCP Servers</CardTitle>
          <CardDescription>
            Enable or disable tools available to chat and workflow steps.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
        {mcpServers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No MCP servers discovered yet.</p>
        ) : (
          <div className="space-y-2">
            {mcpServers.map((server) => {
              const hasSettings = (server.settings_schema?.length || 0) > 0;
              const canTest = server.tools.includes("add_numbers");
              const isSettingsExpanded = expandedSettingsId === server.id;
              const isTestExpanded = expandedTestId === server.id;
              const schema = settingsSchema[server.id] || server.settings_schema || [];
              const values = settingsValues[server.id] || {};
              const isSettingsLoading = settingsLoading === server.id;
              const isSettingsSaving = settingsSaving === server.id;

              return (
                <div key={server.id} className="rounded-md border border-border p-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{server.name}</p>
                        {server.requires_connection === "google" && googleConnected ? (
                          <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-[var(--success-100)] text-[var(--success-800)] dark:bg-[var(--success-900)] dark:text-[var(--success-100)]">
                            Google connected
                          </span>
                        ) : server.requires_connection ? (
                          <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-[var(--primary-100)] text-[var(--primary-800)] dark:bg-[var(--primary-900)] dark:text-[var(--primary-100)]">
                            Requires: {server.requires_connection}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">{server.description}</p>
                      <p className="text-[11px] text-[var(--neutral-500)] mt-1">
                        {server.source === "builtin" ? "Built-in" : "Custom"} · Tools:{" "}
                        {server.tools.join(", ")}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {hasSettings && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExpandSettings(server.id)}
                        >
                          <Settings2 className="w-4 h-4 mr-1" />
                          Settings
                        </Button>
                      )}

                      {canTest && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setExpandedTestId((current) =>
                              current === server.id ? null : server.id
                            )
                          }
                        >
                          {isTestExpanded ? (
                            <ChevronDown className="w-4 h-4 mr-1" />
                          ) : (
                            <ChevronRight className="w-4 h-4 mr-1" />
                          )}
                          Test
                        </Button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleToggleServer(server.id)}
                        className={`text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors ${
                          server.enabled
                            ? "bg-[var(--success-100)] text-[var(--success-700)]"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {server.enabled ? "ON" : "OFF"}
                      </button>
                    </div>
                  </div>

                  {/* Settings Panel */}
                  {isSettingsExpanded && hasSettings && (
                    <div className="mt-3 pt-3 border-t border-border space-y-4">
                      <p className="text-xs font-medium text-muted-foreground">
                        Server Configuration
                      </p>

                      {isSettingsLoading ? (
                        <p className="text-sm text-muted-foreground">Loading settings...</p>
                      ) : (
                        <div className="space-y-3">
                          {schema.map((field) => {
                            const value = values[field.key];
                            return (
                              <div key={field.key} className="grid gap-1.5">
                                <label className="text-sm font-medium text-foreground">
                                  {field.label}
                                  {field.required && (
                                    <span className="text-[var(--error-600)] ml-1">*</span>
                                  )}
                                </label>
                                {(field.type === "string" ||
                                  field.type === "folder_id" ||
                                  field.type === "spreadsheet_id" ||
                                  field.type === "text") && (
                                  <Input
                                    value={(value as string) || ""}
                                    onChange={(e) =>
                                      setSettingsValues((prev) => ({
                                        ...prev,
                                        [server.id]: {
                                          ...prev[server.id],
                                          [field.key]: e.target.value,
                                        },
                                      }))
                                    }
                                    placeholder={field.default?.toString()}
                                    disabled={!server.editable}
                                  />
                                )}
                                {field.type === "number" && (
                                  <Input
                                    type="number"
                                    value={(value as number) || ""}
                                    onChange={(e) =>
                                      setSettingsValues((prev) => ({
                                        ...prev,
                                        [server.id]: {
                                          ...prev[server.id],
                                          [field.key]: e.target.value
                                            ? Number(e.target.value)
                                            : undefined,
                                        },
                                      }))
                                    }
                                    placeholder={field.default?.toString()}
                                    disabled={!server.editable}
                                  />
                                )}
                                {field.type === "boolean" && (
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      checked={(value as boolean) || false}
                                      onCheckedChange={(checked) =>
                                        setSettingsValues((prev) => ({
                                          ...prev,
                                          [server.id]: {
                                            ...prev[server.id],
                                            [field.key]: checked === true,
                                          },
                                        }))
                                      }
                                      disabled={!server.editable}
                                    />
                                    <span className="text-sm text-muted-foreground">
                                      Enabled
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {server.editable && (
                            <div className="flex items-center gap-2 pt-2">
                              <Button
                                size="sm"
                                onClick={() => handleSaveSettings(server.id)}
                                loading={isSettingsSaving}
                                loadingText="Saving..."
                              >
                                Save Settings
                              </Button>
                              {settingsSuccess[server.id] && (
                                <span className="text-sm text-[var(--success-600)]">
                                  {settingsSuccess[server.id]}
                                </span>
                              )}
                            </div>
                          )}

                          {settingsError[server.id] && (
                            <p className="text-sm text-[var(--error-700)]">
                              {settingsError[server.id]}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Test Panel */}
                  {isTestExpanded && canTest && (
                    <div className="mt-3 pt-3 border-t border-border space-y-3">
                      <p className="text-xs text-muted-foreground">
                        Run protocol test for `{server.id}`.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={testInputs[server.id]?.a || ""}
                          onChange={(e) =>
                            setTestInputs((prev) => ({
                              ...prev,
                              [server.id]: { ...prev[server.id], a: e.target.value },
                            }))
                          }
                          placeholder="A"
                        />
                        <Input
                          value={testInputs[server.id]?.b || ""}
                          onChange={(e) =>
                            setTestInputs((prev) => ({
                              ...prev,
                              [server.id]: { ...prev[server.id], b: e.target.value },
                            }))
                          }
                          placeholder="B"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleRunTest(server.id)}
                          loading={testLoading === server.id}
                          loadingText="Running..."
                        >
                          Run test
                        </Button>
                        {testResults[server.id] && (
                          <span className="text-sm text-[var(--success-600)]">
                            {testResults[server.id]}
                          </span>
                        )}
                      </div>
                      {testErrors[server.id] && (
                        <p className="text-sm text-[var(--error-700)]">
                          {testErrors[server.id]}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {globalError && <p className="text-sm text-[var(--error-700)]">{globalError}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
