import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { HomeSettingsClient } from "./home-settings-client";
import { SettingsSkeleton } from "../components/settings-skeleton";
import { SettingsError } from "../components/settings-error";

interface ProfilePayload {
  memberships: Array<{
    role: string;
  }>;
}

interface HomeSettingsPayload {
  home_id: string;
  home_name: string;
  timezone: string;
  members: Array<{
    membership_id: string;
    user_id: string;
    name: string | null;
    email: string;
    status: string;
    role: string;
    is_default_home: boolean;
  }>;
}

const HOME_MEMBER_ROLE_OPTIONS = ["owner", "parent", "child", "caretaker", "guest", "member"] as const;

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

function canManageHome(profile: ProfilePayload | null): boolean {
  if (!profile) return false;
  return profile.memberships.some(
    (m) => m.role === "owner" || m.role === "parent"
  );
}

async function fetchHomeSettings(): Promise<HomeSettingsPayload> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/auth/home`,
    {
      headers: { Cookie: cookieHeader },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error("Failed to load home settings");
  }

  return response.json();
}

async function HomeContent() {
  try {
    const profile = await fetchProfile();
    
    if (!canManageHome(profile)) {
      redirect("/settings/profile");
    }

    const homeSettings = await fetchHomeSettings();
    
    return (
      <HomeSettingsClient
        initialData={homeSettings}
        roleOptions={[...HOME_MEMBER_ROLE_OPTIONS]}
      />
    );
  } catch (error) {
    return (
      <SettingsError
        error={error instanceof Error ? error : new Error("Unknown error")}
        title="Failed to load home settings"
      />
    );
  }
}

export default function HomePage() {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <HomeContent />
    </Suspense>
  );
}
