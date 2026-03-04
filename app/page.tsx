import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MessageSquare, Settings, Heart, Upload, Wallet } from "lucide-react";
import { ProfileMenu } from "@/components/ui/profile-menu";

interface LinkSetting {
  key: string;
  url: string | null;
  port: number | null;
}

function buildServiceUrl(setting: LinkSetting | undefined): string | null {
  if (!setting || !setting.url) return null;
  const base = setting.url.replace(/\/$/, "");
  return setting.port ? `${base}:${setting.port}` : base;
}

async function getLinkSettings(): Promise<LinkSetting[]> {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.toString();
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/agent/link-settings`,
      { headers: { Cookie: cookieHeader }, cache: "no-store" }
    );
    if (!response.ok) return [];
    return response.json();
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const linkSettings = await getLinkSettings();
  const byKey = Object.fromEntries(linkSettings.map((s) => [s.key, s]));

  const mealieUrl = buildServiceUrl(byKey.mealie);
  const jellyfinUrl = buildServiceUrl(byKey.jellyfin);
  const immichUrl = buildServiceUrl(byKey.immich);

  const hasAnyApp = mealieUrl || jellyfinUrl || immichUrl;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center">
              <Image
                src="/vivian-square.svg"
                alt="Vivian"
                width={48}
                height={48}
                className="shrink-0 rounded-xl"
                priority
              />
              <div className="ml-4">
                <h1 className="text-2xl font-bold text-foreground">Vivian</h1>
                <p className="text-sm text-muted-foreground">Your household assistant</p>
              </div>
            </div>

            <ProfileMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Vivian tools */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/chat">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--primary-100)] dark:bg-[var(--primary-900)]">
                    <MessageSquare className="h-5 w-5 text-[var(--primary-700)] dark:text-[var(--primary-200)]" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Chat</CardTitle>
                    <CardDescription>Talk to Vivian about expenses, receipts, and more</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/receipts">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--success-100)] dark:bg-[var(--success-900)]">
                    <Upload className="h-5 w-5 text-[var(--success-700)] dark:text-[var(--success-200)]" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Receipts</CardTitle>
                    <CardDescription>Upload single receipts or bulk import with duplicate detection</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/hsa">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--brand-100)] dark:bg-[var(--brand-900)]">
                    <Wallet className="h-5 w-5 text-[var(--brand-800)] dark:text-[var(--brand-200)]" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">HSA Dashboard</CardTitle>
                    <CardDescription>View your HSA balance and recent expenses</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/donations">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--brand-100)] dark:bg-[var(--brand-900)]">
                    <Heart className="h-5 w-5 text-[var(--brand-700)] dark:text-[var(--brand-200)]" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Donations</CardTitle>
                    <CardDescription>Track charitable receipts and tax-deductible giving</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/settings">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
                    <Settings className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Settings</CardTitle>
                    <CardDescription>Configure your preferences and connection</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        </div>

        {/* Household services — only rendered when at least one is enabled */}
        {hasAnyApp && (
          <div>
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Household Services
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mealieUrl && (
                <a href={mealieUrl} target="_blank" rel="noopener noreferrer">
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white dark:bg-gray-800 relative p-1.5">
                          <Image
                            src="/logos/mealie.svg"
                            alt="Mealie logo"
                            fill
                            className="object-contain"
                            sizes="40px"
                          />
                        </div>
                        <div>
                          <CardTitle className="text-lg">Mealie</CardTitle>
                          <CardDescription>Recipe management and meal planning</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                </a>
              )}

              {jellyfinUrl && (
                <a href={jellyfinUrl} target="_blank" rel="noopener noreferrer">
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white dark:bg-gray-800 relative p-1.5">
                          <Image
                            src="/logos/jellyfin.svg"
                            alt="Jellyfin logo"
                            fill
                            className="object-contain"
                            sizes="40px"
                          />
                        </div>
                        <div>
                          <CardTitle className="text-lg">Jellyfin</CardTitle>
                          <CardDescription>Stream your media library</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                </a>
              )}

              {immichUrl && (
                <a href={immichUrl} target="_blank" rel="noopener noreferrer">
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white dark:bg-gray-800 relative">
                          <Image
                            src="/logos/immich.svg"
                            alt="Immich logo"
                            fill
                            className="object-contain"
                            sizes="40px"
                          />
                        </div>
                        <div>
                          <CardTitle className="text-lg">Immich</CardTitle>
                          <CardDescription>Browse and manage your photo library</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                </a>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
