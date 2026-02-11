"use client";

import { useState, useRef, useEffect } from "react";
import { CheckCircle2, Globe, Loader2, Paperclip, Plus, Send, X } from "lucide-react";

import { useChatStore } from "@/lib/stores/chat";
import { useModelStore } from "@/lib/stores/model";
import { sendChatMessage, updateEnabledMcpServers, uploadReceipt } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ChatAttachmentInput } from "@/types";

export function ChatInput() {
  const [message, setMessage] = useState("");
  const [mcpMenuOpen, setMcpMenuOpen] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachmentInput[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [recentAttachmentSuccess, setRecentAttachmentSuccess] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleAttachFile = async (file: File | null) => {
    if (!file) {
      return;
    }

    const isPdf =
      file.type.toLowerCase().includes("pdf") || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setAttachmentError(
        `Only PDF receipts are supported right now. "${file.name}" wasn't a PDF.`
      );
      return;
    }

    setIsUploadingAttachment(true);
    setAttachmentError(null);
    try {
      const upload = await uploadReceipt(file);
      setPendingAttachments([
        {
          document_type: "hsa_receipt",
          temp_file_path: upload.temp_file_path,
          filename: file.name,
          mime_type: file.type || "application/pdf",
        },
      ]);
      setRecentAttachmentSuccess(true);
      setTimeout(() => {
        setRecentAttachmentSuccess(false);
      }, 450);
    } catch (error) {
      setAttachmentError(error instanceof Error ? error.message : "Failed to upload receipt.");
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && pendingAttachments.length === 0) return;

    const outgoingAttachments = [...pendingAttachments];
    const baseUserMessage = message.trim() || "Please process this receipt.";
    const attachmentLabel =
      outgoingAttachments.length > 0
        ? `\n\nAttached: ${outgoingAttachments
            .map((attachment) => attachment.filename || "receipt.pdf")
            .join(", ")}`
        : "";

    addMessage({
      id: Date.now().toString(),
      role: "user",
      content: `${baseUserMessage}${attachmentLabel}`,
      timestamp: new Date(),
    });

    setMessage("");
    setPendingAttachments([]);
    setAttachmentError(null);
    setLoading(true);

    try {
      const { sessionId, currentChatId } = useChatStore.getState();
      const enabledMcpServers = useChatStore
        .getState()
        .mcpServers.filter((server) => server.enabled)
        .map((server) => server.id);
      const response = await sendChatMessage(
        baseUserMessage,
        sessionId,
        currentChatId,
        webSearchEnabled,
        enabledMcpServers,
        outgoingAttachments
      );
      setCreditsError(null);
      setRateLimitError(null);

      useChatStore.setState((state) => ({
        sessionId: response.session_id || state.sessionId,
        currentChatId: response.chat_id || state.currentChatId,
      }));

      await fetchChats();
      const attachmentAcknowledgement =
        outgoingAttachments.length > 0
          ? "Receipt received. I parsed it and need your confirmation below.\n\n"
          : "";

      addMessage({
        id: (Date.now() + 1).toString(),
        role: "agent",
        content: `${attachmentAcknowledgement}${response.response}`,
        timestamp: new Date(),
        toolsCalled: response.tools_called ?? [],
        documentWorkflows: response.document_workflows ?? [],
      });
    } catch (error) {
      if (outgoingAttachments.length > 0) {
        setPendingAttachments(outgoingAttachments);
      }

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
        <div
          className={`border rounded-2xl bg-card transition-colors ${
            isDragActive
              ? "border-[var(--primary-500)] bg-[var(--primary-50)]"
              : "border-border"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            if (!isDragActive) {
              setIsDragActive(true);
            }
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            if (e.currentTarget.contains(e.relatedTarget as Node)) {
              return;
            }
            setIsDragActive(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragActive(false);
            const droppedFile = e.dataTransfer.files?.[0] || null;
            void handleAttachFile(droppedFile);
          }}
        >
          {isDragActive && (
            <div className="px-4 pt-3 text-xs font-medium text-[var(--primary-700)]">
              Drop PDF receipt to upload
            </div>
          )}

          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="w-full border-none resize-none shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[56px] max-h-[220px] py-3 px-4 text-[15px] rounded-t-2xl"
            rows={1}
          />

          {pendingAttachments.length > 0 && (
            <div className="px-3">
              <div className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5">
                <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs text-foreground truncate">
                  {pendingAttachments[0].filename || "receipt.pdf"}
                </p>
                <button
                  type="button"
                  className="ml-auto rounded-md p-1 hover:bg-secondary"
                  onClick={() => setPendingAttachments([])}
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>
          )}

          {attachmentError && (
            <div className="px-3 pb-1 text-xs text-[var(--error-700)]">{attachmentError}</div>
          )}

          <div className="flex items-center justify-between px-3 pb-2 pt-1">
            <div className="flex items-center gap-1 relative" ref={mcpMenuRef}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => {
                  const selected = e.target.files?.[0] || null;
                  void handleAttachFile(selected);
                  e.currentTarget.value = "";
                }}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAttachment}
                className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-secondary transition-colors text-muted-foreground disabled:opacity-70"
                title="Attach receipt (PDF)"
              >
                {isUploadingAttachment ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Paperclip className="w-4 h-4" />
                )}
              </button>

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
              disabled={
                isUploadingAttachment ||
                (!message.trim() && pendingAttachments.length === 0)
              }
              size="sm"
              className="h-8 px-3 rounded-md"
            >
              <Send className="w-4 h-4 mr-2" />
              {pendingAttachments.length > 0 ? "Send & Process" : "Send"}
            </Button>
          </div>
          {recentAttachmentSuccess && (
            <div className="px-3 pb-2">
              <div className="inline-flex items-center gap-1 rounded-md bg-[var(--success-100)] px-2 py-1 text-[11px] text-[var(--success-700)] animate-in fade-in duration-200">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Receipt attached</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
