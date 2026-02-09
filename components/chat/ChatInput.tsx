"use client";

import { useState, useRef, useEffect } from "react";
import { useChatStore } from "@/lib/stores/chat";
import { useModelStore } from "@/lib/stores/model";
import { sendChatMessage, updateEnabledMcpServers } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Globe, Paperclip, Plus, Send } from "lucide-react";
import Link from "next/link";

export function ChatInput() {
  const [message, setMessage] = useState("");
  const [mcpMenuOpen, setMcpMenuOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mcpMenuRef = useRef<HTMLDivElement>(null);
  const {
    addMessage,
    setLoading,
    webSearchEnabled,
    setWebSearchEnabled,
    mcpServers,
    fetchMcpServers,
    setMcpServerEnabled,
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

  useEffect(() => {
    if (mcpServers.length === 0) {
      fetchMcpServers();
    }
  }, [mcpServers.length, fetchMcpServers]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!mcpMenuRef.current) return;
      if (!mcpMenuRef.current.contains(event.target as Node)) {
        setMcpMenuOpen(false);
      }
    };

    if (mcpMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mcpMenuOpen]);

  const handleToggleMcpServer = async (serverId: string) => {
    const nextServers = mcpServers.map((server) =>
      server.id === serverId ? { ...server, enabled: !server.enabled } : server
    );
    setMcpServerEnabled(
      serverId,
      !!nextServers.find((server) => server.id === serverId)?.enabled
    );
    try {
      const enabledIds = nextServers.filter((server) => server.enabled).map((server) => server.id);
      await updateEnabledMcpServers(enabledIds);
    } catch (error) {
      console.error("Failed to persist MCP server selection:", error);
    }
  };

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
      const enabledMcpServers = useChatStore
        .getState()
        .mcpServers.filter((server) => server.enabled)
        .map((server) => server.id);
      const response = await sendChatMessage(
        userMessage,
        sessionId,
        currentChatId,
        webSearchEnabled,
        enabledMcpServers
      );
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
        toolsCalled: response.tools_called ?? [],
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
            <div className="flex items-center gap-1 relative" ref={mcpMenuRef}>
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

              <button
                type="button"
                onClick={() => setMcpMenuOpen((prev) => !prev)}
                className={`flex items-center justify-center w-8 h-8 rounded-md transition-colors ${
                  mcpMenuOpen
                    ? "bg-[var(--primary-100)] text-[var(--primary-700)]"
                    : "hover:bg-secondary text-muted-foreground"
                }`}
                title="MCP servers"
              >
                <Plus className="w-4 h-4" />
              </button>

              {mcpMenuOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-72 rounded-lg border border-border bg-card shadow-lg p-2 z-20">
                  <p className="text-xs font-medium text-foreground px-2 py-1">MCP servers</p>
                  <div className="max-h-56 overflow-y-auto">
                    {mcpServers.length === 0 && (
                      <p className="text-xs text-muted-foreground px-2 py-1">No servers found.</p>
                    )}
                    {mcpServers.map((server) => (
                      <button
                        key={server.id}
                        type="button"
                        onClick={() => handleToggleMcpServer(server.id)}
                        className="w-full text-left rounded-md px-2 py-2 hover:bg-secondary transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-foreground">{server.name}</span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full ${
                              server.enabled
                                ? "bg-[var(--success-100)] text-[var(--success-700)]"
                                : "bg-secondary text-muted-foreground"
                            }`}
                          >
                            {server.enabled ? "ON" : "OFF"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{server.description}</p>
                        <p className="text-[11px] text-[var(--neutral-500)] mt-1">
                          {server.source === "builtin" ? "Built-in" : "Custom"}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
