"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, Trash2 } from "lucide-react";

interface ApiKeyListItem {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
  last_used_at: string | null;
}

interface ApiKeysClientProps {
  initialKeys: ApiKeyListItem[];
  canManageHome: boolean;
}

interface NewKeyResult {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
  key: string;
}

export function ApiKeysClient({ initialKeys, canManageHome }: ApiKeysClientProps) {
  const [keys, setKeys] = useState<ApiKeyListItem[]>(initialKeys);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newKeyResult, setNewKeyResult] = useState<NewKeyResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);

  const handleCreate = async () => {
    const name = newKeyName.trim();
    if (!name) {
      setCreateError("Key name is required");
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const response = await fetch("/api/agent/home/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.detail || payload.error || "Failed to create key");
      }

      const created = payload as NewKeyResult;
      setNewKeyResult(created);
      setKeys((prev) => [
        { id: created.id, name: created.name, prefix: created.prefix, created_at: created.created_at, last_used_at: null },
        ...prev,
      ]);
      setNewKeyName("");
      setShowCreate(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create key");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!newKeyResult) return;
    try {
      await navigator.clipboard.writeText(newKeyResult.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the input text
    }
  };

  const handleDone = () => {
    setNewKeyResult(null);
    setCopied(false);
  };

  const handleRevoke = async (keyId: string) => {
    setConfirmRevokeId(null);
    setRevoking(keyId);
    setRevokeError(null);

    try {
      const response = await fetch(`/api/agent/home/api-keys/${keyId}`, {
        method: "DELETE",
      });

      if (!response.ok && response.status !== 204) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail || payload.error || "Failed to revoke key");
      }

      setKeys((prev) => prev.filter((k) => k.id !== keyId));
    } catch (err) {
      setRevokeError(err instanceof Error ? err.message : "Failed to revoke key");
    } finally {
      setRevoking(null);
    }
  };

  return (
    <>
      {newKeyResult && (
        <Card className="border-[var(--success-200)] bg-[var(--success-50)] dark:border-[var(--success-800)] dark:bg-[var(--success-900)]/25">
          <CardHeader>
            <CardTitle className="text-base text-[var(--success-800)] dark:text-[var(--success-200)]">
              API key created — copy it now
            </CardTitle>
            <CardDescription>
              This key will not be shown again. Store it securely.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={newKeyResult.key}
                readOnly
                className="font-mono text-sm bg-background"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                aria-label="Copy API key"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-[var(--success-600)]" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={handleDone}>
              Done
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                Named keys for external services to access your home data.
              </CardDescription>
            </div>
            {canManageHome && !showCreate && !newKeyResult && (
              <Button size="sm" onClick={() => setShowCreate(true)}>
                Generate New Key
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showCreate && (
            <div className="border border-border rounded-lg p-4 space-y-3 bg-secondary/30">
              <p className="text-sm font-medium">New API key</p>
              <Input
                placeholder="Key name (e.g. MCP Server)"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                autoFocus
              />
              {createError && (
                <p className="text-sm text-[var(--error-700)]">{createError}</p>
              )}
              <div className="flex gap-2">
                <Button size="sm" onClick={handleCreate} disabled={isCreating}>
                  {isCreating ? "Creating..." : "Create"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowCreate(false);
                    setNewKeyName("");
                    setCreateError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {keys.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No API keys yet.{canManageHome ? " Generate one above to get started." : ""}
            </p>
          ) : (
            <div className="space-y-2">
              {revokeError && (
                <p className="text-sm text-[var(--error-700)]">{revokeError}</p>
              )}
              <div className={`grid gap-x-4 gap-y-0 text-xs font-medium text-muted-foreground px-1 pb-1 border-b border-border ${canManageHome ? "grid-cols-[1fr_auto_auto_auto_auto]" : "grid-cols-[1fr_auto_auto_auto]"}`}>
                <span>Name</span>
                <span>Prefix</span>
                <span>Created</span>
                <span>Last used</span>
                {canManageHome && <span />}
              </div>
              {keys.map((key) => (
                <div
                  key={key.id}
                  className={`grid gap-x-4 items-center px-1 py-2 rounded-md hover:bg-secondary/40 text-sm ${canManageHome ? "grid-cols-[1fr_auto_auto_auto_auto]" : "grid-cols-[1fr_auto_auto_auto]"}`}
                >
                  <span className="font-medium truncate">{key.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">{key.prefix}</span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(key.created_at).toLocaleDateString()}
                  </span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {key.last_used_at
                      ? new Date(key.last_used_at).toLocaleDateString()
                      : "Never"}
                  </span>
                  {canManageHome && (
                    confirmRevokeId === key.id ? (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs text-[var(--error-600)] border-[var(--error-300)] hover:bg-[var(--error-50)] dark:border-[var(--error-800)] dark:hover:bg-[var(--error-900)]/25"
                          onClick={() => handleRevoke(key.id)}
                          disabled={revoking === key.id}
                        >
                          Revoke
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => setConfirmRevokeId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-[var(--error-600)]"
                        onClick={() => setConfirmRevokeId(key.id)}
                        disabled={revoking === key.id}
                        aria-label={`Revoke key ${key.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
