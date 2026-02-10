"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, ChevronDown, Settings, User as UserIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

type AuthMeResponse = {
  user: {
    id: string;
    name: string | null;
    email: string;
    status: string;
    last_login_at: string | null;
  };
};

export function ProfileMenu() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<AuthMeResponse["user"] | null>(null);

  const displayName = useMemo(() => {
    if (!profile) return "Account";
    return (profile.name || "").trim() || profile.email;
  }, [profile]);

  const initials = useMemo(() => {
    const source = displayName.trim();
    if (!source) return "U";
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  }, [displayName]);

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as AuthMeResponse;
        if (active) {
          setProfile(payload.user);
        }
      } catch {
        // Keep fallback account state when profile fetch fails.
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadProfile();
    return () => {
      active = false;
    };
  }, []);

  const handleLogout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setIsOpen(false);
    router.replace("/login");
    router.refresh();
  }, [router]);

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen((previous) => !previous)}
        className="h-10 px-2 sm:px-3"
      >
        <div className="w-7 h-7 rounded-full bg-[var(--primary-700)] text-white text-xs font-semibold flex items-center justify-center mr-2">
          {loading ? <UserIcon className="w-3.5 h-3.5" /> : initials}
        </div>
        <span className="hidden sm:inline max-w-[180px] truncate text-sm">{displayName}</span>
        <ChevronDown className="w-4 h-4 ml-1 text-muted-foreground" />
      </Button>

      {isOpen && (
        <>
          <button
            type="button"
            aria-label="Close profile menu"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-72 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{profile?.email || "Not signed in"}</p>
              {profile?.status && (
                <p className="text-[11px] text-[var(--neutral-500)] mt-1 capitalize">Status: {profile.status}</p>
              )}
            </div>

            <div className="p-1">
              <Link
                href="/settings?section=profile"
                className="w-full rounded-md px-3 py-2 text-sm flex items-center gap-2 hover:bg-secondary transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <Settings className="w-4 h-4" />
                Profile settings
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full rounded-md px-3 py-2 text-sm flex items-center gap-2 hover:bg-secondary transition-colors text-left"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
