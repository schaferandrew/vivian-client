"use client";

import { useRef, useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useChatStore } from "@/lib/stores/chat";
import { cn } from "@/lib/utils";
import type {
  ChatMessage as ChatMessageType,
  FollowUpQuestion,
  ToolCallInfo,
} from "@/types";
import { DocumentWorkflowCard } from "@/components/chat/DocumentWorkflowCard";

import MarkdownRenderer from '../ui/MarkdownRenderer';

function compactText(value: string, maxLength: number): string {
  const singleLine = value.replace(/\s+/g, " ").trim();
  if (singleLine.length <= maxLength) return singleLine;
  return `${singleLine.slice(0, maxLength)}...`;
}

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

function formatJsonBlock(content?: string): string {
  if (!content) return "None";
  try {
    return JSON.stringify(JSON.parse(content), null, 2);
  } catch {
    return content;
  }
}

function formatToolResultSummary(toolName: string, output?: string): string {
  if (!output) return "Tool executed";

  try {
    const parsed = JSON.parse(output);

    if (toolName === "add_numbers" && parsed && typeof parsed === "object") {
      const maybeSum = (parsed as { sum?: unknown }).sum;
      if (typeof maybeSum === "number") {
        return `Sum ${maybeSum}`;
      }
    }

    if (toolName === "check_for_duplicates" && parsed && typeof parsed === "object") {
      const { is_duplicate, total_duplicates_found } = parsed as {
        is_duplicate?: unknown;
        total_duplicates_found?: unknown;
      };
      if (typeof is_duplicate === "boolean") {
        const count =
          typeof total_duplicates_found === "number" ? total_duplicates_found : 0;
        if (is_duplicate) {
          return `${count} duplicate${count === 1 ? "" : "s"} found`;
        }
        return "No duplicates found";
      }
      // If the payload does not match the expected shape, fall through to generic formatting.
    }

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const entries = Object.entries(parsed)
        .slice(0, 4)
        .map(([key, value]) => `${key}=${formatToolValue(value)}`);
      const suffix = Object.keys(parsed).length > 4 ? ", ..." : "";
      return compactText(`${entries.join(", ")}${suffix}`, 160);
    }

    return compactText(formatToolValue(parsed), 160);
  } catch {
    return compactText(output, 160);
  }
}

function FollowUpQuestionCard({ question }: { question: FollowUpQuestion }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [otherTextInputs, setOtherTextInputs] = useState<Record<string, string>>({});
  const [selectedIndices, setSelectedIndices] = useState<Record<string, number>>({});
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus first input field
    if (firstInputRef.current) {
      firstInputRef.current.focus();
    }
  }, []);

  const handleSubmit = () => {
    // Build answer message from all fields
    const answerLines = question.fields.map((field) => {
      const answer = answers[field.key];
      if (field.type === "select" && answer === "other" && otherTextInputs[field.key]) {
        return `${field.label}: ${otherTextInputs[field.key]}`;
      }
      // For select fields, use the option label instead of value
      if (field.type === "select" && field.options) {
        const selectedOption = field.options.find(opt => opt.value === answer);
        return `${field.label}: ${selectedOption?.label || answer || ""}`;
      }
      return `${field.label}: ${answer || ""}`;
    });

    const message = answerLines.join("\n");
    window.dispatchEvent(
      new CustomEvent("vivian-fill-chat-input", {
        detail: { template: message, autoSend: true },
      })
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent, field: FollowUpQuestionField) => {
    // Enter key submits (unless it's a textarea-like situation)
    if (e.key === "Enter" && !e.shiftKey && question.fields.length === 1) {
      e.preventDefault();
      handleSubmit();
    }

    // Arrow key navigation for select fields
    if (field.type === "select" && field.options && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      e.preventDefault();
      const currentIndex = selectedIndices[field.key] ?? -1;
      const newIndex = e.key === "ArrowDown"
        ? Math.min(currentIndex + 1, field.options.length - 1)
        : Math.max(currentIndex - 1, 0);

      setSelectedIndices(prev => ({ ...prev, [field.key]: newIndex }));
      setAnswers(prev => ({ ...prev, [field.key]: field.options![newIndex].value }));
    }
  };

  const renderField = (field: FollowUpQuestionField, index: number) => {
    if (field.type === "select" && field.options) {
      const selectedOption = field.options.find(opt => opt.value === answers[field.key]);
      const selectedIndex = selectedIndices[field.key] ?? field.options.findIndex(opt => opt.value === answers[field.key]);

      return (
        <div key={field.key} className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            {field.label}
            {field.required && <span className="ml-1 text-destructive">*</span>}
          </label>
          <div className="flex flex-col gap-1.5">
            {field.options.map((option, optIndex) => {
              const isSelected = answers[field.key] === option.value;
              const isHighlighted = selectedIndex === optIndex;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setSelectedIndices(prev => ({ ...prev, [field.key]: optIndex }));
                    setAnswers(prev => ({ ...prev, [field.key]: option.value }));
                    if (!option.requires_text_input) {
                      setOtherTextInputs(prev => {
                        const next = { ...prev };
                        delete next[field.key];
                        return next;
                      });
                    }
                  }}
                  onKeyDown={(e) => handleKeyDown(e, field)}
                  className={`rounded border px-3 py-2 text-sm text-left transition-all ${
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground font-medium"
                      : isHighlighted
                      ? "border-primary/50 bg-muted"
                      : "border-border bg-background hover:bg-muted hover:border-border/80"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          {selectedOption?.requires_text_input && (
            <input
              type="text"
              value={otherTextInputs[field.key] || ""}
              onChange={(e) => setOtherTextInputs(prev => ({ ...prev, [field.key]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && question.fields.length === 1) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Please specify..."
              autoFocus
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          )}
        </div>
      );
    } else if (field.type === "text" || field.type === "number" || field.type === "date") {
      return (
        <div key={field.key} className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            {field.label}
            {field.required && <span className="ml-1 text-destructive">*</span>}
          </label>
          <input
            ref={index === 0 ? firstInputRef : null}
            type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
            value={answers[field.key] || ""}
            onChange={(e) => setAnswers(prev => ({ ...prev, [field.key]: e.target.value }))}
            onKeyDown={(e) => handleKeyDown(e, field)}
            placeholder={field.placeholder}
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      );
    }
    return null;
  };

  const canSubmit = question.fields.every(field => {
    const hasAnswer = answers[field.key];
    if (!field.required) return true;
    if (!hasAnswer) return false;
    // If "other" option selected, need text input too
    if (hasAnswer === "other" && !otherTextInputs[field.key]) return false;
    return true;
  });

  return (
    <div className="mt-3 rounded-lg border-2 border-primary/30 bg-background p-4 shadow-sm">
      <div className="mb-3 flex items-start gap-2">
        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
          ?
        </div>
        <p className="text-sm font-medium text-foreground leading-relaxed">
          {question.prompt || "Additional details needed"}
        </p>
      </div>

      <div className="space-y-4">
        {question.fields.map((field, index) => renderField(field, index))}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3">
        <p className="text-xs text-muted-foreground">
          {question.fields.length === 1 ? "Press Enter to submit" : "Fill all fields and submit"}
        </p>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-all ${
            canSubmit
              ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          }`}
        >
          Submit
        </button>
      </div>
    </div>
  );
}

function CollapsibleToolResult({ tool }: { tool: ToolCallInfo }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const summary = formatToolResultSummary(tool.tool_name, tool.output);
  
  return (
    <div className="rounded-md border border-border/70 bg-background/40 text-xs">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between gap-3 p-2 text-left hover:bg-muted/30 transition-colors"
        type="button"
      >
        <div className="flex min-w-0 items-center gap-2">
          {isExpanded ? (
            <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )}
          <span className="font-mono text-[11px] text-foreground">{tool.tool_name}</span>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            {tool.server_id}
          </span>
        </div>
        <div className="min-w-0 flex-1 text-right text-[11px] text-muted-foreground">
          <span className="block truncate">{summary}</span>
        </div>
      </button>
      
      {isExpanded && (
        <div className="space-y-2 border-t border-border/70 px-2 pb-2 pt-1.5">
          <div>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Arguments
            </p>
            <div className="rounded border border-border/60 bg-background px-2 py-1.5 text-[10px] font-mono text-foreground/90">
              <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all">
                {formatJsonBlock(tool.input)}
              </pre>
            </div>
          </div>
          <div>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Result
            </p>
            <div className="rounded border border-border/60 bg-background px-2 py-1.5 text-[10px] font-mono text-foreground/90">
              <pre className="max-h-52 overflow-auto whitespace-pre-wrap break-all">
                {formatJsonBlock(tool.output)}
              </pre>
            </div>
          </div>
        </div>
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
            ? "border border-[var(--error-200)] bg-[var(--error-50)] text-[var(--error-800)] dark:border-[var(--error-700)] dark:bg-[var(--error-900)] dark:text-[var(--error-100)]"
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
  const { messages, isLoading, pendingFollowUpQuestions } = useChatStore();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, pendingFollowUpQuestions]);

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

        {pendingFollowUpQuestions.length > 0 && (
          <div className="flex justify-start">
            <div className="max-w-[80%]">
              <div className="space-y-2">
                {pendingFollowUpQuestions.map((question) => (
                  <FollowUpQuestionCard key={question.id} question={question} />
                ))}
              </div>
            </div>
          </div>
        )}

        {isLoading && <LoadingIndicator />}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
