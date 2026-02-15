"use client";

import { cn } from "@/lib/utils";

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted",
        className
      )}
      {...props}
    />
  );
}

export function SkeletonText({
  className,
  lines = 1,
  ...props
}: SkeletonProps & { lines?: number }) {
  return (
    <div className="flex flex-col gap-2" {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-4 w-full", className)}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-6 shadow-sm",
        className
      )}
      {...props}
    >
      <Skeleton className="mb-4 h-6 w-1/3" />
      <SkeletonText lines={3} className="w-full" />
    </div>
  );
}

export function SkeletonAvatar({
  className,
  size = "md",
  ...props
}: SkeletonProps & { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  return (
    <Skeleton
      className={cn("rounded-full", sizeClasses[size], className)}
      {...props}
    />
  );
}

export function SkeletonButton({ className, ...props }: SkeletonProps) {
  return (
    <Skeleton
      className={cn("h-10 w-24 rounded-md", className)}
      {...props}
    />
  );
}

export function SkeletonList({
  className,
  items = 3,
  ...props
}: SkeletonProps & { items?: number }) {
  return (
    <div className={cn("flex flex-col gap-3", className)} {...props}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <SkeletonAvatar size="sm" />
          <SkeletonText className="flex-1" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonChatMessage({
  className,
  isUser = false,
  ...props
}: SkeletonProps & { isUser?: boolean }) {
  return (
    <div
      className={cn(
        "flex gap-3",
        isUser ? "flex-row-reverse" : "flex-row",
        className
      )}
      {...props}
    >
      <SkeletonAvatar size="md" />
      <div className={cn("flex flex-col gap-2", isUser ? "items-end" : "items-start")}>
        <Skeleton className="h-4 w-20" />
        <div
          className={cn(
            "rounded-lg px-4 py-2",
            isUser ? "bg-primary" : "bg-muted"
          )}
        >
          <SkeletonText lines={2} className={cn("w-48", isUser ? "bg-primary-foreground/20" : "")} />
        </div>
      </div>
    </div>
  );
}

export function SkeletonTable({
  className,
  rows = 3,
  columns = 4,
  ...props
}: SkeletonProps & { rows?: number; columns?: number }) {
  return (
    <div className={cn("w-full", className)} {...props}>
      <div className="flex gap-4 border-b border-border pb-3 mb-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-5 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 py-3">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
