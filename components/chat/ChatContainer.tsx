"use client";

import { useRef, useEffect } from "react";
import { useChatStore } from "@/lib/stores/chat";
import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType } from "@/types";

function ChatMessage({ message }: { message: ChatMessageType }) {
  return (
    <div
      className={cn(
        "flex w-full",
        message.role === "user" ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-2",
          message.role === "user"
            ? "bg-zinc-900 text-white"
            : message.role === "system"
            ? "bg-red-50 text-red-900 border border-red-200"
            : "bg-zinc-100 text-zinc-900"
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}

function LoadingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-zinc-100 rounded-lg px-4 py-3">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

export function ChatContainer() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, isLoading } = useChatStore();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {messages.length === 0 && (
        <div className="text-center text-zinc-400 py-8">
          <p className="text-sm">Start a conversation with Vivian</p>
          <p className="text-xs mt-2">Try: &quot;Upload a receipt&quot; or &quot;What&apos;s my HSA balance?&quot;</p>
        </div>
      )}
      
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
      
      {isLoading && <LoadingIndicator />}
      
      <div ref={messagesEndRef} />
    </div>
  );
}
