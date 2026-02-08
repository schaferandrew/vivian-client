import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Server, Globe } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-semibold">Settings</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-muted-foreground" />
              <CardTitle>API Configuration</CardTitle>
            </div>
            <CardDescription>
              Configure the connection to your Vivian backend
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                API URL
              </label>
              <Input
                value={process.env.NEXT_PUBLIC_AGENT_API_URL || "http://localhost:8000/api/v1"}
                disabled
                className="bg-secondary"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Set via NEXT_PUBLIC_AGENT_API_URL environment variable
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                WebSocket URL
              </label>
              <Input
                value={process.env.NEXT_PUBLIC_AGENT_WS_URL || "ws://localhost:8000/api/v1/chat/ws"}
                disabled
                className="bg-secondary"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Set via NEXT_PUBLIC_AGENT_WS_URL environment variable
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-muted-foreground" />
              <CardTitle>About</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Version:</strong> 0.1.0</p>
              <p><strong>Client:</strong> Vivian Household Agent</p>
              <p className="text-xs text-[var(--neutral-400)] mt-4">
                Built with Next.js, TypeScript, and Tailwind CSS
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
