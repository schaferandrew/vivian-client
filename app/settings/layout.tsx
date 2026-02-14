import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SettingsNav, SettingsHeader } from "./components/settings-nav";
import { NavSkeleton } from "./components/settings-skeleton";

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

async function fetchProfile(): Promise<ProfilePayload | null> {
  try {
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
      return null;
    }

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

async function SettingsNavWrapper() {
  const profile = await fetchProfile();
  const showHomeSection = canManageHome(profile);

  return <SettingsNav canManageHome={showHomeSection} />;
}

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <SettingsHeader />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
          <aside>
            <Suspense fallback={<NavSkeleton />}>
              <SettingsNavWrapper />
            </Suspense>
          </aside>

          <section className="space-y-6">{children}</section>
        </div>
      </main>
    </div>
  );
}
