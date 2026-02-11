import { create } from "zustand";
import type { ReceiptUploadState, ParsedReceipt, DuplicateInfo, ExpenseCategory, CharitableDonationSchema, ExpenseSchema } from "@/types";

interface ReceiptStore extends ReceiptUploadState {
  category: ExpenseCategory;
  editedExpense: ExpenseSchema | undefined;
  editedCharitableData: CharitableDonationSchema | undefined;
  setCategory: (category: ExpenseCategory) => void;
  setEditedExpense: (expense: ExpenseSchema | undefined) => void;
  setEditedCharitableData: (data: CharitableDonationSchema | undefined) => void;
  setStep: (step: ReceiptUploadState["step"]) => void;
  setTempFilePath: (path: string) => void;
  setParsedData: (data: ParsedReceipt) => void;
  setParseDuplicateInfo: (
    isDuplicate: boolean,
    duplicateInfo: DuplicateInfo[],
    checkError?: string
  ) => void;
  setUploading: (uploading: boolean) => void;
  setParsing: (parsing: boolean) => void;
  setError: (error: string | undefined) => void;
  reset: () => void;
}

const initialState: ReceiptUploadState & { category: ExpenseCategory; editedExpense: ExpenseSchema | undefined; editedCharitableData: CharitableDonationSchema | undefined } = {
  category: "hsa",
  step: "upload",
  tempFilePath: undefined,
  parsedData: undefined,
  parseIsDuplicate: undefined,
  parseDuplicateInfo: undefined,
  parseDuplicateCheckError: undefined,
  isUploading: false,
  isParsing: false,
  error: undefined,
  editedExpense: undefined,
  editedCharitableData: undefined,
};

export const useReceiptStore = create<ReceiptStore>((set) => ({
  ...initialState,

  setCategory: (category) => set({ category, editedExpense: undefined, editedCharitableData: undefined }),
  setEditedExpense: (expense) => set({ editedExpense: expense }),
  setEditedCharitableData: (data) => set({ editedCharitableData: data }),
  setStep: (step) =>
    set({
      step,
      parsedData: undefined,
      parseIsDuplicate: undefined,
      parseDuplicateInfo: undefined,
      parseDuplicateCheckError: undefined,
    }),
  setTempFilePath: (path) =>
    set({
      tempFilePath: path,
      parsedData: undefined,
      parseIsDuplicate: undefined,
      parseDuplicateInfo: undefined,
      parseDuplicateCheckError: undefined,
    }),
  setParsedData: (data) => {
    if (data.category === "charitable") {
      return set({
        parsedData: data,
        editedCharitableData: data.charitable_data,
        editedExpense: undefined,
        category: "charitable",
      });
    }
    return set({
      parsedData: data,
      editedExpense: data.expense,
      editedCharitableData: undefined,
      category: "hsa",
    });
  },
  setParseDuplicateInfo: (isDuplicate, duplicateInfo, checkError) =>
    set({
      parseIsDuplicate: isDuplicate,
      parseDuplicateInfo: duplicateInfo,
      parseDuplicateCheckError: checkError,
    }),
  setUploading: (uploading) => set({ isUploading: uploading }),
  setParsing: (parsing) => set({ isParsing: parsing }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
