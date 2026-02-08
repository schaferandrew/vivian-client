"use client";

import React from "react";
import { MessageSquare, RefreshCw, Trash2 } from "lucide-react";
import type { Chat } from "@/types";
import { useChatStore } from "@/lib/stores/chat";

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
                ? "bg-[var(--primary-100)] text-[var(--primary-700)]"
                : "hover:bg-[var(--neutral-200)] text-[var(--neutral-700)]"
            }`}
            title={chat.title}
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
        <h3 className="text-xs font-semibold text-[var(--neutral-500)] uppercase tracking-wider">Recent Chats</h3>
        <button
          type="button"
          onClick={onRefresh}
          className="p-1 rounded-md text-[var(--neutral-600)] hover:text-[var(--neutral-900)] hover:bg-[var(--neutral-200)] transition-colors"
          title="Refresh chats"
        >
          <RefreshCw size={14} />
        </button>
      </div>
      {chats.length === 0 ? (
        <p className="px-3 text-sm text-[var(--neutral-500)]">No chats yet</p>
      ) : (
        <ul className="space-y-1">
          {chats.map((chat) => (
            <li key={chat.id}>
              <div
                className={`w-full flex items-center gap-2 px-1 py-1 rounded-lg transition-colors group ${
                  chat.id === currentChatId
                    ? "bg-[var(--primary-100)] text-[var(--primary-700)]"
                    : "hover:bg-[var(--neutral-200)] text-[var(--neutral-900)]"
                }`}
              >
                <button
                  onClick={() => onChatClick(chat.id)}
                  className="flex-1 flex items-center gap-3 px-2 py-1.5 text-left rounded-md min-w-0"
                >
                  <MessageSquare size={16} className="flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-[var(--neutral-800)]">{chat.title}</p>
                    {chat.summary && (
                      <p className="text-xs text-[var(--neutral-500)] truncate">{chat.summary}</p>
                    )}
                  </div>
                </button>
                <button
                  onClick={(e) => handleDelete(e, chat.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-[var(--neutral-500)] hover:text-[var(--error-700)] hover:bg-[var(--error-100)] rounded transition-opacity"
                  title="Delete chat"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
