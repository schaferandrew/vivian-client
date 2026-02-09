"use client";

import { useRef, useEffect } from "react";
import { useChatStore } from "@/lib/stores/chat";
import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType } from "@/types";

import MarkdownRenderer from '../ui/MarkdownRenderer';

function normalizeNumericLabel(value: string): string {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return value;
  }
  if (Number.isInteger(parsed)) {
    return String(parsed);
  }
  return String(parsed);
}

function formatToolCallSummary(message: ChatMessageType): string | null {
  if (!message.toolsCalled || message.toolsCalled.length === 0) {
    return null;
  }

  const first = message.toolsCalled[0];
  if (first?.tool_name === "add_numbers" && first.input) {
    const match = first.input.match(
      /(-?\d+(?:\.\d+)?)\s*\+\s*(-?\d+(?:\.\d+)?)/,
    );
    if (match) {
      return `addition tool called for {${normalizeNumericLabel(match[1])}, ${normalizeNumericLabel(match[2])}}`;
    }
  }

  return "tool called";
}

function ChatMessage({ message }: { message: ChatMessageType }) {
  const toolSummary = formatToolCallSummary(message);

  return (
    <div
      className={cn(
        "flex w-full",
        message.role === "user" ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn("max-w-[80%]")}
      >
        {toolSummary && message.role === "agent" && (
          <p className="mb-1 text-[11px] italic text-[var(--neutral-500)]">{toolSummary}</p>
        )}
        <div
          className={cn(
            "rounded-lg px-4 py-2",
            message.role === "user"
              ? "bg-primary text-primary-foreground"
              : message.role === "system"
              ? "bg-[var(--error-50)] text-[var(--error-800)] border border-[var(--error-200)]"
              : "bg-secondary text-foreground"
          )}
        >
          <MarkdownRenderer content={message.content} />
        </div>
      </div>
    </div>
  );
}

function LoadingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-secondary rounded-lg px-4 py-3">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
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
    <div className="flex-1 overflow-y-auto px-4 py-5 min-h-0">
      <div className="max-w-3xl mx-auto space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-16">
            <p className="text-sm font-medium text-muted-foreground">Start a conversation with Vivian</p>
            <p className="text-xs mt-2">Try: &quot;Upload a receipt&quot; or &quot;What&apos;s my HSA balance?&quot;</p>
          </div>
        )}

        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {isLoading && <LoadingIndicator />}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
