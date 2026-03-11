import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ApiKeysClient } from "./api-keys-client";
import { SettingsSkeleton } from "../components/settings-skeleton";
import { SettingsError } from "../components/settings-error";

interface ProfilePayload {
  memberships: Array<{ role: string }>;
}

interface ApiKeyListItem {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
  last_used_at: string | null;
}

async function fetchProfile(): Promise<ProfilePayload | null> {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/auth/me`,
      {
        headers: { Cookie: cookieHeader },
        cache: "no-store",
      }
    );

    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

async function fetchApiKeys(): Promise<ApiKeyListItem[]> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/agent/home/api-keys`,
    {
      headers: { Cookie: cookieHeader },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      redirect("/login?next=/settings/api-keys");
    }
    throw new Error("Failed to load API keys");
  }

  return response.json();
}

function canManageHome(profile: ProfilePayload | null): boolean {
  if (!profile) return false;
  return profile.memberships.some((m) => m.role === "owner" || m.role === "parent");
}

async function ApiKeysContent() {
  try {
    const [profile, initialKeys] = await Promise.all([fetchProfile(), fetchApiKeys()]);
    const isAdmin = canManageHome(profile);

    return <ApiKeysClient initialKeys={initialKeys} canManageHome={isAdmin} />;
  } catch (error) {
    return (
      <SettingsError
        error={error instanceof Error ? error : new Error("Unknown error")}
        title="Failed to load API keys"
      />
    );
  }
}

export default function ApiKeysPage() {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <ApiKeysContent />
    </Suspense>
  );
}
