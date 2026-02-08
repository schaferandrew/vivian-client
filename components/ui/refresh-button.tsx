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
        "p-1 rounded-md text-[var(--neutral-600)] hover:text-[var(--neutral-900)] hover:bg-[var(--neutral-200)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
        className
      )}
    >
      <RefreshCw size={14} className={cn(isRefreshing && "animate-spin")} />
    </button>
  );
}
