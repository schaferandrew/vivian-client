"use client";

import React from "react";
import { MessageSquare, Trash2 } from "lucide-react";
import type { Chat } from "@/types";
import { useChatStore } from "@/lib/stores/chat";
import { RefreshButton } from "@/components/ui/refresh-button";

interface ChatListProps {
  chats: Chat[];
  currentChatId: string | null;
  onChatClick: (chatId: string) => void;
  onRefresh: () => Promise<void>;
  onCollapsedClick?: () => void;
  collapsed: boolean;
}

export function ChatList({
  chats,
  currentChatId,
  onChatClick,
  onRefresh,
  onCollapsedClick,
  collapsed,
}: ChatListProps) {
  const { deleteChat, fetchChats } = useChatStore();

  const handleDelete = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this chat?")) {
      await deleteChat(chatId);
      await fetchChats();
    }
  };

  if (collapsed) {
    return (
      <div className="flex flex-col items-center py-2">
        {chats.slice(0, 10).map((chat) => (
          <button
            key={chat.id}
            onClick={onCollapsedClick}
            className={`p-2 mb-1 rounded-lg transition-colors ${
              chat.id === currentChatId
                ? "bg-[var(--primary-100)] text-[var(--primary-700)] dark:bg-[var(--primary-900)] dark:text-[var(--primary-200)]"
                : "text-[var(--neutral-700)] hover:bg-[var(--neutral-200)] dark:text-[var(--neutral-300)] dark:hover:bg-[var(--neutral-800)]"
            }`}
            title={chat.summary?.trim() || chat.title}
          >
            <MessageSquare size={18} />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="px-2">
      <div className="px-3 mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--neutral-500)] dark:text-[var(--neutral-400)]">Recent Chats</h3>
        <RefreshButton onRefresh={onRefresh} title="Refresh chats" />
      </div>
      {chats.length === 0 ? (
        <p className="px-3 text-sm text-[var(--neutral-500)] dark:text-[var(--neutral-400)]">No chats yet</p>
      ) : (
        <ul className="space-y-1">
          {chats.map((chat) => {
            const summaryName = chat.summary?.trim() || "";
            const titleName = chat.title?.trim() || "New Chat";
            const displayName = summaryName || titleName;
            const subLabel =
              summaryName && titleName && summaryName.toLowerCase() !== titleName.toLowerCase()
                ? titleName
                : "";

            return (
              <li key={chat.id}>
                <div
                  className={`w-full flex items-center gap-2 px-1 py-1 rounded-lg transition-colors group ${
                    chat.id === currentChatId
                      ? "bg-[var(--primary-100)] text-[var(--primary-700)] dark:bg-[var(--primary-900)] dark:text-[var(--primary-200)]"
                      : "text-[var(--neutral-900)] hover:bg-[var(--neutral-200)] dark:text-[var(--neutral-100)] dark:hover:bg-[var(--neutral-800)]"
                  }`}
                >
                  <button
                    onClick={() => onChatClick(chat.id)}
                    className="flex-1 flex items-center gap-3 px-2 py-1.5 text-left rounded-md min-w-0"
                  >
                    <MessageSquare size={16} className="flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--neutral-800)] dark:text-[var(--neutral-100)]">{displayName}</p>
                      {subLabel && (
                        <p className="truncate text-xs text-[var(--neutral-500)] dark:text-[var(--neutral-400)]">{subLabel}</p>
                      )}
                    </div>
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, chat.id)}
                    className="rounded p-1 text-[var(--neutral-500)] opacity-0 transition-opacity hover:bg-[var(--error-100)] hover:text-[var(--error-700)] group-hover:opacity-100 dark:text-[var(--neutral-400)] dark:hover:bg-[var(--error-900)] dark:hover:text-[var(--error-300)]"
                    title="Delete chat"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
