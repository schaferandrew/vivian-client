"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, House, Link2, Server, User as UserIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type SettingsSection = "profile" | "home" | "connections" | "mcp";

interface SectionItem {
  id: SettingsSection;
  label: string;
  description: string;
  icon: typeof UserIcon;
  href: string;
}

const SECTION_ITEMS: SectionItem[] = [
  {
    id: "profile",
    label: "Profile",
    description: "Name, email, password",
    icon: UserIcon,
    href: "/settings/profile",
  },
  {
    id: "home",
    label: "Home",
    description: "Members and household details",
    icon: House,
    href: "/settings/home",
  },
  {
    id: "connections",
    label: "Account Connections",
    description: "Google and backend links",
    icon: Link2,
    href: "/settings/connections",
  },
  {
    id: "mcp",
    label: "MCP",
    description: "Tools and server controls",
    icon: Server,
    href: "/settings/mcp",
  },
];

interface SettingsNavProps {
  canManageHome?: boolean;
}

export function SettingsNav({ canManageHome = false }: SettingsNavProps) {
  const pathname = usePathname();

  const visibleItems = SECTION_ITEMS.filter(
    (item) => item.id !== "home" || canManageHome
  );

  return (
    <Card>
      <CardContent className="p-2">
        <div className="space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`w-full text-left rounded-md px-3 py-2.5 transition-colors block ${
                  isActive
                    ? "bg-[var(--primary-100)] text-[var(--primary-800)] dark:bg-[var(--primary-900)] dark:text-[var(--primary-100)]"
                    : "hover:bg-secondary text-foreground"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {item.description}
                </p>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function SettingsHeader() {
  return (
    <header className="bg-card border-b border-border">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold">Settings</h1>
            <p className="text-xs text-muted-foreground">
              Manage your account, connections, and tools.
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
