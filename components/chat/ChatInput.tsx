"use client";

import { useState } from "react";
import { useChatStore } from "@/lib/stores/chat";
import { useModelStore } from "@/lib/stores/model";
import { sendChatMessage } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Paperclip, Send } from "lucide-react";
import Link from "next/link";

export function ChatInput() {
  const [message, setMessage] = useState("");
  const { addMessage, setLoading } = useChatStore();
  const setCreditsError = useModelStore((s) => s.setCreditsError);
  const setRateLimitError = useModelStore((s) => s.setRateLimitError);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    const userMessage = message.trim();
    
    // Add user message immediately
    addMessage({
      id: Date.now().toString(),
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    });
    
    setMessage("");
    setLoading(true);
    
    try {
      // Send to backend via HTTP
      const response = await sendChatMessage(userMessage);
      setCreditsError(null);
      setRateLimitError(null);
      // Add agent response
      addMessage({
        id: (Date.now() + 1).toString(),
        role: "agent",
        content: response.response,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      const err = error as Error & { code?: string };
      if (err?.code === "insufficient_credits") {
        setCreditsError(err.message ?? "Insufficient OpenRouter credits. Add credits and try again.");
      }
      if (err?.code === "rate_limit") {
        setRateLimitError(err.message ?? "Rate limit exceeded. Please wait a moment and try again.");
      }
      if (err?.code === "model_not_found") {
        // Model not found error - display it as a system message
        addMessage({
          id: (Date.now() + 1).toString(),
          role: "system",
          content: err.message ?? "Model not found or unavailable. Please select a different model.",
          timestamp: new Date(),
        });
        setLoading(false);
        return;
      }
      const isNetworkError =
        error instanceof TypeError &&
        (error.message === "Failed to fetch" || error.message.includes("fetch"));
      const serverMessage =
        error instanceof Error && error.message ? error.message : null;
      const friendlyMessage =
        serverMessage && (serverMessage.includes("chat server") || serverMessage.includes("backend"))
          ? serverMessage
          : isNetworkError
            ? "Couldn't reach the chat server. Is the backend running? Check the console for details."
            : serverMessage || "Sorry, I couldn't process your message. Please try again.";
      addMessage({
        id: (Date.now() + 1).toString(),
        role: "system",
        content: friendlyMessage,
        timestamp: new Date(),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-zinc-200 p-4">
      <div className="flex gap-2 items-end">
        <Link
          href="/receipts"
          className="flex items-center justify-center w-10 h-10 rounded-lg border border-zinc-200 hover:bg-zinc-50 transition-colors"
        >
          <Paperclip className="w-5 h-5 text-zinc-600" />
        </Link>
        
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 min-h-[44px] max-h-[120px] resize-none"
          rows={1}
        />
        
        <Button
          type="submit"
          disabled={!message.trim()}
          className="h-10 w-10 p-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </form>
  );
}
