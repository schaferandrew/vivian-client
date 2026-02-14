"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

interface Member {
  membership_id: string;
  user_id: string;
  name: string | null;
  email: string;
  status: string;
  role: string;
  is_default_home: boolean;
}

interface HomeSettingsClientProps {
  initialData: {
    home_id: string;
    home_name: string;
    timezone: string;
    members: Member[];
  };
  roleOptions: readonly string[];
}

export function HomeSettingsClient({ initialData, roleOptions }: HomeSettingsClientProps) {
  const [homeName, setHomeName] = useState(initialData.home_name);
  const [members, setMembers] = useState(initialData.members);
  const [memberRoles, setMemberRoles] = useState<Record<string, string>>(() =>
    initialData.members.reduce((acc, member) => ({
      ...acc,
      [member.membership_id]: member.role,
    }), {})
  );
  
  const [isSavingName, setIsSavingName] = useState(false);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSaveHomeName = async () => {
    setIsSavingName(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/auth/home", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ home_name: homeName }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail || "Failed to save home name");
      }

      setSuccess("Home name updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save home name");
    } finally {
      setIsSavingName(false);
    }
  };

  const handleSaveMemberRole = async (membershipId: string) => {
    setUpdatingMemberId(membershipId);
    setError(null);
    setSuccess(null);

    try {
      const newRole = memberRoles[membershipId];
      const response = await fetch(`/api/auth/home/members/${membershipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail || "Failed to update role");
      }

      // Optimistic update
      setMembers((prev) =>
        prev.map((m) =>
          m.membership_id === membershipId ? { ...m, role: newRole } : m
        )
      );
      setSuccess("Member role updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
      // Revert on error
      setMemberRoles((prev) => ({
        ...prev,
        [membershipId]: members.find((m) => m.membership_id === membershipId)?.role || "member",
      }));
    } finally {
      setUpdatingMemberId(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Home Settings</CardTitle>
          <CardDescription>Manage your household name and timezone.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField htmlFor="home-name" label="Home name">
            <Input
              id="home-name"
              value={homeName}
              onChange={(e) => setHomeName(e.target.value)}
              placeholder="Home name"
            />
          </FormField>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={handleSaveHomeName}
              disabled={isSavingName || !homeName.trim()}
            >
              {isSavingName ? "Saving..." : "Save home name"}
            </Button>
            {initialData.timezone && (
              <span className="text-xs text-muted-foreground">
                Timezone: {initialData.timezone}
              </span>
            )}
          </div>
          {error && <p className="text-sm text-[var(--error-700)]">{error}</p>}
          {success && <p className="text-sm text-[var(--success-700)]">{success}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>View household members and adjust roles.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members found.</p>
          ) : (
            members.map((member) => (
              <div
                key={member.membership_id}
                className="rounded-md border border-border p-3 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {member.name?.trim() || member.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {member.email} · {member.status}
                    </p>
                  </div>
                  {member.is_default_home && (
                    <span className="text-xs rounded-full px-2 py-0.5 bg-secondary text-muted-foreground">
                      Default home
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="h-9 rounded-md border border-border bg-background px-2 text-sm"
                    value={memberRoles[member.membership_id] ?? member.role}
                    onChange={(e) =>
                      setMemberRoles((prev) => ({
                        ...prev,
                        [member.membership_id]: e.target.value,
                      }))
                    }
                  >
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSaveMemberRole(member.membership_id)}
                    disabled={
                      updatingMemberId === member.membership_id ||
                      (memberRoles[member.membership_id] ?? member.role) === member.role
                    }
                  >
                    {updatingMemberId === member.membership_id ? "Saving..." : "Save role"}
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </>
  );
}
