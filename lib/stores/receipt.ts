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

export const useReceiptStore = create<ReceiptStore>((set, get) => ({
  ...initialState,

  setCategory: (category) => {
    const parsedData = get().parsedData;
    if (category === "charitable") {
      const existingExpense = get().editedExpense ?? parsedData?.expense;
      return set({
        category,
        editedCharitableData: parsedData?.charitable_data ?? {
          organization_name: existingExpense?.provider || "",
          donation_date: existingExpense?.service_date || "",
          amount: existingExpense?.amount ?? 0,
          tax_deductible: true,
          description: "",
        },
        editedExpense: undefined,
      });
    }

    const existingCharitable = get().editedCharitableData ?? parsedData?.charitable_data;
    return set({
      category,
      editedExpense: parsedData?.expense ?? {
        provider: existingCharitable?.organization_name || "",
        service_date: existingCharitable?.donation_date || "",
        paid_date: "",
        amount: existingCharitable?.amount ?? 0,
        hsa_eligible: true,
      },
      editedCharitableData: undefined,
    });
  },
  setEditedExpense: (expense) => set({ editedExpense: expense }),
  setEditedCharitableData: (data) => set({ editedCharitableData: data }),
  setStep: (step) => set({ step }),
  setTempFilePath: (path) =>
    set({
      tempFilePath: path,
      parsedData: undefined,
      parseIsDuplicate: undefined,
      parseDuplicateInfo: undefined,
      parseDuplicateCheckError: undefined,
    }),
  setParsedData: (data) => {
    // Initialize category from suggested_category, but don't override if already set
    const currentCategory = get().category;
    const suggestedCategory = data.suggested_category;
    const newCategory = suggestedCategory || currentCategory;
    
    if (newCategory === "charitable") {
      return set({
        parsedData: data,
        editedCharitableData: data.charitable_data,
        editedExpense: undefined,
        category: newCategory,
      });
    }
    return set({
      parsedData: data,
      editedExpense: data.expense,
      editedCharitableData: undefined,
      category: newCategory,
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
