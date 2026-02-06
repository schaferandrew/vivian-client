"use client";

import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";
import { ModelSelector } from "./ModelSelector";

export function ChatHeader() {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 bg-white">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-semibold text-zinc-900">Vivian</h1>
          <p className="text-xs text-zinc-500">Household Assistant</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <ModelSelector />
        <Badge variant="outline" className="gap-1">
          <span className="w-2 h-2 bg-green-500 rounded-full" />
          Ready
        </Badge>
      </div>
    </div>
  );
}
