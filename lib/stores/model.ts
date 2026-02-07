import { create } from "zustand";
import type { LLMModel, ProviderStatus } from "@/types";
import { getModels, selectModel } from "@/lib/api/client";

interface ModelState {
  models: LLMModel[];
  providers: Record<string, ProviderStatus>;
  currentModel: string;
  defaultModel: string;
  isLoading: boolean;
  error?: string;
  openRouterCreditsError: string | null;
  rateLimitError: string | null;

  fetchModels: () => Promise<void>;
  selectModel: (modelId: string) => Promise<boolean>;
  getCurrentModelName: () => string;
  isModelSelectable: (modelId: string) => boolean;
  setCreditsError: (message: string | null) => void;
  setRateLimitError: (message: string | null) => void;
}

export const useModelStore = create<ModelState>((set, get) => ({
  models: [],
  providers: {},
  currentModel: "gpt-3.5-turbo",
  defaultModel: "gpt-3.5-turbo",
  isLoading: false,
  error: undefined,
  openRouterCreditsError: null,
  rateLimitError: null,

  setCreditsError: (message: string | null) => {
    set({ openRouterCreditsError: message });
  },

  setRateLimitError: (message: string | null) => {
    set({ rateLimitError: message });
  },

  fetchModels: async () => {
    set({ isLoading: true, error: undefined });
    try {
      const data = await getModels();
      set({
        models: data.models,
        providers: data.providers,
        currentModel: data.current_model,
        defaultModel: data.default_model,
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to fetch models",
      });
    }
  },

  selectModel: async (modelId: string) => {
    const { models } = get();
    const model = models.find((m) => m.id === modelId);
    if (model && !model.selectable) {
      set({ error: `${model.provider} is not available` });
      return false;
    }

    try {
      const data = await selectModel(modelId);
      set({ currentModel: data.selected_model });
      return true;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to select model",
      });
      return false;
    }
  },

  getCurrentModelName: () => {
    const { models, currentModel } = get();
    const model = models.find((m) => m.id === currentModel);
    return model?.name || currentModel;
  },

  isModelSelectable: (modelId: string) => {
    const { models } = get();
    const model = models.find((m) => m.id === modelId);
    return model?.selectable ?? true;
  },
}));
