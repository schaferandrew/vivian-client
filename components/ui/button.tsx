"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg";
  loading?: boolean;
  loadingText?: string;
  spinnerClassName?: string;
}

export function Button({
  className,
  variant = "default",
  size = "default",
  children,
  disabled = false,
  loading = false,
  loadingText = "Loading...",
  spinnerClassName,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const spinnerSizeClass = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
        {
          "bg-primary text-primary-foreground hover:bg-[var(--primary-700)]": variant === "default",
          "border border-border bg-background hover:bg-secondary": variant === "outline",
          "hover:bg-secondary": variant === "ghost",
          "bg-destructive text-destructive-foreground hover:bg-[var(--error-700)]": variant === "destructive",
          "h-10 px-4 py-2": size === "default",
          "h-8 px-3 text-sm": size === "sm",
          "h-12 px-6": size === "lg",
        },
        className
      )}
      disabled={isDisabled}
      aria-busy={loading || undefined}
    >
      {loading ? (
        <>
          <Loader2 className={cn("mr-2 animate-spin", spinnerSizeClass, spinnerClassName)} />
          <span>{loadingText}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
