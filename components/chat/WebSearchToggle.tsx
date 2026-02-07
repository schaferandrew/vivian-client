"use client";

import { Search } from "lucide-react";
import { useChatStore } from "@/lib/stores/chat";
import { useState } from "react";

export function WebSearchToggle() {
  const { webSearchEnabled, setWebSearchEnabled } = useChatStore();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggle = async () => {
    if (isUpdating) return;
    
    setIsUpdating(true);
    const newValue = !webSearchEnabled;
    
    try {
      // For now, just toggle locally since web search is per-request
      // The backend will use the session's web_search_enabled setting
      // which defaults to false for new conversations
      setWebSearchEnabled(newValue);
    } catch (error) {
      console.error("Failed to toggle web search:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const title = webSearchEnabled
    ? "Web search enabled (~$0.02 per query). Click to disable."
    : "Web search disabled. Click to enable (~$0.02 per query).";

  return (
    <button
      onClick={handleToggle}
      disabled={isUpdating}
      className={`
        flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium
        transition-colors duration-200 border
        ${
          webSearchEnabled
            ? "bg-blue-500/10 border-blue-500/50 text-blue-600 hover:bg-blue-500/20"
            : "bg-muted border-border text-muted-foreground hover:bg-accent hover:text-foreground"
        }
        ${isUpdating ? "opacity-50 cursor-not-allowed" : ""}
      `}
      aria-label={webSearchEnabled ? "Disable web search" : "Enable web search"}
      aria-pressed={webSearchEnabled}
      title={title}
    >
      <Search className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Web</span>
    </button>
  );
}
