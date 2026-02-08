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
      <div className="p-2 border-t border-[var(--neutral-200)]">
        <button
          onClick={handleSettingsClick}
          className="w-full p-2 flex items-center justify-center hover:bg-[var(--neutral-200)] rounded-lg transition-colors text-[var(--neutral-700)]"
          title="Settings"
        >
          <Settings size={20} />
        </button>
      </div>
    );
  }

  return (
    <div className="p-3 border-t border-[var(--neutral-200)]">
      <button
        onClick={handleSettingsClick}
        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[var(--neutral-200)] rounded-lg transition-colors"
      >
        <div className="w-8 h-8 bg-[var(--primary-600)] rounded-full flex items-center justify-center">
          <UserIcon size={16} className="text-primary-foreground" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-medium text-[var(--neutral-800)]">User</p>
          <p className="text-xs text-[var(--neutral-500)]">View settings</p>
        </div>
        <Settings size={18} className="text-[var(--neutral-500)]" />
      </button>
    </div>
  );
}
