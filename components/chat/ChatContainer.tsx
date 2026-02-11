"use client";

import { useRef, useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useChatStore } from "@/lib/stores/chat";
import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType, ToolCallInfo } from "@/types";
import { DocumentWorkflowCard } from "@/components/chat/DocumentWorkflowCard";

import MarkdownRenderer from '../ui/MarkdownRenderer';

function formatToolValue(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return `[${value.map(formatToolValue).join(", ")}]`;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function formatToolCall(
  serverId: string,
  toolName: string,
  input?: string
): string {
  const fallback = `Tool: ${serverId}.${toolName}()`;
  if (!input) return fallback;

  try {
    const parsed = JSON.parse(input);

    if (
      toolName === "add_numbers" &&
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as { a?: unknown }).a === "number" &&
      typeof (parsed as { b?: unknown }).b === "number"
    ) {
      const { a, b } = parsed as { a: number; b: number };
      return `Tool: ${serverId}.${toolName}(${a} + ${b})`;
    }

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const entries = Object.entries(parsed)
        .slice(0, 4)
        .map(([key, value]) => `${key}=${formatToolValue(value)}`);
      const suffix = Object.keys(parsed).length > 4 ? ", ..." : "";
      return `Tool: ${serverId}.${toolName}(${entries.join(", ")}${suffix})`;
    }

    return `Tool: ${serverId}.${toolName}(${formatToolValue(parsed)})`;
  } catch {
    const compact = input.length > 140 ? `${input.slice(0, 140)}...` : input;
    return `Tool: ${serverId}.${toolName}(${compact})`;
  }
}

function formatToolResult(toolName: string, output?: string): string | null {
  if (!output) return null;

  try {
    const parsed = JSON.parse(output);

    if (toolName === "add_numbers" && parsed && typeof parsed === "object") {
      const maybeSum = (parsed as { sum?: unknown }).sum;
      if (typeof maybeSum === "number") {
        return `Result: ${maybeSum}`;
      }
    }

    if (toolName === "check_for_duplicates" && parsed && typeof parsed === "object") {
      const isDuplicate = (parsed as { is_duplicate?: boolean }).is_duplicate;
      const count = (parsed as { total_duplicates_found?: number }).total_duplicates_found ?? 0;
      if (isDuplicate) {
        return `Result: ${count} duplicate${count === 1 ? "" : "s"} found`;
      }
      return "Result: No duplicates found";
    }

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const entries = Object.entries(parsed)
        .slice(0, 4)
        .map(([key, value]) => `${key}=${formatToolValue(value)}`);
      const suffix = Object.keys(parsed).length > 4 ? ", ..." : "";
      return `Result: ${entries.join(", ")}${suffix}`;
    }

    return `Result: ${formatToolValue(parsed)}`;
  } catch {
    const compact = output.length > 180 ? `${output.slice(0, 180)}...` : output;
    return `Result: ${compact}`;
  }
}

function CollapsibleToolResult({ tool }: { tool: ToolCallInfo }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const summary = formatToolResult(tool.tool_name, tool.output);
  
  if (!summary) return null;
  
  return (
    <div className="text-xs text-muted-foreground">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1.5 hover:text-foreground transition-colors w-full text-left group"
        type="button"
      >
        <div className="flex items-center gap-1 text-[10px] opacity-60 group-hover:opacity-100">
          {isExpanded ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
          <span>{isExpanded ? "Hide" : "Show"}</span>
        </div>
        <span className="italic truncate flex-1">{formatToolCall(tool.server_id, tool.tool_name, tool.input)}</span>
      </button>
      
      {isExpanded ? (
        <div className="mt-1.5 space-y-1.5 pl-4 border-l-2 border-border/50">
          <p className="italic">{summary}</p>
          {tool.output && (
            <div className="p-2 bg-muted rounded text-[10px] font-mono overflow-x-auto">
              <pre className="whitespace-pre-wrap break-all">{tool.output}</pre>
            </div>
          )}
        </div>
      ) : (
        <p className="pl-6 italic opacity-70">{summary}</p>
      )}
    </div>
  );
}

function ChatMessage({ message }: { message: ChatMessageType }) {
  return (
    <div
      className={cn(
        "flex w-full",
        message.role === "user" ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-2",
          message.role === "user"
            ? "bg-primary text-primary-foreground"
            : message.role === "system"
            ? "bg-[var(--error-50)] text-[var(--error-800)] border border-[var(--error-200)]"
            : "bg-secondary text-foreground"
        )}
      >
        <MarkdownRenderer content={message.content} />
        {message.documentWorkflows && message.documentWorkflows.length > 0 && (
          <div className="mt-3 space-y-3">
            {message.documentWorkflows.map((workflow) => (
              <DocumentWorkflowCard key={workflow.workflow_id} workflow={workflow} />
            ))}
          </div>
        )}
        {message.role === "agent" && message.toolsCalled && message.toolsCalled.length > 0 && (
          <div className="mt-2 space-y-1 border-t border-border/50 pt-2">
            {message.toolsCalled.map((tool, idx) => (
              <CollapsibleToolResult
                key={`${tool.server_id}-${tool.tool_name}-${idx}`}
                tool={tool}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-secondary rounded-lg px-4 py-3">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

export function ChatContainer() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, isLoading } = useChatStore();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-5 min-h-0">
      <div className="max-w-3xl mx-auto space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-16">
            <p className="text-sm font-medium text-muted-foreground">Start a conversation with Vivian</p>
            <p className="text-xs mt-2">Try: &quot;Upload a receipt&quot; or &quot;What&apos;s my HSA balance?&quot;</p>
          </div>
        )}

        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {isLoading && <LoadingIndicator />}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
