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
      return set({
        category,
        editedCharitableData: parsedData?.charitable_data ?? {
          organization_name: "",
          donation_date: "",
          amount: 0,
          tax_deductible: true,
          description: "",
        },
        editedExpense: undefined,
      });
    }

    return set({
      category,
      editedExpense: parsedData?.expense ?? {
        provider: "",
        service_date: "",
        paid_date: "",
        amount: 0,
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
