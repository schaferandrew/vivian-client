"use client";

import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg";
}

export function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        {
          "bg-zinc-900 text-zinc-50 hover:bg-zinc-800": variant === "default",
          "border border-zinc-200 bg-transparent hover:bg-zinc-100": variant === "outline",
          "hover:bg-zinc-100": variant === "ghost",
          "bg-red-600 text-white hover:bg-red-700": variant === "destructive",
          "h-10 px-4 py-2": size === "default",
          "h-8 px-3 text-sm": size === "sm",
          "h-12 px-6": size === "lg",
        },
        className
      )}
      {...props}
    />
  );
}
