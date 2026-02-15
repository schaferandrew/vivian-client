"use client";

import { useState, useEffect, useCallback } from "react";
import { useModelStore } from "@/lib/stores/model";
import { useChatStore } from "@/lib/stores/chat";
import { Check, ChevronDown, AlertCircle, Loader2, Brain, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { RefreshButton } from "@/components/ui/refresh-button";

export function ModelSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const {
    models,
    providers,
    currentModel,
    isLoading,
    error,
    openRouterCreditsError,
    fetchModels,
    selectModel,
    setCreditsError,
    getCurrentModelName,
  } = useModelStore();
  const webSearchEnabled = useChatStore((state) => state.webSearchEnabled);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const handleSelect = useCallback(
    async (modelId: string) => {
      if (currentModel === modelId) {
        setIsOpen(false);
        return;
      }
      setSelectingId(modelId);
      setShowSuccess(false);
      const success = await selectModel(modelId);
      setSelectingId(null);
      if (success) {
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          setIsOpen(false);
        }, 1200);
      }
    },
    [currentModel, selectModel]
  );

  const currentModelName = getCurrentModelName();
  const ollamaStatus = providers.Ollama?.status;

  return (
    <div className="relative">
      <button
        onClick={() => {
          if (!isOpen) setShowSuccess(false);
          setIsOpen(!isOpen);
        }}
        className="flex items-center gap-2 rounded-md bg-secondary px-3 py-1.5 text-sm transition-colors hover:bg-[var(--neutral-200)] dark:hover:bg-[var(--neutral-800)]"
      >
        <Brain className="w-4 h-4 text-muted-foreground" />
        <span className="max-w-[120px] truncate">{currentModelName}</span>
        <ChevronDown className="w-3 h-3 text-muted-foreground" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-72 bg-popover rounded-lg shadow-lg border border-border z-50 overflow-hidden">
            <div className="px-3 py-2 border-b border-border flex items-center justify-between">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Select Model
              </h3>
              <RefreshButton onRefresh={fetchModels} title="Refresh models" />
            </div>

            {showSuccess && (
              <div className="flex items-center gap-2 border-b border-[var(--success-100)] bg-[var(--success-50)] px-3 py-2 text-xs text-[var(--success-700)] dark:border-[var(--success-800)] dark:bg-[var(--success-950)] dark:text-[var(--success-200)]">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                Model updated successfully
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 border-b border-[var(--error-100)] bg-[var(--error-50)] px-3 py-2 text-xs text-[var(--error-600)] dark:border-[var(--error-800)] dark:bg-[var(--error-900)]/25 dark:text-[var(--error-300)]">
                <AlertCircle className="w-3 h-3" />
                {error}
              </div>
            )}

            {ollamaStatus === "offline" && (
              <div className="flex items-center gap-2 border-b border-[var(--brand-100)] bg-[var(--brand-50)] px-3 py-2 text-xs text-[var(--brand-800)] dark:border-[var(--brand-800)] dark:bg-[var(--brand-950)] dark:text-[var(--brand-200)]">
                <AlertCircle className="w-3 h-3 dark:text-[var(--brand-200)]" />
                Ollama is offline - Local models unavailable
              </div>
            )}

            {openRouterCreditsError && (
              <div className="flex items-center justify-between gap-2 border-b border-[var(--brand-100)] bg-[var(--brand-50)] px-3 py-2 text-xs text-[var(--brand-800)] dark:border-[var(--brand-800)] dark:bg-[var(--brand-900)]/25 dark:text-[var(--brand-200)]">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span className="truncate">{openRouterCreditsError}</span>
                </div>
                <button
                  type="button"
                  className="shrink-0 rounded border border-[var(--brand-300)] px-2 py-1 font-medium text-[var(--brand-900)] hover:bg-[var(--brand-100)] dark:border-[var(--brand-700)] dark:text-[var(--brand-100)] dark:hover:bg-[var(--brand-800)]"
                  onClick={() => {
                    setCreditsError(null);
                    fetchModels();
                  }}
                >
                  Try again
                </button>
              </div>
            )}

            <div className="max-h-64 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                Object.entries(
                  models.reduce((acc, model) => {
                    if (!acc[model.provider]) {
                      acc[model.provider] = [];
                    }
                    acc[model.provider].push(model);
                    return acc;
                  }, {} as Record<string, typeof models>)
                ).map(([provider, providerModels]) => (
                  <div key={provider}>
                    <div className="px-3 py-1.5 bg-secondary text-xs font-medium text-muted-foreground flex items-center gap-2">
                      <span>{provider}</span>
                      {providers[provider]?.status !== "available" &&
                        providers[provider]?.status !== undefined && (
                          <span className="text-[10px] text-[var(--brand-700)] dark:text-[var(--brand-300)]">
                            ({providers[provider]?.status})
                          </span>
                        )}
                    </div>
                    {providerModels.map((model) => {
                      const isOllamaModel = model.provider === "Ollama";
                      const isWebSearchBlocked = webSearchEnabled && isOllamaModel;
                      const isSelected = currentModel === model.id;
                      const isSelecting = selectingId === model.id;
                      const isDisabled = !model.selectable || selectingId !== null || isWebSearchBlocked;
                      const tooltip = isWebSearchBlocked
                        ? "Web search is enabled. Ollama models don't support web search."
                        : undefined;
                      return (
                        <button
                          key={model.id}
                          onClick={() => handleSelect(model.id)}
                          disabled={isDisabled}
                          title={tooltip}
                          className={cn(
                            "w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-secondary transition-colors",
                            isDisabled && "opacity-50 cursor-not-allowed",
                            selectingId !== null && selectingId !== model.id && "opacity-60",
                            isSelected && "bg-[var(--primary-100)] dark:bg-[var(--primary-900)]"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span>{model.name}</span>
                            {model.free && (
                              <span className="rounded bg-[var(--success-100)] px-1 py-0.5 text-[10px] text-[var(--success-700)] dark:bg-[var(--success-900)] dark:text-[var(--success-100)]">
                                FREE
                              </span>
                            )}
                            {!model.selectable && (
                              <span className="rounded bg-[var(--brand-100)] px-1 py-0.5 text-[10px] text-[var(--brand-800)] dark:bg-[var(--brand-900)] dark:text-[var(--brand-100)]">
                                Offline
                              </span>
                            )}
                            {isWebSearchBlocked && (
                              <span className="rounded bg-[var(--warning-100)] px-1 py-0.5 text-[10px] text-[var(--warning-800)] dark:bg-[var(--warning-900)] dark:text-[var(--warning-100)]">
                                Web search on
                              </span>
                            )}
                          </div>
                          {isSelecting ? (
                            <Loader2 className="w-4 h-4 text-muted-foreground animate-spin shrink-0" />
                          ) : isSelected ? (
                            <Check className="w-4 h-4 shrink-0 text-[var(--primary-800)] dark:text-[var(--primary-200)]" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
