"use client";

import { useState } from "react";
import { useChatStore } from "@/lib/stores/chat";
import { sendChatMessage } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Paperclip, Send } from "lucide-react";
import Link from "next/link";

export function ChatInput() {
  const [message, setMessage] = useState("");
  const { addMessage, setLoading } = useChatStore();

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
      
      // Add agent response
      addMessage({
        id: (Date.now() + 1).toString(),
        role: "agent",
        content: response.response,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      addMessage({
        id: (Date.now() + 1).toString(),
        role: "system",
        content: "Sorry, I couldn't process your message. Please try again.",
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
