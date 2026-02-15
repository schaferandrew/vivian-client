"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface RefreshButtonProps {
  onRefresh: () => Promise<void> | void;
  className?: string;
  title?: string;
  disabled?: boolean;
}

export function RefreshButton({
  onRefresh,
  className,
  title = "Refresh",
  disabled = false,
}: RefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleClick = async () => {
    if (isRefreshing || disabled) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isRefreshing}
      aria-label={title}
      aria-busy={isRefreshing}
      title={title}
      className={cn(
        "rounded-md p-1 text-[var(--neutral-600)] transition-colors hover:bg-[var(--neutral-200)] hover:text-[var(--neutral-900)] disabled:cursor-not-allowed disabled:opacity-60 dark:text-[var(--neutral-400)] dark:hover:bg-[var(--neutral-800)] dark:hover:text-[var(--neutral-100)]",
        className
      )}
    >
      <RefreshCw size={14} className={cn(isRefreshing && "animate-spin")} />
    </button>
  );
}
