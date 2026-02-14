import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ProfileForm } from "./profile-form";
import { SettingsSkeleton } from "../components/settings-skeleton";
import { SettingsError } from "../components/settings-error";

interface ProfilePayload {
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
}

async function fetchProfile(): Promise<ProfilePayload> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/auth/me`,
    {
      headers: {
        Cookie: cookieHeader,
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      redirect("/login?next=/settings/profile");
    }
    throw new Error("Failed to load profile");
  }

  return response.json();
}

async function ProfileContent() {
  try {
    const profile = await fetchProfile();
    return (
      <ProfileForm
        initialData={{
          name: profile.user.name || "",
          email: profile.user.email,
        }}
      />
    );
  } catch (error) {
    return (
      <SettingsError
        error={error instanceof Error ? error : new Error("Unknown error")}
        title="Failed to load profile"
      />
    );
  }
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <ProfileContent />
    </Suspense>
  );
}
