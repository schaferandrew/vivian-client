import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wallet, ArrowLeft, TrendingUp, FileText, Settings, ExternalLink } from "lucide-react";
import Link from "next/link";
import { getUnreimbursedBalanceServer } from "@/lib/api/server";
import type { UnreimbursedBalanceResponse } from "@/types";

// Force dynamic rendering since we use cookies() in getUnreimbursedBalanceServer
export const dynamic = "force-dynamic";

export default async function HSAPage() {
  let balance: UnreimbursedBalanceResponse | null = null;

  try {
    balance = await getUnreimbursedBalanceServer();
  } catch (error) {
    console.error("Failed to fetch balance:", error);
  }

  const isConfigured = balance !== null;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <Wallet className="w-6 h-6 text-foreground" />
            <h1 className="text-xl font-semibold">HSA Dashboard</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {!isConfigured && (
          <Card className="mb-6 border-[var(--warning-200)] bg-[var(--warning-50)] dark:border-[var(--warning-800)] dark:bg-[var(--warning-900)]">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-2">
                  <h3 className="flex items-center gap-2 font-semibold text-[var(--warning-900)] dark:text-[var(--warning-100)]">
                    <Settings className="w-4 h-4" />
                    HSA Ledger Not Configured
                  </h3>
                  <p className="max-w-xl text-sm text-[var(--warning-800)] dark:text-[var(--warning-200)]">
                    Connect your Google account and configure your HSA spreadsheet to unlock expense tracking,
                    receipt management, and balance monitoring.
                  </p>
                </div>
                <Link href="/settings?section=mcp">
                  <Button
                    variant="outline"
                    className="whitespace-nowrap border-[var(--warning-300)] hover:bg-[var(--warning-100)] dark:border-[var(--warning-800)] dark:hover:bg-[var(--warning-900)]"
                  >
                    Configure in Settings
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader>
              <CardDescription>Unreimbursed Balance</CardDescription>
              <CardTitle className="text-3xl">
                {balance ? `$${balance.total_amount.toFixed(2)}` : "-"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary">
                {balance ? `${balance.count} expense${balance.count !== 1 ? 's' : ''}` : "- expenses"}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Total Tracked</CardDescription>
              <CardTitle className="text-3xl">$0.00</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="outline">Coming soon</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Eligible Expenses</CardDescription>
              <CardTitle className="text-3xl">$0.00</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="outline">Coming soon</Badge>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <CardTitle>Recent Expenses</CardTitle>
            </div>
            <CardDescription>
              View and manage your recent HSA expenses via chat
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Recent expenses view coming soon</p>
              <p className="text-sm mt-2">For now, ask Vivian in chat to show recent expenses</p>
              <Link href="/chat">
                <button className="mt-4 text-primary hover:underline">
                  Go to Chat
                </button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
