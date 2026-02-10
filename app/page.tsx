import Link from "next/link";
import Image from "next/image";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MessageSquare, Upload, Wallet, Settings } from "lucide-react";
import { ProfileMenu } from "@/components/ui/profile-menu";

export default function HomePage() {
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
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/chat">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[var(--primary-100)] rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-[var(--primary-700)]" />
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
                  <div className="w-10 h-10 bg-[var(--success-100)] rounded-lg flex items-center justify-center">
                    <Upload className="w-5 h-5 text-[var(--success-700)]" />
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
                  <div className="w-10 h-10 bg-[var(--brand-100)] rounded-lg flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-[var(--brand-800)]" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">HSA Dashboard</CardTitle>
                    <CardDescription>View your HSA balance and recent expenses</CardDescription>
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
      </main>
    </div>
  );
}
