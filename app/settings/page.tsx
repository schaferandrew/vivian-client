"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  House,
  Link2,
  LogOut,
  Server,
  Settings2,
  User as UserIcon,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FieldErrorText, FormField } from "@/components/ui/form-field";
import { Checkbox } from "@/components/ui/checkbox";
import { useChatStore } from "@/lib/stores/chat";
import {
  getMcpServerSettings,
  runMcpAdditionTest,
  updateEnabledMcpServers,
  updateMcpServerSettings,
} from "@/lib/api/client";
import type {
  MCPServerSettingsSchema,
  GoogleIntegrationStatus,
} from "@/types";

type GoogleStatus = GoogleIntegrationStatus;

type ProfilePayload = {
  user: {
    id: string;
    name: string | null;
    email: string;
    status: string;
    last_login_at: string | null;
  };
  default_home: {
    id: string;
    home_id: string;
    home_name: string;
    role: string;
    is_default_home: boolean;
  } | null;
  memberships: Array<{
    id: string;
    home_id: string;
    home_name: string;
    role: string;
    is_default_home: boolean;
  }>;
};

type HomeSettingsMember = {
  membership_id: string;
  user_id: string;
  name: string | null;
  email: string;
  status: string;
  role: string;
  is_default_home: boolean;
};

type HomeSettingsPayload = {
  home_id: string;
  home_name: string;
  timezone: string;
  members: HomeSettingsMember[];
};

type SettingsSection = "profile" | "home" | "connections" | "mcp";

const profileSchema = z.object({
  name: z.string().max(255, "Name is too long.").optional(),
  email: z.string().trim().email("Enter a valid email address."),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const GOOGLE_STATUS_PROXY_URL = "/api/agent/integrations/google/status";
const GOOGLE_DISCONNECT_PROXY_URL = "/api/agent/integrations/google/disconnect";
const GOOGLE_OAUTH_START_PROXY_URL = "/api/agent/integrations/google/oauth/start";
const HOME_SETTINGS_PROXY_URL = "/api/auth/home";
const HOME_MEMBER_SETTINGS_PROXY_URL = "/api/auth/home/members";
const HOME_MEMBER_ROLE_OPTIONS = ["owner", "parent", "child", "caretaker", "guest", "member"] as const;

const SECTION_ITEMS: Array<{ id: SettingsSection; label: string; description: string; icon: typeof UserIcon }> = [
  {
    id: "profile",
    label: "Profile",
    description: "Name, email, password",
    icon: UserIcon,
  },
  {
    id: "home",
    label: "Home",
    description: "Members and household details",
    icon: House,
  },
  {
    id: "connections",
    label: "Account Connections",
    description: "Google and backend links",
    icon: Link2,
  },
  {
    id: "mcp",
    label: "MCP",
    description: "Tools and server controls",
    icon: Server,
  },
];

function parseSection(rawValue: string | null): SettingsSection {
  if (
    rawValue === "profile" ||
    rawValue === "home" ||
    rawValue === "connections" ||
    rawValue === "mcp"
  ) {
    return rawValue;
  }
  return "profile";
}

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeSection, setActiveSection] = useState<SettingsSection>(
    parseSection(searchParams.get("section"))
  );

  const [googleStatus, setGoogleStatus] = useState<GoogleStatus | null>(null);
  const [loadingGoogleStatus, setLoadingGoogleStatus] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [disconnectingGoogle, setDisconnectingGoogle] = useState(false);

  const [testA, setTestA] = useState("2");
  const [testB, setTestB] = useState("3");
  const [expandedTestServerId, setExpandedTestServerId] = useState<string | null>(null);
  const [testResultByServer, setTestResultByServer] = useState<Record<string, string>>({});
  const [testErrorByServer, setTestErrorByServer] = useState<Record<string, string>>({});
  const [runningTestServerId, setRunningTestServerId] = useState<string | null>(null);
  const [mcpError, setMcpError] = useState<string | null>(null);

  // MCP Settings state - per-server settings with schema support
  const [expandedSettingsServerId, setExpandedSettingsServerId] = useState<string | null>(null);
  const [mcpSettingsLoading, setMcpSettingsLoading] = useState<string | null>(null);
  const [mcpSettingsSaving, setMcpSettingsSaving] = useState<string | null>(null);
  const [mcpSettingsValues, setMcpSettingsValues] = useState<Record<string, Record<string, unknown>>>({});
  const [mcpSettingsSchema, setMcpSettingsSchema] = useState<Record<string, MCPServerSettingsSchema[]>>({});
  const [mcpSettingsEditable, setMcpSettingsEditable] = useState<Record<string, boolean>>({});
  const [mcpSettingsError, setMcpSettingsError] = useState<Record<string, string | null>>({});
  const [mcpSettingsSuccess, setMcpSettingsSuccess] = useState<Record<string, string | null>>({});

  const [profileLoading, setProfileLoading] = useState(true);
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [canManageHome, setCanManageHome] = useState(false);

  const [homeSettings, setHomeSettings] = useState<HomeSettingsPayload | null>(null);
  const [homeName, setHomeName] = useState("");
  const [homeMemberRoles, setHomeMemberRoles] = useState<Record<string, string>>({});
  const [homeLoading, setHomeLoading] = useState(false);
  const [homeSavingName, setHomeSavingName] = useState(false);
  const [homeUpdatingMemberId, setHomeUpdatingMemberId] = useState<string | null>(null);
  const [homeError, setHomeError] = useState<string | null>(null);
  const [homeSuccess, setHomeSuccess] = useState<string | null>(null);

  const { mcpServers, fetchMcpServers, setMcpServerEnabled } = useChatStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setError,
    clearErrors,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      email: "",
      currentPassword: "",
      newPassword: "",
    },
  });

  const settingsBaseUrl = useMemo(() => {
    if (typeof window === "undefined") return "http://localhost:3000/settings";
    return `${window.location.origin}/settings`;
  }, []);

  const connectUrl = useMemo(() => {
    const returnTo = encodeURIComponent(settingsBaseUrl);
    return `${GOOGLE_OAUTH_START_PROXY_URL}?return_to=${returnTo}`;
  }, [settingsBaseUrl]);

  const oauthStatus = searchParams.get("google");
  const oauthMessage = searchParams.get("message");

  useEffect(() => {
    setActiveSection(parseSection(searchParams.get("section")));
  }, [searchParams]);

  useEffect(() => {
    if (!canManageHome && activeSection === "home") {
      setActiveSection("profile");
    }
  }, [activeSection, canManageHome]);

  const visibleSectionItems = useMemo(
    () => SECTION_ITEMS.filter((item) => item.id !== "home" || canManageHome),
    [canManageHome]
  );

  const fetchProfile = useCallback(async () => {
    setProfileLoading(true);
    setProfileLoadError(null);
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      const payload = (await response.json().catch(() => ({}))) as ProfilePayload & {
        detail?: string;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.detail || payload.error || `Profile API failed (${response.status})`);
      }

      reset({
        name: payload.user.name ?? "",
        email: payload.user.email ?? "",
        currentPassword: "",
        newPassword: "",
      });

      const isOwner = payload.memberships.some((membership) => membership.role === "owner");
      setCanManageHome(isOwner);
    } catch (error) {
      setCanManageHome(false);
      setProfileLoadError(error instanceof Error ? error.message : "Could not load profile.");
    } finally {
      setProfileLoading(false);
    }
  }, [reset]);

  const fetchGoogleStatus = useCallback(async () => {
    setLoadingGoogleStatus(true);
    setConnectionError(null);
    try {
      const response = await fetch(GOOGLE_STATUS_PROXY_URL, { cache: "no-store" });
      const payload = (await response.json().catch(() => ({}))) as GoogleStatus & {
        detail?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.detail || payload.error || `Status API failed (${response.status})`);
      }

      setGoogleStatus(payload);
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : "Could not load Google status.");
    } finally {
      setLoadingGoogleStatus(false);
    }
  }, []);

  const fetchHomeSettings = useCallback(async () => {
    if (!canManageHome) {
      setHomeSettings(null);
      setHomeError(null);
      return;
    }

    setHomeLoading(true);
    setHomeError(null);
    try {
      const response = await fetch(HOME_SETTINGS_PROXY_URL, { cache: "no-store" });
      const payload = (await response.json().catch(() => ({}))) as HomeSettingsPayload & {
        detail?: string;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.detail || payload.error || "Could not load home settings.");
      }

      setHomeSettings(payload);
      setHomeName(payload.home_name);
      setHomeMemberRoles(
        payload.members.reduce<Record<string, string>>((accumulator, member) => {
          accumulator[member.membership_id] = member.role;
          return accumulator;
        }, {})
      );
    } catch (error) {
      setHomeError(error instanceof Error ? error.message : "Could not load home settings.");
    } finally {
      setHomeLoading(false);
    }
  }, [canManageHome]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    fetchGoogleStatus();
  }, [fetchGoogleStatus]);

  useEffect(() => {
    fetchMcpServers();
  }, [fetchMcpServers]);

  useEffect(() => {
    fetchHomeSettings();
  }, [fetchHomeSettings]);

  const handleProfileSubmit = useCallback(
    async (values: ProfileFormValues) => {
      setProfileLoadError(null);
      setProfileSuccess(null);
      clearErrors("root.serverError");

      const payload = {
        name: values.name?.trim() || null,
        email: values.email.trim(),
        password: values.newPassword?.trim() || null,
        current_password: values.currentPassword?.trim() || null,
      };

      try {
        const response = await fetch("/api/auth/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = (await response.json().catch(() => ({}))) as ProfilePayload & {
          detail?: string;
          error?: string;
        };

        if (!response.ok) {
          const message = data.detail || data.error || "Profile update failed.";
          setError("root.serverError", { type: "server", message });
          return;
        }

        setProfileSuccess("Profile updated.");
        reset({
          name: data.user.name ?? "",
          email: data.user.email ?? "",
          currentPassword: "",
          newPassword: "",
        });
      } catch (error) {
        setError("root.serverError", {
          type: "server",
          message: error instanceof Error ? error.message : "Profile update failed.",
        });
      }
    },
    [clearErrors, reset, setError]
  );

  const handleSaveHomeName = useCallback(async () => {
    if (!canManageHome) {
      return;
    }

    setHomeError(null);
    setHomeSuccess(null);
    setHomeSavingName(true);
    try {
      const response = await fetch(HOME_SETTINGS_PROXY_URL, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ home_name: homeName.trim() }),
      });
      const payload = (await response.json().catch(() => ({}))) as HomeSettingsPayload & {
        detail?: string;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.detail || payload.error || "Could not update home name.");
      }

      setHomeSettings(payload);
      setHomeName(payload.home_name);
      setHomeSuccess("Home name updated.");
    } catch (error) {
      setHomeError(error instanceof Error ? error.message : "Could not update home name.");
    } finally {
      setHomeSavingName(false);
    }
  }, [canManageHome, homeName]);

  const handleSaveMemberRole = useCallback(async (membershipId: string) => {
    const role = homeMemberRoles[membershipId];
    if (!role) {
      return;
    }

    setHomeError(null);
    setHomeSuccess(null);
    setHomeUpdatingMemberId(membershipId);
    try {
      const response = await fetch(`${HOME_MEMBER_SETTINGS_PROXY_URL}/${membershipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const payload = (await response.json().catch(() => ({}))) as HomeSettingsMember & {
        detail?: string;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.detail || payload.error || "Could not update role.");
      }

      setHomeSettings((previous) => {
        if (!previous) {
          return previous;
        }
        return {
          ...previous,
          members: previous.members.map((member) =>
            member.membership_id === membershipId ? { ...member, role: payload.role } : member
          ),
        };
      });
      setHomeSuccess("Member role updated.");
    } catch (error) {
      setHomeError(error instanceof Error ? error.message : "Could not update role.");
    } finally {
      setHomeUpdatingMemberId(null);
    }
  }, [homeMemberRoles]);

  const handleLogout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }, [router]);

  const handleDisconnectGoogle = useCallback(async () => {
    setDisconnectingGoogle(true);
    setConnectionError(null);
    try {
      const response = await fetch(GOOGLE_DISCONNECT_PROXY_URL, { method: "POST" });
      const payload = (await response.json().catch(() => ({}))) as {
        detail?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.detail || payload.error || "Disconnect failed.");
      }

      await fetchGoogleStatus();
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : "Disconnect failed.");
    } finally {
      setDisconnectingGoogle(false);
    }
  }, [fetchGoogleStatus]);

  const handleToggleMcpServer = useCallback(
    async (serverId: string) => {
      setMcpError(null);
      const nextServers = mcpServers.map((server) =>
        server.id === serverId ? { ...server, enabled: !server.enabled } : server
      );
      const nextEnabled = nextServers.filter((server) => server.enabled).map((server) => server.id);
      const nextEnabledForServer = !!nextServers.find((server) => server.id === serverId)?.enabled;

      setMcpServerEnabled(serverId, nextEnabledForServer);
      try {
        await updateEnabledMcpServers(nextEnabled);
      } catch (error) {
        setMcpError(error instanceof Error ? error.message : "Could not update MCP servers.");
      }
    },
    [mcpServers, setMcpServerEnabled]
  );

  const handleRunAdditionTest = useCallback(async (serverId: string) => {
    setRunningTestServerId(serverId);
    setTestErrorByServer((previous) => ({ ...previous, [serverId]: "" }));
    setTestResultByServer((previous) => ({ ...previous, [serverId]: "" }));
    try {
      const a = Number(testA);
      const b = Number(testB);
      if (Number.isNaN(a) || Number.isNaN(b)) {
        throw new Error("Enter valid numbers for A and B.");
      }

      const result = await runMcpAdditionTest(a, b, serverId);
      setTestResultByServer((previous) => ({
        ...previous,
        [serverId]: `${result.a} + ${result.b} = ${result.sum}`,
      }));
    } catch (error) {
      setTestErrorByServer((previous) => ({
        ...previous,
        [serverId]: error instanceof Error ? error.message : "Addition test failed.",
      }));
    } finally {
      setRunningTestServerId(null);
    }
  }, [testA, testB]);

  // MCP Settings functions
  const handleExpandSettings = useCallback(async (serverId: string) => {
    if (expandedSettingsServerId === serverId) {
      setExpandedSettingsServerId(null);
      return;
    }

    setExpandedSettingsServerId(serverId);
    setMcpSettingsLoading(serverId);
    setMcpSettingsError((previous) => ({ ...previous, [serverId]: null }));

    try {
      const settings = await getMcpServerSettings(serverId);
      setMcpSettingsValues((previous) => ({
        ...previous,
        [serverId]: settings.settings || {},
      }));
      setMcpSettingsSchema((previous) => ({
        ...previous,
        [serverId]: settings.settings_schema || [],
      }));
      setMcpSettingsEditable((previous) => ({
        ...previous,
        [serverId]: settings.editable,
      }));
    } catch (error) {
      setMcpSettingsError((previous) => ({
        ...previous,
        [serverId]: error instanceof Error ? error.message : "Could not load settings.",
      }));
    } finally {
      setMcpSettingsLoading(null);
    }
  }, [expandedSettingsServerId]);

  const handleSaveMcpSettings = useCallback(async (serverId: string) => {
    setMcpSettingsSaving(serverId);
    setMcpSettingsError((previous) => ({ ...previous, [serverId]: null }));
    setMcpSettingsSuccess((previous) => ({ ...previous, [serverId]: null }));

    try {
      const values = mcpSettingsValues[serverId] || {};
      await updateMcpServerSettings(serverId, values);
      setMcpSettingsSuccess((previous) => ({
        ...previous,
        [serverId]: "Settings saved.",
      }));
      // Refresh servers list to get updated state
      await useChatStore.getState().fetchMcpServers();
    } catch (error) {
      setMcpSettingsError((previous) => ({
        ...previous,
        [serverId]: error instanceof Error ? error.message : "Could not save settings.",
      }));
    } finally {
      setMcpSettingsSaving(null);
    }
  }, [mcpSettingsValues]);

  const handleMcpSettingChange = useCallback(
    (serverId: string, key: string, value: unknown) => {
      setMcpSettingsValues((previous) => ({
        ...previous,
        [serverId]: {
          ...(previous[serverId] || {}),
          [key]: value,
        },
      }));
      // Clear success message when user makes changes
      setMcpSettingsSuccess((previous) => ({ ...previous, [serverId]: null }));
    },
    []
  );

  const statusTone = googleStatus?.connected ? "text-[var(--success-600)]" : "text-[var(--error-700)]";
  const statusIcon = googleStatus?.connected ? (
    <CheckCircle2 className="w-4 h-4 text-[var(--success-600)]" />
  ) : (
    <XCircle className="w-4 h-4 text-[var(--error-700)]" />
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-semibold">Settings</h1>
              <p className="text-xs text-muted-foreground">Manage your account, connections, and tools.</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
          <aside>
            <Card>
              <CardContent className="p-2">
                <div className="space-y-1">
                  {visibleSectionItems.map((item) => {
                    const Icon = item.icon;
                    const selected = activeSection === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`w-full text-left rounded-md px-3 py-2.5 transition-colors ${
                          selected
                            ? "bg-[var(--primary-100)] text-[var(--primary-800)]"
                            : "hover:bg-secondary text-foreground"
                        }`}
                        onClick={() => setActiveSection(item.id)}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          <span className="text-sm font-medium">{item.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </aside>

          <section className="space-y-6">
            {activeSection === "profile" && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Profile</CardTitle>
                    <CardDescription>Change your identity and sign-in details.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {profileLoading ? (
                      <p className="text-sm text-muted-foreground">Loading profile...</p>
                    ) : (
                      <form onSubmit={handleSubmit(handleProfileSubmit)} className="space-y-2" noValidate>
                        <FormField htmlFor="profile-name" label="Name" error={errors.name?.message}>
                          <Input
                            id="profile-name"
                            placeholder="Your name"
                            aria-invalid={errors.name ? "true" : "false"}
                            aria-describedby="profile-name-error"
                            {...register("name")}
                          />
                        </FormField>

                        <FormField htmlFor="profile-email" label="Email" error={errors.email?.message}>
                          <Input
                            id="profile-email"
                            type="email"
                            autoComplete="email"
                            aria-invalid={errors.email ? "true" : "false"}
                            aria-describedby="profile-email-error"
                            {...register("email")}
                            required
                          />
                        </FormField>

                        <FormField
                          htmlFor="profile-current-password"
                          label="Current password"
                          error={errors.currentPassword?.message}
                        >
                          <Input
                            id="profile-current-password"
                            type="password"
                            autoComplete="current-password"
                            aria-invalid={errors.currentPassword ? "true" : "false"}
                            aria-describedby="profile-current-password-error"
                            {...register("currentPassword")}
                          />
                        </FormField>

                        <FormField
                          htmlFor="profile-new-password"
                          label="New password"
                          error={errors.newPassword?.message}
                        >
                          <Input
                            id="profile-new-password"
                            type="password"
                            autoComplete="new-password"
                            aria-invalid={errors.newPassword ? "true" : "false"}
                            aria-describedby="profile-new-password-error"
                            {...register("newPassword")}
                          />
                        </FormField>

                        {profileLoadError && (
                          <p className="text-sm text-[var(--error-700)]">{profileLoadError}</p>
                        )}
                        {profileSuccess && (
                          <p className="text-sm text-[var(--success-700)]">{profileSuccess}</p>
                        )}
                        <FieldErrorText
                          id="profile-server-error"
                          message={errors.root?.serverError?.message}
                        />

                        <div className="pt-2 flex items-center gap-2">
                          <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Saving..." : "Save changes"}
                          </Button>
                          <Button type="button" variant="outline" onClick={handleLogout}>
                            <LogOut className="w-4 h-4 mr-1" />
                            Logout
                          </Button>
                        </div>
                      </form>
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            {activeSection === "home" && canManageHome && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Home Settings</CardTitle>
                    <CardDescription>Manage your household name and members.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {homeLoading ? (
                      <p className="text-sm text-muted-foreground">Loading home settings...</p>
                    ) : (
                      <>
                        <FormField htmlFor="home-name" label="Home name">
                          <Input
                            id="home-name"
                            value={homeName}
                            onChange={(event) => setHomeName(event.target.value)}
                            placeholder="Home name"
                          />
                        </FormField>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            onClick={handleSaveHomeName}
                            disabled={homeSavingName || !homeName.trim()}
                          >
                            {homeSavingName ? "Saving..." : "Save home name"}
                          </Button>
                          {homeSettings?.timezone && (
                            <span className="text-xs text-muted-foreground">
                              Timezone: {homeSettings.timezone}
                            </span>
                          )}
                        </div>
                        {homeError && (
                          <p className="text-sm text-[var(--error-700)]">{homeError}</p>
                        )}
                        {homeSuccess && (
                          <p className="text-sm text-[var(--success-700)]">{homeSuccess}</p>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Members</CardTitle>
                    <CardDescription>View household members and adjust roles.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {homeLoading && (
                      <p className="text-sm text-muted-foreground">Loading members...</p>
                    )}
                    {!homeLoading && homeSettings?.members.length === 0 && (
                      <p className="text-sm text-muted-foreground">No members found.</p>
                    )}
                    {!homeLoading &&
                      homeSettings?.members.map((member) => (
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
                              value={homeMemberRoles[member.membership_id] ?? member.role}
                              onChange={(event) =>
                                setHomeMemberRoles((previous) => ({
                                  ...previous,
                                  [member.membership_id]: event.target.value,
                                }))
                              }
                            >
                              {HOME_MEMBER_ROLE_OPTIONS.map((role) => (
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
                                homeUpdatingMemberId === member.membership_id ||
                                (homeMemberRoles[member.membership_id] ?? member.role) === member.role
                              }
                            >
                              {homeUpdatingMemberId === member.membership_id ? "Saving..." : "Save role"}
                            </Button>
                          </div>
                        </div>
                      ))}
                  </CardContent>
                </Card>
              </>
            )}

            {activeSection === "connections" && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Account Connections</CardTitle>
                    <CardDescription>
                      Connect external services used by your household workflows.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(oauthStatus === "connected" || oauthStatus === "error") && (
                      <div
                        className={`rounded-md border p-3 text-sm ${
                          oauthStatus === "connected"
                            ? "border-[var(--success-300)] bg-[var(--success-50)] text-[var(--success-700)]"
                            : "border-[var(--error-300)] bg-[var(--error-50)] text-[var(--error-700)]"
                        }`}
                      >
                        {oauthStatus === "connected"
                          ? "Google account connected."
                          : `Google connection failed${oauthMessage ? `: ${oauthMessage}` : "."}`}
                      </div>
                    )}

                    <div className="rounded-md border border-border p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          {statusIcon}
                          <span className="font-medium">Google Drive + Sheets</span>
                        </div>
                        {loadingGoogleStatus ? (
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
                          {googleStatus.provider_email && (
                            <p>Connected as: {googleStatus.provider_email}</p>
                          )}
                          {googleStatus.connected_by && (
                            <p>Set up by: {googleStatus.connected_by}</p>
                          )}
                          {googleStatus.connected_at && (
                            <p>
                              Connected: {new Date(googleStatus.connected_at).toLocaleDateString()}
                            </p>
                          )}
                          {googleStatus.scopes && googleStatus.scopes.length > 0 && (
                            <p className="text-xs">
                              Scopes: {googleStatus.scopes.join(", ")}
                            </p>
                          )}
                        </div>
                      )}

                      {connectionError && (
                        <p className="text-sm text-[var(--error-700)]">{connectionError}</p>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <a href={connectUrl}>
                          <Button variant={googleStatus?.connected ? "outline" : "default"}>
                            {googleStatus?.connected ? "Reconnect Google" : "Connect Google"}
                          </Button>
                        </a>
                        <Button
                          variant="ghost"
                          onClick={fetchGoogleStatus}
                          disabled={loadingGoogleStatus}
                        >
                          Refresh status
                        </Button>
                        {googleStatus?.connected && (
                          <Button
                            variant="destructive"
                            onClick={handleDisconnectGoogle}
                            disabled={disconnectingGoogle}
                          >
                            {disconnectingGoogle ? "Disconnecting..." : "Disconnect"}
                          </Button>
                        )}
                      </div>
                    </div>
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
                      <Input
                        value={process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:8000/api/v1"}
                        disabled
                        className="bg-secondary"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground block mb-2">
                        WebSocket URL
                      </label>
                      <Input
                        value={
                          process.env.NEXT_PUBLIC_AGENT_WS_URL || "ws://localhost:8000/api/v1/chat/ws"
                        }
                        disabled
                        className="bg-secondary"
                      />
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {activeSection === "mcp" && (
              <Card>
                  <CardHeader>
                    <CardTitle>MCP Servers</CardTitle>
                    <CardDescription>
                      Enable or disable tools available to chat and workflow steps.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      {mcpServers.length === 0 && (
                        <p className="text-sm text-muted-foreground">No MCP servers discovered yet.</p>
                      )}
                      {mcpServers.map((server) => {
                        const canRunAdditionTest = server.tools.includes("add_numbers");
                        const isExpandedTest = expandedTestServerId === server.id;
                        const testResult = testResultByServer[server.id];
                        const testError = testErrorByServer[server.id];
                        const isRunningThisTest = runningTestServerId === server.id;
                        const isExpandedSettings = expandedSettingsServerId === server.id;
                        const serverSettingsSchema = server.settings_schema || [];
                        const settingsSchema = mcpSettingsSchema[server.id] || serverSettingsSchema;
                        const settingsValues = mcpSettingsValues[server.id] || {};
                        const settingsEditable = mcpSettingsEditable[server.id] ?? server.editable;
                        const settingsLoading = mcpSettingsLoading === server.id;
                        const settingsSaving = mcpSettingsSaving === server.id;
                        const settingsError = mcpSettingsError[server.id];
                        const settingsSuccess = mcpSettingsSuccess[server.id];
                        const hasSettings = serverSettingsSchema.length > 0;

                        return (
                          <div key={server.id} className="rounded-md border border-border p-3">
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm">{server.name}</p>
                                  {server.requires_connection === "google" && googleStatus?.connected ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                      Google connected
                                    </span>
                                  ) : server.requires_connection ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                      Requires: {server.requires_connection}
                                    </span>
                                  ) : null}
                                </div>
                                <p className="text-xs text-muted-foreground">{server.description}</p>
                                <p className="text-[11px] text-[var(--neutral-500)] mt-1">
                                  {server.source === "builtin" ? "Built-in" : "Custom"} · Tools: {server.tools.join(", ")}
                                </p>
                              </div>

                              <div className="flex items-center gap-2">
                                {hasSettings && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleExpandSettings(server.id)}
                                  >
                                    {isExpandedSettings ? (
                                      <Settings2 className="w-4 h-4 mr-1" />
                                    ) : (
                                      <Settings2 className="w-4 h-4 mr-1" />
                                    )}
                                    Settings
                                  </Button>
                                )}

                                {canRunAdditionTest && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      setExpandedTestServerId((current) =>
                                        current === server.id ? null : server.id
                                      )
                                    }
                                  >
                                    {isExpandedTest ? (
                                      <ChevronDown className="w-4 h-4 mr-1" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4 mr-1" />
                                    )}
                                    Test
                                  </Button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleToggleMcpServer(server.id)}
                                  className={`text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors ${
                                    server.enabled
                                      ? "bg-[var(--success-100)] text-[var(--success-700)]"
                                      : "bg-secondary text-muted-foreground"
                                  }`}
                                  aria-label={`Toggle ${server.name}`}
                                >
                                  {server.enabled ? "ON" : "OFF"}
                                </button>
                              </div>
                            </div>

                            {/* MCP Settings Form */}
                            {isExpandedSettings && hasSettings && (
                              <div className="mt-3 pt-3 border-t border-border space-y-4">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs font-medium text-muted-foreground">
                                    Server Configuration
                                  </p>
                                  {!settingsEditable && (
                                    <span className="text-xs text-muted-foreground">
                                      Read-only (owner only)
                                    </span>
                                  )}
                                </div>

                                {settingsLoading && (
                                  <p className="text-sm text-muted-foreground">Loading settings...</p>
                                )}

                                {!settingsLoading && (
                                  <div className="space-y-3">
                                    {settingsSchema.map((field) => {
                                      const value = settingsValues[field.key];
                                      return (
                                        <div key={field.key} className="grid gap-1.5">
                                          <label className="text-sm font-medium text-foreground">
                                            {field.label}
                                            {field.required && <span className="text-[var(--error-600)] ml-1">*</span>}
                                          </label>
                                          {field.type === "string" && (
                                            <Input
                                              value={(value as string) || ""}
                                              onChange={(e) =>
                                                handleMcpSettingChange(server.id, field.key, e.target.value)
                                              }
                                              placeholder={field.default?.toString()}
                                              disabled={!settingsEditable}
                                            />
                                          )}
                                          {field.type === "number" && (
                                            <Input
                                              type="number"
                                              value={(value as number) || ""}
                                              onChange={(e) =>
                                                handleMcpSettingChange(
                                                  server.id,
                                                  field.key,
                                                  e.target.value ? Number(e.target.value) : undefined
                                                )
                                              }
                                              placeholder={field.default?.toString()}
                                              disabled={!settingsEditable}
                                            />
                                          )}
                                          {field.type === "boolean" && (
                                            <div className="flex items-center gap-2">
                                              <Checkbox
                                                checked={(value as boolean) || false}
                                                onCheckedChange={(checked) =>
                                                  handleMcpSettingChange(server.id, field.key, checked === true)
                                                }
                                                disabled={!settingsEditable}
                                                id={`${server.id}-${field.key}`}
                                              />
                                              <label
                                                htmlFor={`${server.id}-${field.key}`}
                                                className="text-sm text-muted-foreground"
                                              >
                                                {field.default === true ? "Enabled" : "Disabled"}
                                              </label>
                                            </div>
                                          )}
                                          {(field.type === "folder_id" || field.type === "spreadsheet_id" || field.type === "text") && (
                                            <Input
                                              value={(value as string) || ""}
                                              onChange={(e) =>
                                                handleMcpSettingChange(server.id, field.key, e.target.value)
                                              }
                                              placeholder={field.default?.toString()}
                                              disabled={!settingsEditable}
                                            />
                                          )}
                                        </div>
                                      );
                                    })}

                                      {settingsEditable && (
                                        <div className="flex items-center gap-2 pt-2">
                                          <Button
                                            size="sm"
                                            onClick={() => handleSaveMcpSettings(server.id)}
                                            disabled={settingsSaving}
                                          >
                                            {settingsSaving ? "Saving..." : "Save Settings"}
                                          </Button>
                                          {settingsSuccess && (
                                            <span className="text-sm text-[var(--success-600)]">
                                              {settingsSuccess}
                                            </span>
                                          )}
                                        </div>
                                      )}

                                      {settingsError && (
                                        <p className="text-sm text-[var(--error-700)]">{settingsError}</p>
                                      )}
                                    </div>
                                  )}
                                </div>
                               )}

                            {/* Addition Test */}
                            {isExpandedTest && canRunAdditionTest && (
                              <div className="mt-3 pt-3 border-t border-border space-y-3">
                                <p className="text-xs text-muted-foreground">
                                  Run protocol test for `{server.id}`.
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                  <Input
                                    value={testA}
                                    onChange={(event) => setTestA(event.target.value)}
                                    placeholder="A"
                                  />
                                  <Input
                                    value={testB}
                                    onChange={(event) => setTestB(event.target.value)}
                                    placeholder="B"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    onClick={() => handleRunAdditionTest(server.id)}
                                    disabled={isRunningThisTest}
                                  >
                                    {isRunningThisTest ? "Running..." : "Run test"}
                                  </Button>
                                  {testResult && (
                                    <span className="text-sm text-[var(--success-600)]">{testResult}</span>
                                  )}
                                </div>
                                {testError && (
                                  <p className="text-sm text-[var(--error-700)]">{testError}</p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {mcpError && <p className="text-sm text-[var(--error-700)]">{mcpError}</p>}
                  </CardContent>
                </Card>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
