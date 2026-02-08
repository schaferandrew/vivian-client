"use client";

import { Home } from "lucide-react";
import Link from "next/link";
import { ModelSelector } from "./ModelSelector";
import { useChatStore } from "@/lib/stores/chat";

export function ChatHeader() {
  const { chats, currentChatId } = useChatStore();
  const activeChat = chats.find((chat) => chat.id === currentChatId);
  const activeTitle = activeChat?.title?.trim() || "New Chat";

  return (
    <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-background shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <div className="min-w-0">
          <h1 className="font-semibold text-foreground truncate">{activeTitle}</h1>
          <p className="text-xs text-muted-foreground hidden sm:block">Vivian</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <ModelSelector />
        <Link
          href="/"
          className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-border text-muted-foreground hover:bg-secondary transition-colors"
          title="Go to home"
          aria-label="Go to home"
        >
          <Home className="w-4 h-4" />
        </Link>
      </div>
    </header>
  );
}
