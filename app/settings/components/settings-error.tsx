import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";

interface SettingsErrorProps {
  error: Error | string;
  onRetry?: () => void;
  title?: string;
}

export function SettingsError({
  error,
  onRetry,
  title = "Failed to load settings",
}: SettingsErrorProps) {
  const errorMessage = typeof error === "string" ? error : error.message;

  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 text-[var(--error-600)]">
            <AlertCircle className="w-5 h-5" />
            <CardTitle>{title}</CardTitle>
          </div>
          <CardDescription>
            We encountered an error while loading your settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-[var(--error-50)] border border-[var(--error-200)] rounded-md p-3">
            <p className="text-sm text-[var(--error-700)]">{errorMessage}</p>
          </div>
          <div className="flex gap-2">
            {onRetry && (
              <Button onClick={onRetry} variant="outline" className="flex-1">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            )}
            <Link href="/settings/profile" className="flex-1">
              <Button variant="default" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Profile
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
