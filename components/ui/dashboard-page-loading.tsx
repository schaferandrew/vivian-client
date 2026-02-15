import { ArrowLeft } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface DashboardPageLoadingProps {
  title: string;
}

export function DashboardPageLoading({ title }: DashboardPageLoadingProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            <h1 className="text-xl font-semibold">{title}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((item) => (
            <Card key={item}>
              <CardHeader className="space-y-3">
                <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                <div className="h-8 w-24 animate-pulse rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="h-5 w-20 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="space-y-3">
            <div className="h-6 w-52 animate-pulse rounded bg-muted" />
            <div className="h-4 w-64 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent className="space-y-2">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-4 w-full animate-pulse rounded bg-muted" />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-3">
            <div className="h-6 w-44 animate-pulse rounded bg-muted" />
            <div className="h-4 w-56 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent className="space-y-2">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-4 w-full animate-pulse rounded bg-muted" />
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
