"use client";

import { useState, useRef, useEffect } from "react";
import { useChatStore } from "@/lib/stores/chat";
import { useModelStore } from "@/lib/stores/model";
import { sendChatMessage } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Globe, Paperclip, Send } from "lucide-react";
import Link from "next/link";

export function ChatInput() {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const {
    addMessage,
    setLoading,
    webSearchEnabled,
    setWebSearchEnabled,
    fetchChats,
  } = useChatStore();
  const setCreditsError = useModelStore((s) => s.setCreditsError);
  const setRateLimitError = useModelStore((s) => s.setRateLimitError);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMessage = message.trim();

    addMessage({
      id: Date.now().toString(),
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    });

    setMessage("");
    setLoading(true);

    try {
      const { sessionId, currentChatId } = useChatStore.getState();
      const response = await sendChatMessage(userMessage, sessionId, currentChatId, webSearchEnabled);
      setCreditsError(null);
      setRateLimitError(null);

      useChatStore.setState((state) => ({
        sessionId: response.session_id || state.sessionId,
        currentChatId: response.chat_id || state.currentChatId,
      }));

      await fetchChats();

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
    <form onSubmit={handleSubmit} className="bg-background shrink-0">
      <div className="max-w-3xl mx-auto px-4 pb-4 pt-3">
        <div className="border border-border rounded-2xl bg-card">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="w-full border-none resize-none shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[56px] max-h-[220px] py-3 px-4 text-[15px] rounded-t-2xl"
            rows={1}
          />

          <div className="flex items-center justify-between px-3 pb-2 pt-1">
            <div className="flex items-center gap-1">
              <Link
                href="/receipts"
                className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-secondary transition-colors"
                title="Upload receipt"
              >
                <Paperclip className="w-4 h-4 text-muted-foreground" />
              </Link>

              <button
                type="button"
                onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                className={`flex items-center justify-center w-8 h-8 rounded-md transition-colors ${
                  webSearchEnabled
                    ? "bg-[var(--primary-100)] text-[var(--primary-700)]"
                    : "hover:bg-secondary text-muted-foreground"
                }`}
                title="Toggle web search"
              >
                <Globe className="w-4 h-4" />
              </button>
            </div>

            <Button
              type="submit"
              disabled={!message.trim()}
              size="sm"
              className="h-8 px-3 rounded-md"
            >
              <Send className="w-4 h-4 mr-2" />
              Send
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
