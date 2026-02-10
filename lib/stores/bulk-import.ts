import { create } from "zustand";
import type {
  BulkImportFileResult,
  BulkImportSummary,
  ReimbursementStatus,
} from "@/types";

type BulkImportStep = "upload" | "scanning" | "review" | "confirm" | "results";

interface BulkImportState {
  // Current step
  step: BulkImportStep;
  
  // Processing state
  isScanning: boolean;
  scanningProgress: {
    current: number;
    total: number;
    currentFile?: string;
  } | null;
  
  // Results from scan
  results: {
    new: BulkImportFileResult[];
    duplicates: BulkImportFileResult[];
    flagged: BulkImportFileResult[];
    failed: BulkImportFileResult[];
  };
  summary: BulkImportSummary | null;
  
  // Selection state
  selectedIds: Set<string>; // temp_file_path values
  
  // Import options
  options: {
    statusOverride: ReimbursementStatus | null;
    itemStatusOverrides: Record<string, ReimbursementStatus | "default">;
    skipErrors: boolean;
    checkDuplicates: boolean;
    duplicateAction: "skip" | "flag" | "ask";
    forceImportDuplicates: boolean;
  };
  
  // Import results
  importResults: {
    importedCount: number;
    failedCount: number;
    totalAmount: number;
    message: string;
    failures: Array<{ filename: string; error: string }>;
  } | null;
  
  // Error state
  error: string | null;
}

interface BulkImportActions {
  // Step management
  setStep: (step: BulkImportStep) => void;
  
  // Scanning state
  setIsScanning: (scanning: boolean) => void;
  setScanningProgress: (progress: BulkImportState["scanningProgress"]) => void;
  
  // Results management
  setResults: (results: BulkImportState["results"]) => void;
  setSummary: (summary: BulkImportSummary) => void;
  
  // Selection
  toggleSelection: (tempFilePath: string) => void;
  selectAll: (category: "new" | "non-duplicates") => void;
  deselectAll: () => void;
  
  // Options
  setOptions: (options: Partial<BulkImportState["options"]>) => void;
  
  // Import results
  setImportResults: (results: BulkImportState["importResults"]) => void;
  
  // Error
  setError: (error: string | null) => void;
  
  // Reset
  reset: () => void;
}

const initialState: BulkImportState = {
  step: "upload",
  isScanning: false,
  scanningProgress: null,
  results: {
    new: [],
    duplicates: [],
    flagged: [],
    failed: [],
  },
  summary: null,
  selectedIds: new Set(),
  options: {
    statusOverride: "unreimbursed",
    itemStatusOverrides: {},
    skipErrors: true,
    checkDuplicates: true,
    duplicateAction: "flag",
    forceImportDuplicates: false,
  },
  importResults: null,
  error: null,
};

export const useBulkImportStore = create<BulkImportState & BulkImportActions>(
  (set, get) => ({
    ...initialState,
    
    setStep: (step) => set({ step }),
    
    setIsScanning: (isScanning) => set({ isScanning }),
    setScanningProgress: (scanningProgress) => set({ scanningProgress }),
    
    setResults: (results) =>
      set((state) => ({
        results,
        selectedIds: new Set(),
        options: {
          ...state.options,
          itemStatusOverrides: {},
        },
      })),
    setSummary: (summary) => set({ summary }),
    
    toggleSelection: (tempFilePath) => {
      const { selectedIds } = get();
      const newSelected = new Set(selectedIds);
      if (newSelected.has(tempFilePath)) {
        newSelected.delete(tempFilePath);
      } else {
        newSelected.add(tempFilePath);
      }
      set({ selectedIds: newSelected });
    },
    
    selectAll: (category) => {
      const { results } = get();
      const newSelected = new Set<string>();
      
      if (category === "new") {
        results.new.forEach((r) => {
          if (r.temp_file_path) newSelected.add(r.temp_file_path);
        });
      } else if (category === "non-duplicates") {
        results.new.forEach((r) => {
          if (r.temp_file_path) newSelected.add(r.temp_file_path);
        });
        results.flagged.forEach((r) => {
          if (r.temp_file_path) newSelected.add(r.temp_file_path);
        });
      }
      
      set({ selectedIds: newSelected });
    },
    
    deselectAll: () => set({ selectedIds: new Set() }),
    
    setOptions: (options) =>
      set((state) => ({ options: { ...state.options, ...options } })),
    
    setImportResults: (importResults) => set({ importResults }),
    
    setError: (error) => set({ error }),
    
    reset: () => set(initialState),
  })
);

// Computed selectors
export const getSelectedCount = (state: BulkImportState) => state.selectedIds.size;

export const getSelectedTempPaths = (state: BulkImportState): string[] =>
  Array.from(state.selectedIds);

export const getReadyToImportCount = (state: BulkImportState): number => {
  const readyNew = state.results.new.filter((r) => r.status === "new").length;
  const readyFlagged = state.results.flagged.filter((r) => r.status === "flagged").length;
  return readyNew + readyFlagged;
};

export const getTotalAmount = (state: BulkImportState): number => {
  let total = 0;
  const addAmount = (r: BulkImportFileResult) => {
    if (r.expense && r.status !== "failed" && r.status !== "skipped") {
      total += r.expense.amount;
    }
  };
  
  state.results.new.forEach(addAmount);
  state.results.duplicates.forEach(addAmount);
  state.results.flagged.forEach(addAmount);
  
  return total;
};
