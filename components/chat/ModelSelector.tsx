"use client";

import { useState, useEffect, useCallback } from "react";
import { useModelStore } from "@/lib/stores/model";
import { Check, ChevronDown, AlertCircle, Loader2, Brain, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-zinc-100 hover:bg-zinc-200 rounded-md transition-colors"
      >
        <Brain className="w-4 h-4 text-zinc-600" />
        <span className="max-w-[120px] truncate">{currentModelName}</span>
        <ChevronDown className="w-3 h-3 text-zinc-500" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-lg shadow-lg border border-zinc-200 z-50 overflow-hidden">
            <div className="px-3 py-2 border-b border-zinc-100">
              <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Select Model
              </h3>
            </div>

            {showSuccess && (
              <div className="px-3 py-2 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2 text-xs text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                Model updated successfully
              </div>
            )}

            {error && (
              <div className="px-3 py-2 bg-red-50 border-b border-red-100 flex items-center gap-2 text-xs text-red-600">
                <AlertCircle className="w-3 h-3" />
                {error}
              </div>
            )}

            {ollamaStatus === "offline" && (
              <div className="px-3 py-2 bg-amber-50 border-b border-amber-100 flex items-center gap-2 text-xs text-amber-700">
                <AlertCircle className="w-3 h-3" />
                Ollama is offline - Local models unavailable
              </div>
            )}

            {openRouterCreditsError && (
              <div className="px-3 py-2 bg-amber-50 border-b border-amber-100 flex items-center justify-between gap-2 text-xs text-amber-700">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span className="truncate">{openRouterCreditsError}</span>
                </div>
                <button
                  type="button"
                  className="shrink-0 px-2 py-1 rounded border border-amber-300 hover:bg-amber-100 text-amber-800 font-medium"
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
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
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
                    <div className="px-3 py-1.5 bg-zinc-50 text-xs font-medium text-zinc-500 flex items-center gap-2">
                      <span>{provider}</span>
                      {providers[provider]?.status !== "available" &&
                        providers[provider]?.status !== undefined && (
                          <span className="text-amber-600 text-[10px]">
                            ({providers[provider]?.status})
                          </span>
                        )}
                    </div>
                    {providerModels.map((model) => {
                      const isSelected = currentModel === model.id;
                      const isSelecting = selectingId === model.id;
                      return (
                        <button
                          key={model.id}
                          onClick={() => handleSelect(model.id)}
                          disabled={!model.selectable || selectingId !== null}
                          className={cn(
                            "w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-zinc-50 transition-colors",
                            !model.selectable && "opacity-50 cursor-not-allowed",
                            selectingId !== null && selectingId !== model.id && "opacity-60",
                            isSelected && "bg-zinc-100"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span>{model.name}</span>
                            {model.free && (
                              <span className="text-[10px] px-1 py-0.5 bg-green-100 text-green-700 rounded">
                                FREE
                              </span>
                            )}
                            {!model.selectable && (
                              <span className="text-[10px] px-1 py-0.5 bg-amber-100 text-amber-700 rounded">
                                Offline
                              </span>
                            )}
                          </div>
                          {isSelecting ? (
                            <Loader2 className="w-4 h-4 text-zinc-500 animate-spin shrink-0" />
                          ) : isSelected ? (
                            <Check className="w-4 h-4 text-zinc-900 shrink-0" />
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
