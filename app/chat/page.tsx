"use client";

import { useEffect } from "react";
import { ChatContainer } from "@/components/chat/ChatContainer";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { useModelStore } from "@/lib/stores/model";
import { useChatStore } from "@/lib/stores/chat";
import { createSession } from "@/lib/api/client";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ChatPage() {
  const openRouterCreditsError = useModelStore((s) => s.openRouterCreditsError);
  const setCreditsError = useModelStore((s) => s.setCreditsError);
  const rateLimitError = useModelStore((s) => s.rateLimitError);
  const setRateLimitError = useModelStore((s) => s.setRateLimitError);
  const { sessionId, setSessionId } = useChatStore();

  useEffect(() => {
    const initSession = async () => {
      if (!sessionId) {
        try {
          const { session_id } = await createSession();
          setSessionId(session_id);
        } catch (error) {
          console.error("Failed to create chat session:", error);
        }
      }
    };
    initSession();
  }, [sessionId, setSessionId]);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <ChatHeader />

        {openRouterCreditsError && (
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--brand-200)] bg-[var(--brand-50)] px-4 py-2.5 text-sm text-[var(--brand-900)] dark:border-[var(--brand-800)] dark:bg-[var(--brand-900)]/25 dark:text-[var(--brand-100)]">
            <div className="max-w-3xl mx-auto w-full flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="h-4 w-4 shrink-0 text-[var(--brand-700)] dark:text-[var(--brand-300)]" />
                <span className="truncate">{openRouterCreditsError}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 border-[var(--brand-300)] text-[var(--brand-900)] hover:bg-[var(--brand-100)] dark:border-[var(--brand-700)] dark:text-[var(--brand-100)] dark:hover:bg-[var(--brand-800)]"
                onClick={() => setCreditsError(null)}
              >
                Try again
              </Button>
            </div>
          </div>
        )}

        {rateLimitError && (
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--error-200)] bg-[var(--error-50)] px-4 py-2.5 text-sm text-[var(--error-800)] dark:border-[var(--error-800)] dark:bg-[var(--error-900)]/25 dark:text-[var(--error-200)]">
            <div className="max-w-3xl mx-auto w-full flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="h-4 w-4 shrink-0 text-[var(--error-600)] dark:text-[var(--error-400)]" />
                <span className="truncate">{rateLimitError}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 border-[var(--error-300)] text-[var(--error-800)] hover:bg-[var(--error-100)] dark:border-[var(--error-700)] dark:text-[var(--error-200)] dark:hover:bg-[var(--error-800)]"
                onClick={() => setRateLimitError(null)}
              >
                Try again
              </Button>
            </div>
          </div>
        )}

        <ChatContainer />
        <ChatInput />
      </div>
    </div>
  );
}
