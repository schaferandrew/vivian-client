"use client";

import React, { useEffect } from "react";
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
      className={`flex-shrink-0 h-full bg-[var(--neutral-100)] text-[var(--neutral-900)] transition-all duration-300 ease-in-out flex flex-col border-r border-[var(--neutral-200)] ${
        sidebarCollapsed ? "w-16" : "w-64"
      }`}
    >
      <div className="p-3 border-b border-[var(--neutral-200)] shrink-0">
        <div className={`flex items-center ${sidebarCollapsed ? "justify-center" : "justify-between"}`}>
          {!sidebarCollapsed && (
            <Image
              src="/vivian-square.svg"
              alt="Vivian"
              width={32}
              height={32}
              className="shrink-0 rounded-xl"
              priority
            />
          )}
          <button
            onClick={toggleSidebar}
            className="w-8 h-8 rounded-md hover:bg-[var(--neutral-200)] text-[var(--neutral-700)] flex items-center justify-center transition-colors"
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
            className="w-10 h-10 rounded-lg text-[var(--neutral-700)] hover:bg-[var(--neutral-200)] transition-colors flex items-center justify-center"
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
