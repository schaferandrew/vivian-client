"use client";

import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline" | "destructive";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
        {
          "border-transparent bg-primary text-primary-foreground hover:bg-[var(--primary-700)]": variant === "default",
          "border-transparent bg-secondary text-secondary-foreground hover:bg-[var(--neutral-200)] dark:hover:bg-[var(--neutral-800)]": variant === "secondary",
          "border-border bg-transparent text-foreground": variant === "outline",
          "border-transparent bg-[var(--error-100)] text-[var(--error-800)] hover:bg-[var(--error-200)] dark:bg-[var(--error-900)] dark:text-[var(--error-100)] dark:hover:bg-[var(--error-800)]": variant === "destructive",
        },
        className
      )}
      {...props}
    />
  );
}
