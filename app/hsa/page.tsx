import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, ArrowLeft, TrendingUp, FileText } from "lucide-react";
import Link from "next/link";
import { getUnreimbursedBalance } from "@/lib/api/client";

export default async function HSAPage() {
  let balance = { total_amount: 0, count: 0 };
  
  try {
    balance = await getUnreimbursedBalance();
  } catch (error) {
    console.error("Failed to fetch balance:", error);
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-zinc-600 hover:text-zinc-900">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <Wallet className="w-6 h-6 text-zinc-700" />
            <h1 className="text-xl font-semibold">HSA Dashboard</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader>
              <CardDescription>Unreimbursed Balance</CardDescription>
              <CardTitle className="text-3xl">
                ${balance.total_amount.toFixed(2)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary">{balance.count} expenses</Badge>
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
              <FileText className="w-5 h-5 text-zinc-500" />
              <CardTitle>Recent Expenses</CardTitle>
            </div>
            <CardDescription>
              View and manage your recent HSA expenses via chat
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-zinc-500">
              <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Recent expenses view coming soon</p>
              <p className="text-sm mt-2">For now, ask Vivian in chat to show recent expenses</p>
              <Link href="/chat">
                <button className="mt-4 text-blue-600 hover:underline">
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
