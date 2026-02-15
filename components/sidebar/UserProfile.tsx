"use client";

import React from "react";
import { Settings, User as UserIcon } from "lucide-react";

interface UserProfileProps {
  collapsed: boolean;
}

export function UserProfile({ collapsed }: UserProfileProps) {
  const handleSettingsClick = () => {
    window.location.href = "/settings";
  };

  if (collapsed) {
    return (
      <div className="border-t border-[var(--neutral-200)] p-2 dark:border-[var(--neutral-800)]">
        <button
          onClick={handleSettingsClick}
          className="flex w-full items-center justify-center rounded-lg p-2 text-[var(--neutral-700)] transition-colors hover:bg-[var(--neutral-200)] dark:text-[var(--neutral-300)] dark:hover:bg-[var(--neutral-800)]"
          title="Settings"
        >
          <Settings size={20} />
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-[var(--neutral-200)] p-3 dark:border-[var(--neutral-800)]">
      <button
        onClick={handleSettingsClick}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-[var(--neutral-200)] dark:hover:bg-[var(--neutral-800)]"
      >
        <div className="w-8 h-8 bg-[var(--primary-600)] rounded-full flex items-center justify-center">
          <UserIcon size={16} className="text-primary-foreground" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-medium text-[var(--neutral-800)] dark:text-[var(--neutral-100)]">User</p>
          <p className="text-xs text-[var(--neutral-500)] dark:text-[var(--neutral-400)]">View settings</p>
        </div>
        <Settings size={18} className="text-[var(--neutral-500)] dark:text-[var(--neutral-400)]" />
      </button>
    </div>
  );
}
