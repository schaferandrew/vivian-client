import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="h-6 w-32 bg-muted rounded animate-pulse" />
          <div className="h-4 w-64 bg-muted rounded animate-pulse mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="h-4 w-20 bg-muted rounded animate-pulse" />
            <div className="h-10 w-full bg-muted rounded animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-20 bg-muted rounded animate-pulse" />
            <div className="h-10 w-full bg-muted rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function NavSkeleton() {
  return (
    <Card>
      <CardContent className="p-2">
        <div className="space-y-1">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-14 w-full bg-muted rounded animate-pulse"
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
