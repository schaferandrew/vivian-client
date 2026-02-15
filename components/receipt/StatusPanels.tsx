"use client";

import { AlertCircle } from "lucide-react";

interface ErrorPanelProps {
  children: React.ReactNode;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
}

export function ErrorPanel({ children, showIcon = false, size = "md" }: ErrorPanelProps) {
  const sizeClasses = {
    sm: "rounded-md p-2 text-xs",
    md: "rounded-lg p-3 text-sm",
    lg: "rounded-xl p-4 text-base",
  };

  return (
    <div
      className={`${sizeClasses[size]} border border-[var(--error-200)] bg-[var(--error-50)] text-[var(--error-700)] dark:border-[var(--error-800)] dark:bg-[var(--error-900)]/25 dark:text-[var(--error-300)] ${showIcon ? "flex items-center gap-2" : ""}`}
    >
      {showIcon && <AlertCircle className="h-4 w-4 flex-shrink-0" />}
      {children}
    </div>
  );
}

interface WarningPanelProps {
  children: React.ReactNode;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
}

export function WarningPanel({ children, showIcon = false, size = "md" }: WarningPanelProps) {
  const sizeClasses = {
    sm: "rounded-md p-2 text-xs",
    md: "rounded-lg p-3 text-sm",
    lg: "rounded-xl p-4 text-base",
  };

  return (
    <div
      className={`${sizeClasses[size]} border border-[var(--warning-200)] bg-[var(--warning-50)] text-[var(--warning-700)] dark:border-[var(--warning-800)] dark:bg-[var(--warning-900)]/25 dark:text-[var(--warning-300)] ${showIcon ? "flex items-center gap-2" : ""}`}
    >
      {showIcon && <AlertCircle className="h-4 w-4 flex-shrink-0" />}
      {children}
    </div>
  );
}
