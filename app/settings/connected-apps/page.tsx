import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ConnectedAppsClient, ConnectedAppsSettings } from "./connected-apps-client";
import { SettingsSkeleton } from "../components/settings-skeleton";
import { SettingsError } from "../components/settings-error";

interface ProfilePayload {
  memberships: Array<{ role: string }>;
}

async function fetchProfile(): Promise<ProfilePayload | null> {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/auth/me`,
      { headers: { Cookie: cookieHeader }, cache: "no-store" }
    );
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

function canManageHome(profile: ProfilePayload | null): boolean {
  if (!profile) return false;
  return profile.memberships.some((m) => m.role === "owner" || m.role === "parent");
}

async function fetchConnectedAppsSettings(): Promise<ConnectedAppsSettings> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/agent/services/settings`,
    { headers: { Cookie: cookieHeader }, cache: "no-store" }
  );

  if (response.status === 404) return {};
  if (!response.ok) throw new Error("Failed to load connected apps settings");

  return response.json();
}

async function ConnectedAppsContent() {
  const profile = await fetchProfile();

  if (!canManageHome(profile)) {
    redirect("/settings/profile");
  }

  try {
    const settings = await fetchConnectedAppsSettings();
    return <ConnectedAppsClient initialSettings={settings} />;
  } catch (error) {
    return (
      <SettingsError
        error={error instanceof Error ? error : new Error("Unknown error")}
        title="Failed to load connected apps settings"
      />
    );
  }
}

export default function ConnectedAppsPage() {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <ConnectedAppsContent />
    </Suspense>
  );
}
