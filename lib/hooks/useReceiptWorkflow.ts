"use client";

import { useState, useCallback } from "react";
import { checkReceiptDuplicate, confirmReceipt } from "@/lib/api/client";
import type { DuplicateInfo, ExpenseSchema, ReimbursementStatus } from "@/types";

export type TaskStatus = "pending" | "loading" | "success" | "error";

interface UseDuplicateCheckReturn {
  isChecking: boolean;
  isDuplicate: boolean;
  duplicateInfo: DuplicateInfo[];
  error: string | null;
  check: (expense: ExpenseSchema) => Promise<boolean>;
  setDuplicateState: (isDuplicate: boolean, duplicateInfo: DuplicateInfo[]) => void;
  reset: () => void;
}

export function useDuplicateCheck(): UseDuplicateCheckReturn {
  const [isChecking, setIsChecking] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateInfo[]>([]);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async (expense: ExpenseSchema): Promise<boolean> => {
    // Skip duplicate check if not HSA eligible
    if (!expense.hsa_eligible) {
      setIsDuplicate(false);
      setDuplicateInfo([]);
      setError(null);
      return false;
    }

    setIsChecking(true);
    setError(null);

    try {
      const result = await checkReceiptDuplicate(expense);
      const hasDuplicates = Boolean(result.is_duplicate);
      setIsDuplicate(hasDuplicates);
      setDuplicateInfo(result.duplicate_info || []);
      return hasDuplicates;
    } catch {
      setError("Duplicate check unavailable right now. Final duplicate checks still run on save.");
      setIsDuplicate(false);
      setDuplicateInfo([]);
      return false;
    } finally {
      setIsChecking(false);
    }
  }, []);

  const setDuplicateState = useCallback((isDup: boolean, dupInfo: DuplicateInfo[]) => {
    setIsDuplicate(isDup);
    setDuplicateInfo(dupInfo);
  }, []);

  const reset = useCallback(() => {
    setIsChecking(false);
    setIsDuplicate(false);
    setDuplicateInfo([]);
    setError(null);
  }, []);

  return {
    isChecking,
    isDuplicate,
    duplicateInfo,
    error,
    check,
    setDuplicateState,
    reset,
  };
}

interface UseReceiptConfirmationReturn {
  isSubmitting: boolean;
  error: string | null;
  driveStatus: TaskStatus;
  sheetStatus: TaskStatus;
  submit: (params: {
    tempFilePath: string;
    expense: ExpenseSchema;
    status: ReimbursementStatus;
    forceImport: boolean;
  }) => Promise<{ success: boolean; isDuplicate?: boolean; duplicateInfo?: DuplicateInfo[] }>;
  reset: () => void;
}

export function useReceiptConfirmation(): UseReceiptConfirmationReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [driveStatus, setDriveStatus] = useState<TaskStatus>("pending");
  const [sheetStatus, setSheetStatus] = useState<TaskStatus>("pending");

  const submit = useCallback(
    async ({
      tempFilePath,
      expense,
      status,
      forceImport,
    }: {
      tempFilePath: string;
      expense: ExpenseSchema;
      status: ReimbursementStatus;
      forceImport: boolean;
    }): Promise<{ success: boolean; isDuplicate?: boolean; duplicateInfo?: DuplicateInfo[] }> => {
      setIsSubmitting(true);
      setError(null);
      setDriveStatus("loading");
      setSheetStatus("loading");

      try {
        const result = await confirmReceipt({
          temp_file_path: tempFilePath,
          expense_data: expense,
          status,
          force: forceImport,
        });

        if (result.is_duplicate && !forceImport) {
          setError("Duplicate receipt detected. Review existing entries.");
          setDriveStatus("pending");
          setSheetStatus("pending");
          return {
            success: false,
            isDuplicate: true,
            duplicateInfo: result.duplicate_info || [],
          };
        }

        if (!result.success) {
          setError(result.message || "Failed to save receipt.");
          setDriveStatus("error");
          setSheetStatus("error");
          return { success: false };
        }

        setDriveStatus("success");
        setSheetStatus("success");
        return { success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to save receipt.";
        setError(message);

        if (message.includes("Drive upload failed")) {
          setDriveStatus("error");
          setSheetStatus("pending");
        } else if (message.includes("Ledger update failed")) {
          setDriveStatus("success");
          setSheetStatus("error");
        } else {
          setDriveStatus("error");
          setSheetStatus("error");
        }

        return { success: false };
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setIsSubmitting(false);
    setError(null);
    setDriveStatus("pending");
    setSheetStatus("pending");
  }, []);

  return {
    isSubmitting,
    error,
    driveStatus,
    sheetStatus,
    submit,
    reset,
  };
}
