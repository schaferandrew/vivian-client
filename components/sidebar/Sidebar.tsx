"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, SquarePen } from "lucide-react";
import Image from "next/image";
import { ChatList } from "./ChatList";
import { UserProfile } from "./UserProfile";
import { useChatStore } from "@/lib/stores/chat";

export function Sidebar() {
  const { sidebarCollapsed, chats, fetchChats, currentChatId, loadChat, createNewChat, toggleSidebar } = useChatStore();

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  const handleChatClick = (chatId: string) => {
    if (chatId !== currentChatId) {
      loadChat(chatId);
    }
  };

  return (
    <aside
      className={`flex h-full flex-shrink-0 flex-col border-r border-[var(--neutral-200)] bg-[var(--neutral-100)] text-[var(--neutral-900)] transition-all duration-300 ease-in-out dark:border-[var(--neutral-800)] dark:bg-[var(--neutral-900)] dark:text-[var(--neutral-100)] ${
        sidebarCollapsed ? "w-16" : "w-64"
      }`}
    >
      <div className="shrink-0 border-b border-[var(--neutral-200)] p-3 dark:border-[var(--neutral-800)]">
        <div className={`flex items-center ${sidebarCollapsed ? "justify-center" : "justify-between"}`}>
          {!sidebarCollapsed && (
            <Link href="/">
              <Image
                src="/vivian-square.svg"
                alt="Vivian"
                width={40}
                height={40}
                className="shrink-0 rounded-xl"
                priority
              />
            </Link>
          )}
          <button
            onClick={toggleSidebar}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--neutral-700)] transition-colors hover:bg-[var(--neutral-200)] dark:text-[var(--neutral-300)] dark:hover:bg-[var(--neutral-800)]"
            title={sidebarCollapsed ? "Open sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {!sidebarCollapsed && (
          <button
            onClick={createNewChat}
            className="w-full mt-2 bg-[var(--primary-600)] hover:bg-[var(--primary-500)] text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + New Chat
          </button>
        )}
      </div>

      {sidebarCollapsed ? (
        <div className="flex-1 min-h-0 py-3 flex flex-col items-center">
          <button
            onClick={createNewChat}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--neutral-700)] transition-colors hover:bg-[var(--neutral-200)] dark:text-[var(--neutral-300)] dark:hover:bg-[var(--neutral-800)]"
            title="New chat"
          >
            <SquarePen size={20} />
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto py-2 min-h-0">
          <ChatList
            chats={chats}
            currentChatId={currentChatId}
            onChatClick={handleChatClick}
            onRefresh={fetchChats}
            onCollapsedClick={toggleSidebar}
            collapsed={sidebarCollapsed}
          />
        </div>
      )}

      <UserProfile collapsed={sidebarCollapsed} />
    </aside>
  );
}
