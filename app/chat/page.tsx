"use client";

import { ChatContainer } from "@/components/chat/ChatContainer";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatHeader } from "@/components/chat/ChatHeader";

export default function ChatPage() {
  return (
    <div className="flex flex-col h-screen bg-zinc-50">
      <ChatHeader />
      <ChatContainer />
      <ChatInput />
    </div>
  );
}
