import { create } from "zustand";
import type { ReceiptUploadState, ParsedReceipt } from "@/types";

interface ReceiptStore extends ReceiptUploadState {
  // Actions
  setStep: (step: ReceiptUploadState["step"]) => void;
  setTempFilePath: (path: string) => void;
  setParsedData: (data: ParsedReceipt) => void;
  setResultMessage: (message: string | undefined) => void;
  setUploading: (uploading: boolean) => void;
  setParsing: (parsing: boolean) => void;
  setError: (error: string | undefined) => void;
  reset: () => void;
}

const initialState: ReceiptUploadState = {
  step: "upload",
  tempFilePath: undefined,
  parsedData: undefined,
  resultMessage: undefined,
  isUploading: false,
  isParsing: false,
  error: undefined,
};

export const useReceiptStore = create<ReceiptStore>((set) => ({
  ...initialState,

  setStep: (step) => set({ step }),
  setTempFilePath: (path) => set({ tempFilePath: path }),
  setParsedData: (data) => set({ parsedData: data }),
  setResultMessage: (message) => set({ resultMessage: message }),
  setUploading: (uploading) => set({ isUploading: uploading }),
  setParsing: (parsing) => set({ isParsing: parsing }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
