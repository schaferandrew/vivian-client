"use client";

import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline" | "destructive";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2",
        {
          "border-transparent bg-zinc-900 text-zinc-50 hover:bg-zinc-800": variant === "default",
          "border-transparent bg-zinc-100 text-zinc-900 hover:bg-zinc-200": variant === "secondary",
          "border-zinc-200 bg-transparent text-zinc-950": variant === "outline",
          "border-transparent bg-red-100 text-red-900 hover:bg-red-200": variant === "destructive",
        },
        className
      )}
      {...props}
    />
  );
}
