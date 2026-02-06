"use client";

import { useState, useEffect } from "react";
import { useModelStore } from "@/lib/stores/model";
import { Check, ChevronDown, AlertCircle, Loader2, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

export function ModelSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const {
    models,
    providers,
    currentModel,
    isLoading,
    error,
    fetchModels,
    selectModel,
    getCurrentModelName,
  } = useModelStore();

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const handleSelect = async (modelId: string) => {
    const success = await selectModel(modelId);
    if (success) {
      setIsOpen(false);
    }
  };

  const currentModelName = getCurrentModelName();
  const ollamaStatus = providers.Ollama?.status;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
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
                    {providerModels.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => handleSelect(model.id)}
                        disabled={!model.selectable}
                        className={cn(
                          "w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-zinc-50 transition-colors",
                          !model.selectable && "opacity-50 cursor-not-allowed",
                          currentModel === model.id && "bg-zinc-100"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span>{model.name}</span>
                          {!model.selectable && (
                            <span className="text-[10px] px-1 py-0.5 bg-amber-100 text-amber-700 rounded">
                              Offline
                            </span>
                          )}
                        </div>
                        {currentModel === model.id && (
                          <Check className="w-4 h-4 text-zinc-900" />
                        )}
                      </button>
                    ))}
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
