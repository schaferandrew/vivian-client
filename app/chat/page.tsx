"use client";

import { useEffect } from "react";
import { ChatContainer } from "@/components/chat/ChatContainer";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { useModelStore } from "@/lib/stores/model";
import { useChatStore } from "@/lib/stores/chat";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSession } from "@/lib/api/client";

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
          console.error("Failed to create session:", error);
        }
      }
    };
    initSession();
  }, [sessionId, setSessionId]);

  return (
    <div className="flex flex-col h-screen bg-zinc-50">
      <ChatHeader />
      {openRouterCreditsError && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-amber-50 border-b border-amber-200 text-sm text-amber-800">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span className="truncate">{openRouterCreditsError}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 border-amber-300 text-amber-800 hover:bg-amber-100"
            onClick={() => setCreditsError(null)}
          >
            Try again
          </Button>
        </div>
      )}
      {rateLimitError && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-orange-50 border-b border-orange-200 text-sm text-orange-800">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 shrink-0 text-orange-600" />
            <span className="truncate">{rateLimitError}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 border-orange-300 text-orange-800 hover:bg-orange-100"
            onClick={() => setRateLimitError(null)}
          >
            Try again
          </Button>
        </div>
      )}
      <ChatContainer />
      <ChatInput />
    </div>
  );
}
