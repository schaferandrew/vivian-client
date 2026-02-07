"use client";

import { Badge } from "@/components/ui/badge";
import { Home, MessageSquare } from "lucide-react";
import Link from "next/link";
import { ModelSelector } from "./ModelSelector";
import { WebSearchToggle } from "./WebSearchToggle";

export function ChatHeader() {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 bg-white">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="w-10 h-10 bg-zinc-100 hover:bg-zinc-200 rounded-full flex items-center justify-center transition-colors"
          aria-label="Go to home"
        >
          <Home className="w-5 h-5 text-zinc-700" />
        </Link>
        <div className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-semibold text-zinc-900">Vivian</h1>
          <p className="text-xs text-zinc-500">Household Assistant</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <WebSearchToggle />
        <ModelSelector />
        <Badge variant="outline" className="gap-1">
          <span className="w-2 h-2 bg-green-500 rounded-full" />
          Ready
        </Badge>
      </div>
    </div>
  );
}
